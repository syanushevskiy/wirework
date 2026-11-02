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

| To                                                       | What                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useCommit`                                              | the store, `save`                                                                                                                                                         |
| `usePageEditing`                                         | `commit`, `canEdit`, the registries (widgets, layout engines, actions), the page name, the edit target (`"base"` or `"user"`), the trees, `modelNamespace`                |
| `useBuilder`                                             | `commit`, `canEdit`, the layout engines, the page name, a `BuilderNaming`, `cancelEditing`, `onAdded`                                                                     |
| `useWidgetBuilder` / `useWidgetEditor` / `useWidgetForm` | the registries, the store, the actions, the predicates a condition may pick (the standard ones alone when absent) and, for the builder, `addLock`: why Add is not offered |
| `usePageToolbar`                                         | the facts of the session and the builder: engines, engine and its lock, editing and the pending count, the edit lock, the overlay and its lock, the target                |
| `usePageViews`                                           | `commit`, the edit lock, the layout engines, the page name, the trees, the target, whether the overlay is on, the shown view (`plan.view`), `cancelEditing`               |

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
the overlay cannot be turned on (`OverlayLock`: `"no-widgets"`), and
`usePageViews` why no view can be chosen (`ViewsLock`: `"overlay-off"`,
`"no-page"`) and why a view could not be made (`ViewProblem`: an empty,
dotted or taken name, not a view file, another page's, a template the
engine refuses). The UI says them in its own words; `@wirework/antd-builder`
ships English defaults a host can replace.

## Page views

A page's VIEWS (doc/page-views-design.md) are its templates as the user sees
them: the prebuilt ones under `viewModels.pages.<page>` and the user's own
under `userViewModels.pages.<page>.templates`; the kind is where a view
lives, nothing is stored. `pageViews(trees, page)` lists them; `usePageViews`
chooses one (a preference — no permission), and makes, renames, deletes,
shares and imports them (gated by the edit lock). Save as and Import write
where the edit target says: the user's own with the overlay on, a prebuilt
view with it off. A view travels as a JSON file — `pageViewFile`,
`exportPageView`, `parsePageViewFile` (`PageViewFile`: kind
`wirework-page-view`, version 1, page, name, template) — so users share
layouts and your application decides where the files go.

## Hooks

- `useWidgetForm` — one field per input port, per primitive setting, and per
  event its reactions: the write-back the event does by default (shown,
  following the port's path) and a list of rows, run in order, each `set` a
  path from a payload field or `call` an action with its declared
  parameters (`addReaction`, `removeReaction`); and the CONDITION under
  which the widget shows (doc/conditions-design.md) as rows of a path, a
  check picked from the predicate registry by its phrase — or the
  `CONSTRUCTOR`, a tree of groups (and / or, negated, nested as
  parentheses) and tests built step by step (`editConstructor`, `editTree`,
  `TreeEdit`) and saved as the words the engine reads —, the value it
  takes and when/unless (`conditions`, `predicateChoices`, `testChoices`,
  `conditionPaths`, `addCondition`, `removeCondition`, `setCondition`),
  every row gating submit until it holds together; `collect()` gives
  bindings (`inputs`, `on`, `when`) and settings, the default never among
  them, and `templateOf` writes them into a template.
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
- `usePageViews` — the page's views: the list with each one's kind, the
  shown one, choosing another, Save as / Rename / Delete / Share / Import and
  the panel they open.
- `usePathCombobox` — autocomplete over existing store paths.
