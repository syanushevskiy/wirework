# @wirework/antd-widgets

The standard Wirework widget kinds implemented on Ant Design. Peers:
`react`, `antd`, `zod`, `@wirework/react`, `@wirework/schema`,
`@wirework/widget-contracts`.

```ts
import "@wirework/antd-widgets/styles.css";
```

## Widgets

- `antdWidgets` — every production widget, to register at once; or
  `createAntdWidgets({ tableCells })` (`AntdWidgetsOptions`) to add your own
  table cell renderers by name.
- One export per widget: `antdLabel`, `antdTag`, `antdAlert`,
  `antdProgress`, `antdButton`, `antdCheckbox`, `antdInput`, `antdSelect`,
  `antdMultiSelect`, `antdPagination`, `antdRefresher`, `antdTable`,
  `antdFilterBar`, plus `antdCounter` and `antdEcho` (this package's own
  kinds); `createAntdTable({ cells })` (`AntdTableOptions`) is the table
  with your renderers (`TableCellProps`, `TableCellRenderer`,
  `TableCellRenderers`). The events each widget emits are exported as types
  (`ButtonEvents`, `InputEvents`, `TableEvents`, …).
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
`filterBarConformance`) — stories with `play` functions that say what
"implements the contract" means. Every story of this package runs as a
browser test under vitest.
