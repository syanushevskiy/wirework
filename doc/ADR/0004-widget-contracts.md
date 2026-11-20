# ADR-0004: Widget contracts — declarations without components

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

A contract is a widget's declaration alone — ports, events, settings — written
once with `defineContract`. Each implementation adds a registry name and a
component with `implementContract`, and the widget registry refuses one whose
ports or events differ from its contract's. Cells name the implementation.
Built: the standard kinds in `@wirework/widget-contracts` with antd
implementations, application-defined kinds, a conformance story set per kind.
Not built: cells that name a kind.

## 2. Problem

A widget is a declaration (input ports, events, settings) plus a component.
Pages, the builder, reactions and tests depend on the declaration; the
component is one rendering of it. This record says how the two are kept apart,
so several implementations — antd (`@wirework/antd-widgets`), another design
system, plain HTML — share ports, events, settings, builder forms and
conformance tests.

## 3. Details

### Shape (`@wirework/schema`, `contracts/widget-contract.ts`)

```ts
const buttonContract = defineContract({
  kind: "button", // kebab-case kind
  description: "...", // what implementations must do
  io: { inputs: {} },
  events: { clicked: { payload: z.object({ label: z.string() }) } },
  settings: z.object({ label: z.string().default("Click me") }),
});
// contract.viewModel is DERIVED: inputs + on + settings — no drift.
```

- Contracts are data (zod + the contract types).
- `ContractProps<typeof c>` gives an implementation its typed view model and
  `emit`.
