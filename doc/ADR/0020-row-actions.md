# ADR-0020: Row actions — a renderer the host registers, shown on hover, that emits an event

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

Both tables have a setting `rowActions`: a list of `{ name, params? }`,
each name a component the host registers, as it registers toolbar items.
They render in one column of their own at the START of every row, hidden
by CSS until the row is hovered or holds the keyboard's focus. An action
gets the row and `act(detail?)`, which emits the one event `row-action`.
The standard action is `favorite`, a star. Built; one point is open.

## 2. Problem

The owner: "I need a custom rendered on hover to mark row favorite. So on
hover the star should appear for row and invoke custom event."

Three things are asked for at once: something a HOST renders, that appears
when the pointer is over a ROW, and that tells the page something
happened.

What the tables already had:

- **A custom cell cannot act.** `TableCellProps` is `value`, `text`, `row`,
  `column`, `params` — no store, no emit: it shows the row's data.
- **A toolbar item can act, through functions the table hands it**
  (`refresh()`, `resetFilters()`). It never gets `emit`: the table decides
  which of its declared events an item may fire.
- **Events are declared in the contract.** `on` is strict: a reaction to an
  undeclared event is a configuration error at boot, and the builder's
  form lists a widget's events from its contract.
- **Reactions have two verbs and no conditions** — `set` and `call`.
- **A control inside a row owns its click**: `clicked()` in
  `use-table-rows.ts` emits no `row-selected` for a `button`, a link or an
  input.
- **Nothing in a table reacts to hover in React state**, and it must stay
  so: the infinite table was measured rendering too often while scrolling
  (ADR-0007).

## 3. Details

### The contract

In `packages/widget-contracts/src/table.ts`, shared by both table kinds:

```ts
export const rowActionSchema = z
  .object({ name: z.string().regex(KEBAB_NAME), params: z.record(z.string(), z.unknown()).optional() })
  .strict();

/** The row actions every implementation has. */
export const ROW_ACTIONS = ["favorite"] as const;

export const tableRowActionEvents = {
  "row-action": {
    description:
      "Fired when a row action is used; carries the action's name, the row's key, the row, and what the action says about it",
    payload: z.object({
      name: z.string(),
      key: z.string(),
      row: z.record(z.string(), z.unknown()),
      detail: z.record(z.string(), z.unknown()),
    }),
    primary: "key",
  },
} satisfies WidgetEvents;

// tableSettings
rowActions: z.array(rowActionSchema).default([]);
```

`rowActions` is empty by default: no table changes until a page lists an
action. An optional setting with a default needs no migration step
(ADR-0017). The table stores nothing: whether a row is a favourite is the
row's own data, changed by the action the reaction calls.

### What the host registers

```ts
export interface TableRowActionProps {
  /** The row, and its key. */
  row: TableRow;
  rowKey: string;
  /** The `params` of the action, as the page declared them. */
  params: Record<string, unknown>;
  /** Tell the page: emits the table's `row-action` with this action's name, the row and `detail`. */
  act: (detail?: Record<string, unknown>) => void;
}
export type TableRowAction = ComponentType<TableRowActionProps>;

createAntdTable({ cells, toolbar, rowActions }); // and createAntdInfiniteTable
createAntdWidgets({ tableCells, tableToolbar, tableRowActions });
```

- An action never receives `emit` or the store. It can fire `row-action`
  and nothing else, with its own name — it cannot impersonate another.
- A host's action under a standard name replaces the standard one, as with
  the toolbar.
- An unknown name is left out with one console warning.

### Where it renders, and when it shows

- **One column at the start of the row**, added by the shared hook
  `use-row-actions.ts` (composed by `use-table.ts` and
  `use-infinite-table.ts`): the first column, pinned left (antd's
  `fixed: "left"`), so it stays in view when the table scrolls sideways.
  Its cell is `td[data-cell="actions"]`; its header has no text and is
  named "Row actions" for screen readers. The owner chose the row's start.
- **Not a data column.** It has no `property`: it is not in the column
  menu, not a selectable cell, not in Copy, not in the CSV export, and has
  no cell tip. It does count in the table's least width: 28 px an action
  plus the cell's padding.
- **Hover is CSS, never state.** Each action in `.ww-table__row-actions`
  has opacity 0 until its row is hovered (`tr:hover`) or holds the
  KEYBOARD's focus (`:focus-visible`). Opacity, not `display`: the row's
  height never changes and the button stays in the tab order, so Tab from
  the row reaches the star and makes it appear. `:focus-within` is not
  used: a star clicked with the mouse would keep the focus and stay in
  view after the pointer left.
- **An action may stay visible** by putting `data-pinned="true"` on its
  own root element: a filled star must show without hover.
- **No hover on a touch screen**: under `@media (hover: none)` the actions
  are always visible.
