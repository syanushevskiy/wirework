# ADR-0020: Row actions — a renderer the host registers, shown on hover, that emits an event

- **Status:** Accepted — built (15 November 2026; "Built" at the end says what the owner decided and what changed)
- **Date:** 2026-11-15
- **Deciders:** the product owner

## Description

The owner: "I need a custom rendered on hover to mark row favorite. So on
hover the star should appear for row and invoke custom event."

Three things are asked for at once: something a HOST renders (custom), that
appears when the pointer is over a ROW (hover), and that tells the page
something happened (an event) — the favourite star being the first use.

## What there is

Read from the code on 15 November 2026.

- **A custom cell cannot act.** `TableCellProps` is `value`, `text`, `row`,
  `column`, `params` — "no store, no emit: it shows the row's data"
  (`packages/antd-widgets/src/hooks/use-table-cell.ts`). The demo's `copy`
  cell works only because copying needs nothing from the page.
- **A toolbar item can act, through functions the table hands it** —
  `refresh()`, `resetFilters()` (`use-table-toolbar.ts`). It never gets
  `emit`: the table decides which of its declared events an item may fire.
  This is the pattern to follow.
- **Events are declared in the contract.** `on` is strict: a reaction to an
  event the contract does not declare is a configuration error at boot
  (`packages/schema/src/contracts/reactions.ts`). A truly free event name
  is therefore not available, and should not be: the builder's form lists
  a widget's events from its contract.
- **Reactions have two verbs and no conditions** — `set` and `call`. A
  called action receives the event with its payload.
- **A control inside a row already owns its click.** `clicked()` in
  `use-table-rows.ts` treats `button`, `a[href]`, inputs and
  `[role='button']` as the control's business: no `row-selected`.
- **Nothing in a table reacts to hover in React state**, and it must stay
  so: the infinite table was measured rendering too often while scrolling
  (ADR-0007, "Scrolling a long list, measured"). The row hover that exists
  is CSS (`tr.ant-table-row:hover` in `styles.css`).
- **Every data column is in the column menu, the cell selection, Copy, and
  the CSV export**, and counts in the table's least width.

## Options considered

Where does the star live, and how does its click reach the page?

- **A. The host's renderer does it itself** — a custom cell that closes
  over the host's API client and calls the server. Works today, no change.
  Rejected: the page's wiring is then invisible — no event in the log, no
  reaction a page author can read or change, and a second way for things
  to happen beside reactions.
- **B. Give custom cells `emit`** (or an `act`), and put the star in a
  column of its own (`cell: { kind: "custom", name: "favorite" }`).
  The smallest change. Rejected as the main answer: the star is not DATA.
  As a column it shows up in the column menu ("Favorite" to hide and
  drag), is a selectable cell, is copied as an empty cell and exported as
  an empty CSV column, and "on hover" would be a rule every renderer has
  to reimplement. Each of those needs an exception; five exceptions are a
  second concept wearing the first one's name.
- **C. Row actions as their own list, registered by name** — chosen (see
  "Decision"). The
  toolbar is "tools of the table"; this is "tools of a row". Same
  registration, same `{ name, params? }` shape, same warning for an
  unknown name. One place renders them, so hover, focus, placement and
  "never part of the data" are decided once, by the table.
- **D. A built-in `favorite` setting** (`favoriteProperty: "favorite"`)
  with no registry. Rejected: the owner asked for a custom renderer, and
  the next request (pin, archive, open in a new tab) would be a setting
  each. It survives as the STANDARD item of answer C.
- **E. Events named by the page** (`on: { "favorite": [...] }` because the
  setting lists an action called `favorite`). The cleanest page JSON, and
  the most expensive: the contract's events would depend on a widget's
  settings, which the schema, the validation, the builder's form and the
  page file all assume they do not. Not for one star.

## Decision

**C: row actions as their own list, registered by name.**

A new setting on both tables, `rowActions`: a list of `{ name, params? }`,
each NAME a component registered by the host — exactly how the toolbar's
items and the custom cells are registered. The table renders them in ONE
narrow column of its own at the START of every row, pinned to the left
edge, hidden until the row is hovered or holds the keyboard focus. A row
action is handed the row and one function, `act(detail?)`, which EMITS a
new declared event, `row-action`, with `{ name, key, row, detail }`. The
page reacts to it like to any event: `{ call: "runs/set-favorite" }`.

One row action is standard, `favorite`: a star, outlined until the row's
`favorite` property is true, filled — and always visible — when it is.

The table stores nothing: whether a row is a favourite is the row's own
data, changed by the action the reaction calls.

