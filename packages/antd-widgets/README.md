# @wirework/antd-widgets

The standard Wirework widget kinds implemented on Ant Design. Peers:
`react`, `antd`.

- `antdWidgets` — every production widget, to register at once; or
  `createAntdWidgets({ tableCells })` to add your own table cell renderers
  by name (`createAntdTable({ cells })` for the table alone).
- `antdTestWidgets` — widgets that exist to test a host (one always
  crashes). Never register them for real users.

```ts
import "@wirework/antd-widgets/styles.css";
```
