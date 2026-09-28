# @wirework/antd-builder

The Wirework page builder as Ant Design components: a palette of live widget
previews, the shared widget form (input ports, settings, one reaction per
event with the chosen action's parameters), and a drawer that edits a placed
widget. Render-only throughout — every piece of state comes from
`@wirework/builder`'s hooks, which this package is the reference
implementation of.

Peers: `react`, `antd`. Depends on `@wirework/builder`, `@wirework/react`,
`@wirework/engine`, `@wirework/schema`.

```ts
import "@wirework/antd-builder/styles.css"; // after antd's reset and @wirework/react/styles.css
import { WidgetBuilder, WidgetEditor } from "@wirework/antd-builder";
```

`WidgetBuilder` takes the registries, the store, the actions, the page name,
`addLocked` (why adding is not offered right now, or `undefined`) and
`onAdd`. `WidgetEditor` takes the cell, the store, the actions,
`bindingsLocked` and `onSave` / `onCancel`. The edit session, the page
toolbar and where pages are saved are the host's — see `@wirework/builder`.

## The test-id contract

These components expose `data-testid`s that a suite drives the builder
through: `widget-builder`, `add-widget`, `widget-palette`, `widget-search`,
`widget-browse`, `widget-card`, `widget-editor`, `widget-save`,
`widget-cancel`, and per field `port-input-<port>`, `setting-<name>`,
`reaction-<event>-<part>` (built by the helpers exported from
`widget-form.tsx`). Renaming any of them is a breaking change.
