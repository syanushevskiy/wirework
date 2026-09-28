# @wirework/react

The React adapter for Wirework. Peers: `react`, `react-dom`.

- `PageView` — renders a resolved page with its layout engine, binds its
  reactions and fires its load events; `editable` mode adds cell chrome.
- `WidgetPreview` — a live, non-interactive render of a widget from its
  preview seed, for palettes and catalogs.
- `defineWidget`, `implementContract`, `defineLayoutEngine` — React-typed
  definitions to register with the engine.
- Hooks: `usePort`, `useStorePath`, `useStoreSnapshot`, `useWidgetEvent`,
  `usePagePlan`, `usePageLoad`, `useAfterMount`.

```ts
import "@wirework/react/styles.css";
```