- **Its click is its own.** A real `button` never selects the row.
- Each action is `data-testid="table-row-action"` with `data-name`. A test
  reads the computed opacity: Playwright calls an element with opacity 0
  visible.

### The standard action `favorite`

`{ "name": "favorite", "params": { "property": "favorite" } }` — the
property defaults to `favorite`. It ships in the package (`FavoriteAction`,
`STANDARD_ROW_ACTIONS`): a star button named "Favorite" with
`aria-pressed`, outlined until the row's property is true, then filled and
pinned. It calls `act({ active: <the state asked for> })`.

A host's own star, registered under `favorite`, replaces it:

```tsx
function Star({ row, act }: TableRowActionProps) {
  const on = row.favorite === true;
  return (
    <button type="button" aria-pressed={on} aria-label="Favorite" data-pinned={on} onClick={() => act({ active: !on })}>
      {on ? <StarFilled /> : <StarOutlined />}
    </button>
  );
}
```

### The page

```json
"rowActions": [{ "name": "favorite" }],
"on": {
  "row-action": [{ "call": "archive/set-favorite" }]
}
```

- The action called reads `payload.key` and `payload.detail.active`, calls
  the server, and patches that one row where the table reads its rows
  (`<into>.data`) — no list request.
- A failure of the server call is the action's rejection, reported like
  any action's. It does not write `<into>.error`.
- **Several actions on one table.** Reactions have no conditions, so every
  row action of a table reaches the same reaction list; the action called
  tells them apart by `payload.name`. The demo's action reads the payload
  with a schema that names `favorite` and leaves anything else alone.
- **Windowed lists.** The table-view loader joins a batch to the rows held
  NOW, not to the copy it read before the request
  (`packages/table-view/src/loader.ts`): a row marked while the next batch
  was on its way keeps its mark.
- The builder's form shows `rowActions` as JSON, like `toolbar`, and
  `row-action` among the table's events.

### Security (ADR-0019)

`row` in the payload is what the browser holds, not what the server knows.
An action that changes anything on the server sends the KEY and lets the
server decide; it never trusts a field of the row. This is the rule for
`row-selected` too; `row-action` is the first event built to cause a
write.

### The demo and how it is tested

The Infinite List table has the star. `archive/set-favorite` sends the
run's key and the state asked for to the fake server and then patches the
row in `infinite-list.data`. The server's rows carry `favorite`, which no
column shows, so a mark survives its rows being dropped and fetched again.

Proven by the stories `RowActions` and `CustomRowActions` (table),
`RowActions` (infinite table) and by `row-actions.feature`.

### For the owner to decide

1. **Several actions on one table** — keep routing by `payload.name` in
   the host's action, or add a filter to reactions so the page routes
   (`{ call, only: { name: "favorite" } }` — an engine change that
   ADR-0002's "exactly two verbs" has so far refused). It matters the day
   a page has two actions that call different things.

## 4. Options weighed

Where does the star live, and how does its click reach the page?

| Option                                                             | Verdict                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. The host's renderer does it itself (a custom cell calls an API) | Rejected. Works with no change, but the wiring is invisible: no event in the log, no reaction a page author can read or change, a second way for things to happen.                                                                                      |
| B. Give custom cells `emit`; the star is a column                  | Rejected. The star is not DATA: as a column it would be in the column menu, selectable, copied and exported as an empty cell, and every renderer would reimplement "on hover". Five exceptions are a second concept wearing the first one's name.       |
| C. Row actions as their own list, registered by name               | CHOSEN. The toolbar is "tools of the table"; this is "tools of a row": the same registration, the same `{ name, params? }`, the same warning for an unknown name. One place renders them, so hover, focus, placement and "never data" are decided once. |
| D. A built-in `favorite` setting, no registry                      | Rejected. The owner asked for a custom renderer, and the next request (pin, archive, open in a new tab) would be a setting each. It survives as the standard item of C.                                                                                 |
| E. Events named by the page (`on: { "favorite": […] }`)            | Rejected. The cleanest page JSON and the most expensive: a contract's events would depend on a widget's settings, which the schema, validation, the builder's form and the page file all assume they do not.                                            |

Why C: the table already has two registries — cells that SHOW and tools
that ACT — and the rule between them is in the code: a cell gets no
`emit`. A third list on the toolbar's pattern breaks nothing: one setting,
one event, one hook, one CSS rule.

Two things are refused on purpose. Hover in React state: it is a
presentation fact, CSS owns it, and the infinite list has shown what the
other way costs. And handing a host's component `emit`: a row action gets
`act`, which can say exactly one thing.

One impurity is accepted knowingly: several actions on one table are told
apart in the host's action, not in the page's JSON. Fixing that properly
means conditions on reactions — a decision about the engine, not about a
star.
