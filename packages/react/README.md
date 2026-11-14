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
  widget's or the layout renderer's crash, or a predicate that threw — that
  the page isolated; `predicates` is the registry a cell's `when` may name
  (doc/ADR/0008-conditions.md). A cell whose condition does not hold keeps
  its place with `data-when="false"` and no widget inside; in edit mode
  the widget stays, dimmed, with the reason (`cell-hidden-note`). A
  template's `appear` and `disappear` name the animations the widget
  plays when its condition turns true and false (`data-appear` /
  `data-disappear` on the cell): the keyframes `ww-<name>` of this
  stylesheet, forward on the way in and in reverse on the way out — the
  widget stays mounted until the animation ends (`useShowing`). A host's
  own appearance is a name in the engine's registry (`appearances`, the
  registry a cell's names are checked against) plus its `@keyframes
ww-<name>` in the host's stylesheet.
- `WidgetPreview` (`WidgetPreviewProps`) — a live, non-interactive render of
  a widget from its preview seed, for palettes and catalogs.
- `CellChrome` (`CellChromeProps`) — the Edit / Remove actions an engine
  places per cell in edit mode; for a container, "Edit content" per layout
  it holds (`onEditLayout(cellId, layoutPath)`), and a host's wrap action
  (`WrapCell`: `{ label, onWrap }`, `PageView.wrapCell`).
- `NestedLayout` (`NestedLayoutProps`: `template`, `path`) — a layout INSIDE
  a widget (doc/ADR/0009-containers.md): a container renders the page
  template its own view model holds with the page's registries, store and
  bus from `PageContext` (`PageScope`, provided by `PageView`; the cell's
  id from `CellKeyContext`), its cells reacting under the nested page name
  (`overview/card-1`) and their overlay entries under the chain key
  (`card-1/button`) — every layer's, a role's entry as much as the user's
  (`PageScope.overlays` — `userViewModels` until 6 November 2026 —,
  `PageView.roles`; doc/ADR/0012-roles.md) —, never
  editable in place; four deep at most, a
  problem placeholder beyond; outside a page only how many widgets it
  holds. Its element is `data-testid="layout"`.
- `ErrorBoundary`, `WidgetErrorBoundary`, `LayoutErrorBoundary` (`OnError`,
  `WidgetErrorBoundaryProps`, `LayoutErrorBoundaryProps`) — a crash shown
  as a placeholder (`WidgetCrash`), cleared by a changed `resetKey`,
  reported to `onError`.

## Definitions

- `defineWidget` (`ReactWidgetDefinition`) — a React-typed widget
  definition; `implementContract` (`ContractImplementation`) — a widget
  that implements a contract: ports, events and view model come from it,
  the component is yours.
- `defineLayoutEngine` (`ReactLayoutEngine`, `LayoutRendererProps`) — a
  layout-engine plugin whose renderer is a React component.

## Lazy widgets

A heavy widget's code is loaded only by the pages that show it
(doc/ADR/0018-lazy-widgets.md). Its contract is registered at boot like any
other; its implementation says `load` instead of `component`:

```ts
export const codeEditor = implementContract(codeEditorContract, {
  type: "acme-code-editor",
  load: () => import("./code-editor"), // the module's default export is the component
  placeholder: { minHeight: "14rem" }, // optional: the room the cell keeps meanwhile
});
```

- The page asks for the code of everything it shows as soon as its plan is
  resolved; a widget a condition hides asks when it first shows.
- The cell says `data-loading="true"` and shows a quiet block
  (`cell-loading`) after 200 ms; code that does not arrive is that cell's
  problem (`data-problem="load-failed"`) with "Load again", reported to
  `PageView`'s `onError`.
- `lazyComponent(load, { name })` is the same thing as a plain component —
  for `defineWidget`, or a layout engine's `renderer`.
- `preloadPage({ page, viewModels, registry, layoutEngines, … })` starts a
  page's code before it opens — on a menu item's hover, say.
- The contract's module must not import the component's module, not even
  for a value: one import and the split is gone. Import the component's
  stylesheet in the component's module, so it travels with the chunk.

## Hooks

- `useStorePath`, `usePort`, `useStoreSnapshot` — reactive reads of the
  store: a path, a validated input port with its default, the whole tree.
- `useWidgetEvent` — a host subscription to one widget event.
- `useWhen` (`WhenState`, `WhenOptions`) — whether a condition holds right
  now, following the paths it reads; a predicate that throws becomes an
  error reported once, never a throw.
- `usePagePlan`, `useReactions`, `usePageLoad` — what `PageView` is made
  of, for a host that renders pages its own way.
- `useAfterMount` — a widget announcing its appearance (a table's `load`),
  once per mount and again on a reload; `useAnnounce` is the deferral it
  and `usePageLoad` share.