Why: the table already has two registries — cells that SHOW and tools
that ACT — and the rule between them is written in the code: a cell gets
no `emit`. The request breaks that rule only if it is answered with a
cell. A third list that follows the toolbar's pattern breaks nothing: one
setting, one event, one hook, one CSS rule. Two things are refused. Hover
in React state: it is a presentation fact, CSS owns it, and the infinite
list has already shown what the other way costs. And handing a host's
component `emit`: a row action gets `act`, which can say exactly one
thing. One impurity is accepted knowingly: several actions on one table
are told apart in the host's action, not in the page's JSON. Fixing that
properly means conditions on reactions, which is a decision about the
engine, not about a star.

The design below was first drawn with the column at the END of the row,
pinned right; the owner chose the start. "Built" at the end says what
else the build changed.

## The design

### The contract (`packages/widget-contracts/src/table.ts`, shared by both table kinds)

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
rowActions: z.array(rowActionSchema).default([]).describe(
  'Actions offered on a row while the pointer is over it: [{ "name": "favorite" }] — the standard one — or names the host registered',
),
```

Empty by default: no table changes until a page lists an action.

### What the host registers (`packages/antd-widgets`)

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

A host's action under a standard name replaces it, as with the toolbar.
The action never receives `emit` or the store: it can fire `row-action`
and nothing else, with its own name — it cannot impersonate another.

The host's whole star, if it wanted its own:

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

### Where it renders, and when it shows

- **One column at the end of the row**, added by the shared hook
  (`use-row-actions.ts`, composed by `use-table.ts` and
  `use-infinite-table.ts`): antd's `fixed: "right"`, so it stays in view
  when the table scrolls sideways; 32 px per action; a header with no
  text, named "Row actions" for screen readers.
- **Not a data column.** It has no `property`: it is not in the column
  menu, not a selectable cell (no `data-at-column`), not in Copy, not in
  the CSV export, has no cell tip. It does count in `tableWidth`.
- **Hover is CSS, never state.** The cell's content is
  `.ww-table__row-actions`; each action in it has opacity 0 until its row
  is hovered (`tr:hover`) or holds the focus (`tr:focus-within`). Opacity,
  not `display`: the row's height never changes, and the button stays in
  the tab order — Tab from the row reaches the star, which makes it
  appear. No re-render on hover, so the virtual list scrolls as it does.
- **An action may stay visible** by putting `data-pinned="true"` on its
  own root element: a filled star must show without hover, or nobody could
  see which rows are favourites.
- **No hover on a touch screen**: under `@media (hover: none)` the actions
  are always visible.
- **Its click is its own.** A real `button` is already in `INTERACTIVE`:
  the row is not selected by a click on the star. Nothing to add.

### The standard action `favorite`

`{ "name": "favorite", "params": { "property": "favorite" } }` — the
property defaults to `favorite`. A star button named "Favorite",
`aria-pressed`; `act({ active: <the state asked for> })`. Exposed for
tests as `data-testid="table-row-action"` with `data-name` and
`data-active`.

### The page

```json
"rowActions": [{ "name": "favorite" }],
"on": {
  "row-action": [{ "call": "runs/set-favorite" }]
}
```

The action reads `payload.key` and `payload.detail.active`, calls the
server, and writes the row's new `favorite` where the table reads its
rows — one row patched in `<into>.data`, no list request (on the demo a
list request also moves the fake server's clock). A failure writes
`<into>.error` and leaves the row as it was.

### More than one action on a table

Reactions have no conditions, so every row action of a table arrives at
the same reaction list. With one action that is invisible. With two, the
action the reaction calls must look at `payload.name`. That is routing in
host code — acceptable, small, and honest about the engine's two verbs;
see the first point for the owner.

### Security (ADR-0019)

`row` in the payload is what the browser holds, not what the server
knows. An action that changes anything on the server sends the KEY and
lets the server decide; it never trusts a field of the row. This is the
rule for `row-selected` already, restated because this event is the first
one built to cause a write.

## How it is tested

- **Unit:** the schema (an unknown key refused, a name that is not
  kebab-case refused); the hook resolving names, the standard one replaced
  by a host's, an unknown name left out with one console warning.
- **Stories** (both tables; each `play` is the assertion): `RowActions` —
  the star's opacity is 0, hovering the row makes it 1, a click stores the
  payload `{ name: "favorite", key, detail: { active: true } }` and does
  NOT emit `row-selected`, a favourite row's star is visible without
  hover, Tab from the row shows and reaches it; `CustomRowAction` — a
  host's component under its own name and under `favorite`;
  `RowActionsStayOutOfTheData` — the column is absent from the column
  menu, from Copy with headers and from the CSV.
- **e2e** (`row-actions.feature`, steps in `table.steps.ts`):
  `I hover the table row "<key>"` (a real pointer), `the table row
