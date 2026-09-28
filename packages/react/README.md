# @wirework/react

The React adapter for Wirework. Peers: `react`, `react-dom`. Depends on
`@wirework/schema`, `@wirework/engine`, `@wirework/events`,
`@wirework/store`.

```ts
import "@wirework/react/styles.css";
```

## Rendering

- `PageView` (`PageViewProps`) — renders a resolved page with its layout
  engine, binds its reactions and fires its load events; `editable` adds the
  cell chrome (`onEditCell`, `onRemoveCell`, `onLayoutChange`); `reloadKey`
  makes the page load again in place; `onError` reports a `PageError` — a
  widget's or the layout renderer's crash — that the page isolated.
- `WidgetPreview` (`WidgetPreviewProps`) — a live, non-interactive render of
  a widget from its preview seed, for palettes and catalogs.
- `CellChrome` (`CellChromeProps`) — the Edit / Remove actions an engine
  places per cell in edit mode.
- `ErrorBoundary`, `WidgetErrorBoundary`, `LayoutErrorBoundary` (`OnError`,
  `WidgetErrorBoundaryProps`, `LayoutErrorBoundaryProps`) — a crash shown
  as a placeholder, cleared by a changed `resetKey`, reported to `onError`.

## Definitions

- `defineWidget` (`ReactWidgetDefinition`) — a React-typed widget
  definition; `implementContract` (`ContractImplementation`) — a widget
  that implements a contract: ports, events and view model come from it,
  the component is yours.
- `defineLayoutEngine` (`ReactLayoutEngine`, `LayoutRendererProps`) — a
  layout-engine plugin whose renderer is a React component.

## Hooks

- `useStorePath`, `usePort`, `useStoreSnapshot` — reactive reads of the
  store: a path, a validated input port with its default, the whole tree.
- `useWidgetEvent` — a host subscription to one widget event.
- `usePagePlan`, `useReactions`, `usePageLoad` — what `PageView` is made
  of, for a host that renders pages its own way.
- `useAfterMount` — a widget announcing its appearance (a table's `load`),
  once per mount and again on a reload; `useAnnounce` is the deferral it
  and `usePageLoad` share.
