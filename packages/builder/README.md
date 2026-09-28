# @wirework/builder

The Wirework page builder, without a user interface: everything a person
needs to assemble a page out of registered widgets — choosing one, wiring
its input ports and its events, editing a placed one, and the edit session
that holds it all until Save — as React hooks a host renders however it
likes. `@wirework/antd-builder` is the Ant Design implementation of these
hooks and the reference for writing another.

Peer: `react`. Depends on `@wirework/schema`, `@wirework/engine`,
`@wirework/react`. No UI library, no router, no fixtures.

## You bring storage

The builder never decides where pages go. `useCommit({ store, save })` is
the one path every change takes — the store first, then your `save` with
the trees exactly as the store now holds them:

```ts
const save: SaveTrees = (trees) => api.put("/pages", trees); // or localStorage, a file, …
const commit = useCommit({ store, save });
```

`save` is required and may be async. A rejection is reported to the console
and the page on screen keeps its change; what to tell the user is your
decision. Read the trees back when your application boots and start the
store from them — nothing in this package restores anything.

## What a host provides

| To                                                       | What                                                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useCommit`                                              | the store, `save`                                                                                                                                          |
| `usePageEditing`                                         | `commit`, `canEdit`, the registries (widgets, layout engines, actions), the page name, the edit target (`"base"` or `"user"`), the trees, `modelNamespace` |
| `useBuilder`                                             | `commit`, `canEdit`, the layout engines, the page name, a `BuilderNaming`, `cancelEditing`, `onAdded`                                                      |
| `useWidgetBuilder` / `useWidgetEditor` / `useWidgetForm` | the registries, the store, the actions (and, for the builder, `addLock`: why Add is not offered)                                                           |
| `usePageToolbar`                                         | the facts of the session and the builder: engines, engine and its lock, editing and the pending count, the edit lock, the overlay and its lock, the target |

Every hook takes ONE input object. `canEdit` is required everywhere a hook
can write: the builder never assumes this user may change pages, and it
gates inside the hooks, not only on a button. `BuilderNaming`
(`DEFAULT_BUILDER_NAMING` unless you say otherwise) names the page template,
the widget-template name, the group under `viewModels.widgets` that holds
placed widgets, and the cell-id scheme.

## Locks are reasons, not sentences

A control that is not offered right now is reported as a reason code, never
as text — this package has no user-facing words. `useBuilder` reports the
engine's lock (`EngineLock`: `"widgets-placed"`, `"no-template"`,
`"configured"`), the host tells `useWidgetBuilder` why Add is locked
(`AddLock`: `"permission"`, `"editing"`, `"user-view"`) and `usePageToolbar`
why the page cannot be edited (`EditLock`: `"permission"`, `"loading"`) or
the overlay cannot be turned on (`OverlayLock`: `"no-widgets"`). The UI says
them in its own words; `@wirework/antd-builder` ships English defaults a host
can replace.

## Hooks

- `useWidgetForm` — one field per input port, per primitive setting, and per
  event a reaction (`set` a path from a payload field, or `call` an action
  with its declared parameters); `collect()` gives bindings and settings.
- `useWidgetBuilder` — a widget choice with generated input paths on top of
  the form; `add` hands the result to the host.
- `useWidgetSearch`, `usePalettePress` — the palette's search and card presses.
- `useWidgetEditor` — the form prefilled from a placed widget.
- `usePageEditing` — the edit session: layout changes, widget edits and
  removals as pure ops replayed over the live trees, committed on Save.
- `useBuilder` — the page being built, its engine choice while it is empty,
  and placing a widget.
- `usePageToolbar` — what the toolbar above a page offers: the engine
  choice, Edit / Save / Cancel with the pending count, the overlay switch and
  where edits go, each lock as a reason.
- `usePathCombobox` — autocomplete over existing store paths.
