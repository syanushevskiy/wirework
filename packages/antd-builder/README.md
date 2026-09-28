# @wirework/antd-builder

The Wirework page builder as Ant Design components: the page toolbar, a
palette of live widget previews, the shared widget form (input ports,
settings, one reaction per event with the chosen action's parameters), and
a panel that edits a placed widget. Render-only throughout — every piece of
state comes from `@wirework/builder`'s hooks, which this package is the
reference implementation of.

Peers: `react`, `antd`. Depends on `@wirework/builder`, `@wirework/react`,
`@wirework/engine`, `@wirework/schema`.

```ts
import "@wirework/antd-builder/styles.css"; // after antd's reset and @wirework/react/styles.css
import { PageToolbar, WidgetBuilder, WidgetEditor } from "@wirework/antd-builder";
```

- `PageToolbar` takes what `usePageToolbar` returns (`toolbar`) and,
  optionally, `texts` — the words for the lock codes and the edit targets
  (`DEFAULT_PAGE_TOOLBAR_TEXTS` is English).
- `WidgetBuilder` takes the registries, the store, the actions, the page
  name, `addLock` (why adding is not offered right now, or `undefined`),
  `lockTexts` (its words, `DEFAULT_ADD_LOCK_TEXTS` unless you say otherwise)
  and `onAdd`.
- `WidgetEditor` takes the cell, the store, the actions, `bindingsLocked`
  and `onSave` / `onCancel`. It is a panel the host places above the page,
  never a drawer over it.

The edit session and where pages are saved are the host's — see
`@wirework/builder`.

## The test-id contract

These components expose `data-testid`s that a suite drives the builder
through: `layout-toolbar`, `engine-select`, `engine`, `page-edit`,
`page-save`, `page-cancel`, `page-mode`, `pending-changes`,
`toggle-user-overlay`, `edit-target`, `widget-builder`, `add-widget`,
`add-widget-locked`, `widget-selected`, `widget-palette`, `widget-search`,
`widget-browse`, `widget-card`, `widget-editor`, `widget-save`,
`widget-cancel`, `bindings-locked`, and per field `port-input-<port>`,
`setting-<name>`, `reaction-<event>-<part>` — built by the helpers of
`@wirework/antd-builder/ids`, which a suite imports without the components.
Renaming any of them is a breaking change.