"<key>" offers the action "favorite"` / `hides its actions` (the
  computed opacity — Playwright calls an element with opacity 0 visible,
  so the step reads the style), `I use the action "favorite" on the table
row "<key>"`, `the table row "<key>" is a favorite` / `is not a
favorite` (`data-active`), and the event log showing one `row-action`.
  One scenario on the windowed list: a favourite survives its rows being
  dropped and fetched again.

## Consequences

- One new setting, one new event, one new registry on two widgets; no
  change for any existing page (`rowActions` is empty by default).
- Additive for stored data: an optional setting with a default needs no
  migration step (ADR-0017).
- The table is 32 px wider per action where a page lists any; the demo
  tables stay under the playground's page width with one.
- The builder's form shows `rowActions` as JSON, like `toolbar`, and
  `row-action` among the table's events.
- Estimated size: about 150 lines of source plus styles, stories and
  steps.

## Phases

1. The contract, the shared hook and column, the standard `favorite`, the
   styles, the stories on both tables, the READMEs.
2. The demo: a `favorite` field on the fake runs server, the action
   `runs/set-favorite`, the star on one page, `row-actions.feature`.

## For the owner to decide

1. **Several actions on one table** — route by `payload.name` in the
   host's action (the design), or add a filter to reactions so the page
   routes (`{ call, only: { name: "favorite" } }` — an engine change that
   ADR-0002's "exactly two verbs" has so far refused)?
2. **Which demo page gets the star** — the history list (recommended: it
   proves hover on the virtual list and has no selection of its own to
   collide with), the runs table, or the archive?
3. **Is the standard `favorite` wanted in the package**, or only the
   registry, with the star living in the host?
4. **At the end of the row** (the design: pinned right, where tools sit)
   **or at its start**, before the first column?
5. **Should the design get a wider review** before it is built? It has
   had none.

## Built (15 November 2026)

The owner's answers, the same day: "1) not sure about filter on reaction. 2) Archive Page 3) Standart star ship in the package as I understand it
can be ovveriden by client registry. 4) Start of the row. 5) Not yet. Do
implementation".

1. **No filter on reactions.** The engine is unchanged; a table's row
   actions all arrive at its one `row-action` reaction list, and the
   action called tells them apart by `payload.name`. The demo's action
   does exactly that: it reads the payload with a schema that names
   `favorite` and leaves anything else alone. The question stays open for
   the day a page has two actions that call different things.
2. **The archive page** has the star (`"rowActions": [{ "name":
"favorite" }]`, `"row-action": [{ "call": "archive/set-favorite" }]`).
3. **The standard `favorite` ships** (`FavoriteAction`,
   `STANDARD_ROW_ACTIONS`), and a host's action registered under that name
   replaces it — the `CustomRowActions` story.
4. **At the START of the row**: the column is the first one, pinned LEFT
   (`fixed: "left"`), where the design had it last and pinned right.
5. **A wider review: not yet.** The design was built without one.

What the build does differently from the design above:

- **The keyboard's focus, not any focus, shows a row's actions**
  (`:focus-visible`). With `:focus-within`, a star just clicked with the
  mouse kept the focus and so stayed in view after the pointer left —
  the first e2e run caught it on a row whose mark had been taken away.
- **28 px an action** plus the cell's padding, not 32.
- **The demo's action is `archive/set-favorite`** (the design said
  `runs/`): the archive has a fake server of its own. It sends the run's
  key and the state asked for, and when the server answered patches that
  one row in `archive.data` — no list request. The server's rows carry
  `favorite` (only with `details`, the archive's), which no column shows.
- **The loader joins a batch to the rows held NOW**, not to the copy it
  read before the request (`packages/table-view/src/loader.ts`): a row
  marked while the next batch of a windowed list was on its way would
  otherwise have come back unmarked.
- **Tests:** the stories `RowActions` and `CustomRowActions` (table) and
  `RowActions` (infinite table: every rendered row has its star, the blank
  rows span the new column); `row-actions.feature`, four scenarios on the
  archive — the star under the pointer and only there, marking, taking the
  mark away, the mark still there after its rows were dropped and fetched
  again. Steps: `I hover the table row "<key>"`, `the table row "<key>"
shows / hides the action "<name>"` (the computed opacity), `I use the
action "<name>" on the table row "<key>"`, `the table row "<key>" is a
favorite` / `is not a favorite` (`aria-pressed`). The story the design
  called `RowActionsStayOutOfTheData` is an assertion inside `RowActions`
  (no property, no selection attributes); the column menu, Copy and the
  CSV are not asserted separately — they read the data columns, which this
  column is not among.
- **Not built:** a failure of the server call is the action's rejection,
  reported like any action's; it does not write `<into>.error`.