- A CONTROLLED kind's event names the port it changes — `changed: { ...,
primary: "value", writesBack: "value" }` — and the engine writes the value
  back to that port's path by default, so a template binds the port and
  nothing else (doc/ADR/0002-widget-events.md, "Default write-back").

### Implementing (`@wirework/react`)

```ts
export const antdButton = implementContract(buttonContract, {
  type: "antd-button", // THIS implementation's registry name
  component: AntdButton, // props: ContractProps<typeof buttonContract>
});
```

- Ports, events and view model come from the contract; the definition records
  `kind: "button"`.
- Cells expose `data-kind`; the builder's palette tags each card with its kind
  and searches by it.
- A cell names the IMPLEMENTATION (`widget: "antd-button"`). Moving a page to
  another design system means changing `widget` in its cells (base and user
  templates); every template, reaction and setting stays valid.
- The widget registry is created with the contract registry
  (`createRegistry({ contracts })`). It refuses a widget whose `kind` is not a
  registered contract, or whose ports or events differ from that contract's.
- Both registries hold their items to the same DECLARATION rules: a view-model
  validator, ports with a value validator and a default that passes it,
  kebab-case events with payload validators. A broken contract is rejected
  when it registers, not when its first widget does.

### Standard kinds (`@wirework/widget-contracts`)

Every kind has a conformance set and an antd implementation. "Controlled"
means a port holds the value and `changed` writes it back. The containers
(`card`, `tabs`, `collapse`) are in doc/ADR/0009-containers.md and
`list-position` in doc/ADR/0007-row-window-and-header-filters.md.

**Display**

- `label` — optional `text` port; settings `text`, `tone` (semantic roles,
  never raw colours).
- `tag` — optional `text` port; `text`, `tone` (`default`, `info`, `success`,
  `warning`, `danger`); an empty bound value shows the static text.
- `progress` — `percent` port shown clamped to 0–100; `label`, `tone`,
  `showValue`; role=progressbar named by `label`.
- `alert` — optional `title` port; `title`, `description`, `tone` (`info`,
  `success`, `warning`, `danger`), `showIcon`; role=alert.
- `statistic` — `value` port (a number or text); `title`, `prefix`, `suffix`,
  `precision`; exposes the value as `data-value`.
- `divider` — nothing bound; `text`, `orientation`, `dashed`; role=separator.
- `result` — an OUTCOME. Optional `title` / `detail` ports replace the static
  texts; `status` (`success`, `error`, `info`, `warning`, `not-found`,
  `forbidden`, `failed`), `title`, `detail`, `action` (one button emitting
  `clicked { label }`); role=status, role=alert for `error`, `forbidden` and
  `failed`. Placed under a `when` like any widget; it knows nothing about
  requests.
- `timeline` — a HISTORY. `items` port (`[{ text, time?, title?, tone? }]`,
  data from the server); `mode`, `reverse`, `pending` (an open last entry);
  each entry exposes `data-tone`.
- `descriptions` — one record as a FACT SHEET. `record` port (an object),
  optional `loading`; `items` are the TABLE's columns without `filter` and
  `sortable` (`{ title, property, cell? }` — the same cell kinds and host
  renderers); `title`, `columns`, `size`, `bordered`; a plain click on a link
  cell emits `link-clicked { href, property, record }`. The antd
  implementation is a factory, `createAntdDescriptions({ cells })`.

**Actions and controlled fields**

- `button` — `clicked { label }`; role=button with the caption as its
  accessible name. The setting `confirm` asks a question first: `clicked` is
  emitted on OK only.
- `input` — `value` port (default ""), `changed { value, valid, message? }`
  (primary `value`); settings `label`, `placeholder`, `type`, `validation` (a
  closed rule set), `pattern`, `patternMessage`, `rows` (a long text is the
  same field with more lines); a textbox with `aria-invalid` and an `alert`
  holding the message.
- `number` — `value` port a finite number or `null` (the field is EMPTY —
  never 0), `changed { value }`; `label`, `placeholder`, `min`, `max` (above
  `min`), `step`, `precision`, `prefix`, `suffix`; role=spinbutton with
  `aria-valuemin` / `aria-valuemax`.
- `select` — `value` port (default "" = nothing chosen), optional `options`
  port falling back to the `options` setting, `changed { value }`; a combobox
  named by `label`; clearing emits "".
- `multi-select` — like `select` with a string-array `value` (default []). A
  chosen value not on offer is shown as it is; pruning it is the job of
  whoever changed the options.
- `radio-group` — like `select`, for a few options side by side; `label`,
  `buttons` (a row of buttons instead of radios); role=radiogroup, one radio
  per option.
- `checkbox` — `checked` port (default false), `changed { checked }`;
  role=checkbox named by `label`.
- `switch` — like `checkbox`; `label`, `onText`, `offText`; role=switch.
- `slider` — `value` port (a finite number), `changed { value }`; `label`,
  `min`, `max` (above `min`), `step`, `showValue`; role=slider with
  `aria-valuemin` / `aria-valuemax` / `aria-valuenow`; arrow keys move by
  `step`.
- `rate` — `value` port (a score, 0 = none), `changed { value }`; `label`,
  `count`, `allowHalf`, `allowClear`; a group holding one radio per star.
- `date` — `value` port TEXT: `YYYY-MM-DD`, or an ISO date-time with its
  offset when `withTime`; "" = nothing picked. `changed { value }`; `label`,
  `placeholder`, `withTime`, `picker` (date / week / month / year), `format`
  (what is SHOWN, never what is stored), `allowClear`; a textbox that takes a
  typed date (Enter picks it). A date is a string and never a Date: the store,
  the page file and the overlay are JSON, and the server decides what a day
  means.
- `date-range` — like `date` with a pair `[from, to]` (`["", ""]` = nothing);
  a group holding two textboxes. Bound to `<view>.filterBetween.<column>` it
  filters a server-described table with no other wiring
  (`@wirework/table-view`).
- `steps` — a PIPELINE. `current` port (a position from 0, or a step's key),
  optional `failed` port; `items` a NAMED LIST (`key`, `label`,
  `description?`), `label`, `direction`, `small`, `clickable` (a clicked step
  emits `changed { current: key }`, written back); exposes `data-current`.
- `pagination` — `page` and `total` ports, optional `pageSize` port (falling
  back to the `pageSize` setting), `changed { page, pageSize }` (primary
  `page`; the page size is a template's own reaction); `showSizeChanger`,
  `showTotal`, `size`.
- `refresher` — `schedule` port `{ enabled, interval }` (default off, 5 s),
  optional `busy` port, `changed` (the whole schedule, written back) and
  REQUIRED `refresh { trigger }`; ticks only while enabled and skips a tick
  while busy or hidden.
- `filter-bar` — `filters` port (`[{ id, label, options }]`, data the server
  describes) and `value` port; `changed { value }`.
- `dialog` — a CONTAINER with a port (doc/ADR/0009-containers.md). `open`
  port, `changed { open: false }` written back when the user closes it;
  `title`, `as` (modal / drawer), `placement`, `width`, `inline` (shown in
  place — previews, stories), `content` (a layout). A button opens it with a
  `set` on the path.

**Tables**

- `table` — `rows` port (array of objects, default [], suggested path name
  `data`), optional `loading` and `columns` ports; settings `columns`
  (`{ title, property, cell?, filter?, sortable? }`), `rowKey`, `emptyText`,
  `headerFilters`; events `load` (once when it appears), `row-selected
{ key, row }`, `link-clicked { href, key, property, row }`.
  - A column's `filter` (a list of `values`, or `text`) and `sortable` are
    DATA a loader derives from the server's description. With `headerFilters`
    on (off by default here, on for the infinite table) they are offered in
    the headers (doc/ADR/0007-row-window-and-header-filters.md).
  - What is chosen is controlled through the `filterIn`
    (`{ property: [values] }`) and `filterLike` (`{ property: text }`) ports;
    every change emits `filter-changed { filterIn, filterLike }` whole, empty
    ones left out. A `sortable` column sorts on a header click (ascending,
    descending, none), controlled through `orderBy`, emitting `sort-changed
{ orderBy }`. Both kinds share `tableHeaderPorts` and `tableHeaderEvents`.
  - A column's `cell` is one of the CONTRACT's kinds (`table-cell.ts`: `text`,
    `tag { tones }`, `link { to }`, `custom { name, params }`); the helpers
    `cellText`, `cellTone`, `cellHref` are shared and unit-tested.
  - Implementations expose `data-row-key`, `data-property`, `data-cell` and a
    tag cell's `data-tone`, and decide clicks in ONE place: a plain click on a
    link is `link-clicked`, never `row-selected`; interactive content in a
    cell owns its click and never selects the row.
  - A renderer never touches the store; it may act on the browser (the
    clipboard). The antd implementation is a factory,
    `createAntdTable({ cells })`, so a host adds renderers by name without a
    contract change (the levels of customizing a server-described table are in
    `packages/table-view/src/index.ts`).
- `infinite-table` — the `table` as an INFINITE LIST: its ports, events and
  settings, `headerFilters` on by default. The rows scroll inside the widget
  (`height`). When the end of the list comes into view while the `total` port
  says the server has more, it emits `more { offset }` — once per set of rows,
  never while loading — for a reaction to append the next rows
  (`table-view/load` with `more: true`). It is a virtual list: it renders a
  WINDOW of the rows it holds. Implementations expose the scroll box as
  `infinite-table-scroll`, the rows held as `data-held` and a line "held of
  total" under the rows; the box takes the keyboard focus so End, Home and
  Page Down scroll it. The `table` conformance set runs against it unchanged.
  The window, the windowed list and the height are in
  doc/ADR/0007-row-window-and-header-filters.md and
  doc/ADR/0021-table-height.md.

The validation RULE SET belongs to the contract (builders must render it
uniformly); the rule semantics are implemented per widget package and checked
by conformance stories.

### Application-defined kinds

`defineContract` in the app, `implementContract` for its widget, both
registered at boot (`createContracts().register(contract)`,
`registry.register(widget)`). The playground does this with `status-badge`
(`apps/playground/src/contracts`, `src/widgets`).

### Conformance (Storybook)

- `@wirework/antd-widgets/stories` exports a harness and, per standard
  contract, a conformance story set with interaction tests
  (`labelConformance`, `buttonConformance`, `inputConformance`, …).
  "Implements the contract" means those stories pass against your component.
- They query by accessible semantics (role, name, aria-invalid, alert), never
  by implementation test ids.
- A story file is the **Playground** first, then the conformance set, then
  implementation-specific extras.
- The Playground (`playground(definition)`, same export) is generated from the
  declaration: controls for EVERY setting ("Settings"; lists and objects as
  object controls, with the schema's descriptions and defaults), for the DATA
  at every input port ("Inputs (store data)": the control writes the store and
  follows when the widget's own reaction writes it), and for the cell width
  and the store readout ("Story"). It starts from the widget's `preview`;
  ports the preview leaves unbound get generated paths. Events land in the
  Actions panel.
- Every story runs as a browser test (its play function is the assertion)
  under vitest in Microsoft Edge, as part of `pnpm test:unit`.
- One gap: the sets live in the antd package, so another implementation would
  depend on it — they belong next to the contracts.

### Not contracts

`echo`, `counter` and `crash` are demo/test widgets; they stay plain
`defineWidget` definitions. A kind is extracted into a contract when a second
implementation or a concrete consumer needs it.

### Not built

Cells that name a KIND, with the host mapping a kind to an implementation. It
waits for a second real implementation.

## 4. Options weighed

| Option                                                        | Verdict                                                                                                                                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One definition per widget, declaration and component together | Kept only for widgets no second implementation needs (`defineWidget`). Nothing to share: a second implementation repeats ports, events and settings, and nothing checks they agree. |
| A contract as the declaration alone, implemented by name      | Chosen. Written once; an implementation adds a name and a component, and the registry checks it. A cell still names the implementation, so a swap means changing `widget` in cells. |
| Cells that name the kind, the host mapping kind to component  | Not built. It would make swapping free; it waits for a second real implementation.                                                                                                  |
