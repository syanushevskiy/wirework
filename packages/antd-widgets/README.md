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
  header — antd's list of values, or a search icon for free text — and
  sorting on a header click, when the `headerFilters` setting says so (off
  for the table, on for the infinite table) — and, with `filterRow` on, each
  column's filter UNDER its title, always in view: a search field for free
  text, a list of values otherwise (`data-testid="table-filter"`, named
  "Filter <title>"), the same choice the header dropdowns write. The infinite table scrolls
  inside its own box, asks for more rows at its end, and renders only a
  WINDOW of the rows it holds — twice the box's height, the rest blank space
  of the right height (doc/row-window-design.md) — so it is a virtual list;
  `data-held` says how many rows it holds, `data-window` which render. With
  `windowed` on it holds only a SLICE of the list (`data-offset` rows into
  it) and asks for the slice around the rows in view (`window`); with its
  `position` port bound it says where it stands and scrolls where it is
  told — `antdListPosition` beside it shows that and jumps along the list (lying, or
  with `vertical` upright with the start of the list at its top). Its
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
