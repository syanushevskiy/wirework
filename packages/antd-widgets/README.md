# @wirework/antd-widgets

The standard Wirework widget kinds implemented on Ant Design. Peers:
`react`, `antd`, `dayjs` (antd's date library: the date widgets convert
the store's text at their edge and nowhere else), `zod`, `@wirework/react`,
`@wirework/schema`, `@wirework/widget-contracts`.

```ts
import "@wirework/antd-widgets/styles.css";
```

## Widgets

- `antdWidgets` — every production widget, to register at once; or
  `createAntdWidgets({ tableCells })` (`AntdWidgetsOptions`) to add your own
  cell renderers by name — the tables' and the fact sheet's.
- One export per widget: `antdLabel`, `antdTag`, `antdAlert`,
  `antdProgress`, `antdStatistic`, `antdDivider`, `antdButton` (with
  `confirm`, an antd Popconfirm asks before the click counts),
  `antdCheckbox`, `antdSwitch`, `antdInput` (with `rows`, a TextArea),
  `antdNumber`, `antdDate`, `antdDateRange` (dayjs at the edge, text in
  the store), `antdSelect`, `antdMultiSelect`, `antdRadioGroup`,
  `antdSlider`, `antdRate`, `antdSteps`, `antdResult`, `antdTimeline`,
  `antdPagination`, `antdRefresher`, `antdTable`, `antdInfiniteTable`,
  `antdDescriptions`, `antdFilterBar`, the containers `antdCard`,
  `antdTabs`, `antdCollapse` and `antdDialog` (a layout of other widgets
  inside, rendered by the adapter's `NestedLayout`; the dialog an antd
  Modal or Drawer open while its `open` port is true, shown in place with
  `inline` — what the palette preview and the stories use; in a story,
  `inside(...widgets)` from `./stories` lends them a list engine and the
  widgets they may hold), plus `antdCounter` and `antdEcho` (this
  package's own kinds); `createAntdTable({ cells })`,
  `createAntdInfiniteTable({ cells })` (`AntdTableOptions`) and
  `createAntdDescriptions({ cells })` (`AntdDescriptionsOptions`) are the
  two tables and the fact sheet with your renderers (`TableCellProps`,
  `TableCellRenderer`, `TableCellRenderers`) — the fact sheet shows the
  table's cell kinds over one record, so the same "copy" button serves
  both. Both tables offer each column's filter in its
  header — a Select of several values (searched by label, cleared with its
  button, the chosen ones as tags that wrap; every pick filters at once,
  Reset clears and Done closes), or a search icon for free text — and
  sorting on a header click, when the `headerFilters` setting says so (off
  for the table, on for the infinite table) — and, with `filterRow` on, each
  column's filter UNDER its title, always in view: a search field for free
  text, a list of values otherwise (`data-testid="table-filter"`, named
  "Filter <title>"), the same choice the header dropdowns write. With
  `columnMenu` on, a settings button above either table ("Column settings")
  opens the COLUMN MENU from a button reading "Columns" — a checkbox per
  column to show or hide it (locked, with an "Always" tag, for a column
  that says `required: true`: it cannot be hidden), a drag to reorder,
  three dots opening its actions — Pin left and Pin right, or Unpin and the
  pin to the other edge for a pinned one (it stays in view at the table's
  edge while the others scroll sideways, and stands first or last in the
  table and in the menu, which lists the pinned ones in sections of their
  own, PINNED LEFT and PINNED RIGHT, around COLUMNS),
  Reset to bring the columns back as configured —; the state (`{ order,
hidden, pinned? }`)
  lives at the `columnState` port when a page binds it, and otherwise in the
  browser's local storage under `columnStateKey` (or `wirework:columns:<rows
path>`), so it survives a reload. The `toolbar` setting lists the TOOLS
  above either table, beside that button — `[{ "name": "reset-filters" },
{ "name": "refresh" }]` are the standard two (`STANDARD_TOOLBAR`:
  `ResetFiltersItem` emits `filter-changed` with nothing chosen,
  `RefreshItem` the table's `refresh`, for a reaction to ask for the rows
  again) —, and a host registers its own by name as it does cells:
  `createAntdTable({ toolbar })` / `createAntdWidgets({ tableToolbar })`
  with components taking `TableToolbarItemProps` (`params`, `loading`,
  `filtered`, `refresh()`, `resetFilters()`); one registered under a
  standard name — your own refresher as `refresh` — replaces it. The
  `rowActions` setting lists the tools of ONE ROW
  (doc/ADR/0020-row-actions.md) — `[{ "name": "favorite" }]` is the
  standard star (`STANDARD_ROW_ACTIONS`: `FavoriteAction`, filled while the
  row's `favorite` property is true) —, registered the same way:
  `createAntdTable({ rowActions })` / `createAntdWidgets({ tableRowActions
})` with components taking `TableRowActionProps` (`row`, `rowKey`,
  `params`, `act(detail?)`). They stand in a column of their own at the
  start of the row — no data column: not in the column menu, the cell
  selection, Copy or the CSV — and show while the pointer is over the row
  or the keyboard's focus in it; an action whose root element says
  `data-pinned="true"` stays in view. `act` emits the table's `row-action`
  with `{ name, key, row, detail }`: the table stores nothing, your action
  does the work — and sends the server the row's KEY, never a field of the
  row. Both
  tables SELECT CELLS like a spreadsheet (`cellSelection`, on by default):
  a click selects a cell, a drag, a drag of the small square at its corner
  or a Shift+click a rectangle (`data-selected="1-2/2-5"` on the widget);
  a right click opens a menu — Copy and Copy with headers (the rectangle
  as tab-separated lines; a tag as its text, a link cell as its whole
  address; Ctrl/Cmd+C copies too; `cells-copied`), Export as CSV (every
  row held, the columns shown, `<exportName>.csv`; `rows-exported`). The infinite table scrolls
  inside its own box, asks for more rows at its end, and renders only a
  WINDOW of the rows it holds — twice the box's height, the rest blank space
  of the right height (doc/ADR/0007-row-window-and-header-filters.md) — so it is a virtual list;
  `data-held` says how many rows it holds, `data-window` which render. With
  `windowed` on it holds only a SLICE of the list (`data-offset` rows into
  it) and asks for the slice around the rows in view (`window`); with its
  `position` port bound it says where it stands and scrolls where it is
  told — `antdListPosition` beside it shows that and jumps along the list (lying, or
  with `vertical` upright with the start of the list at its top). With the
  `hasMore` port true on both, the END OF THE LIST IS NOT KNOWN yet and the
  total is the rows known so far: the list asks for the batch after them
  and reads "800+ rows" ("200 rows, more to load" when not windowed), the
  scale runs over the rows known, reads "401–425 of 800+" and shows no
  percent (`data-open` on both). Its
  box takes the keyboard focus, so End, Home and Page Down scroll it. The
  events each widget emits are exported as types (`ButtonEvents`,
  `InputEvents`, `TableEvents`, `InfiniteTableEvents`, …). Peer:
  `@ant-design/icons` (the search icon), antd's own icon set.
- `validate` (`ValidationRule`, `ValidationResult`) — the input contract's
  rules as this package applies them; `LABEL_TONES` and `VALIDATION_RULES`
  re-exported for convenience.
- `antdTestWidgets` and `brokenWidgets` — widgets that exist to test a host
  (one always crashes, the others must be rejected at registration). Never
  register them for real users.

## Stories

`@wirework/antd-widgets/stories` (peers: `storybook`,
`@storybook/react-vite`) is the story tooling any implementation of the
standard contracts reuses: `WidgetStory` (the harness: a seeded store, a bus,
the widget's own reactions, a readout), `playground` (a story with a control
for every setting and port), `storyArgs` / `storyArgTypes`, and a
conformance set per contract (`labelConformance`, `buttonConformance`, …,
`filterBarConformance`, `numberConformance`, `dateConformance`,
`dateRangeConformance`, `descriptionsConformance`, `resultConformance`,
`dialogConformance`, `stepsConformance`, `timelineConformance`) — stories
with `play` functions that say what "implements the contract" means; a
date is TYPED in them, never clicked in a calendar. Every story of this
package runs as a browser test under vitest.
