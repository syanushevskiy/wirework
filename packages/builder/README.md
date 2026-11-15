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

| To                                                       | What                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useCommit`                                              | the store, `save`                                                                                                                                                                                                                                                                                                         |
| `usePageEditing`                                         | `commit`, `canEdit`, the registries (widgets, layout engines, actions), the page name and `at` (the layout inside a chain of containers, else the page), the edit target (`"base"`, `"user"` or `{ role }` — the user overlay is on exactly for `"user"`), the roles the page is shown as, the trees, the `BuilderNaming` |
| `useBuilder`                                             | `commit`, `canEdit`, the widget and layout-engine registries, the page name and `at`, a `BuilderNaming`, `cancelEditing`, `onAdded` (told what was placed: a `PlacedWidget` — id, widget, the paths of the layouts it holds)                                                                                              |
| `useWidgetBuilder` / `useWidgetEditor` / `useWidgetForm` | the registries, the store, the actions, the predicates a condition may pick (the standard ones alone when absent) and, for the builder, `addLock`: why Add is not offered                                                                                                                                                 |
| `usePageToolbar`                                         | the page and `at` with `onGoTo` (the breadcrumb), the facts of the session and the builder: engines, engine and its lock, editing and the pending count, the edit lock, the overlay and its lock, the target, the roles a builder may edit for with `onSelectRole`                                                        |
| `usePageViews`                                           | `commit`, the edit lock, the layout engines, the page name, the trees, the target, the roles the page is shown as, the shown view (`plan.view`), `cancelEditing`                                                                                                                                                          |

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

A page's VIEWS (doc/ADR/0006-page-views.md) are its templates as the user sees
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

## Roles

A page read through the user's ROLES (doc/ADR/0012-roles.md): the engine folds
the base, then the entries of `viewModels.roles.<role>` for the roles the
session lists, then the user's overlay. The builder's third edit target is
a role: `EditTarget` is `"base" | "user" | { role }` (`roleOf`), and every
overlay op — a moved cell, a saved view, a widget's settings, a chosen
template (`setCellView`), a card's content — writes the role's entry through
the engine's `updateRole` with the same functions that write the user's
(`overlayTargetOf`). The page shown while editing for a role is the page as
the role sees it: the host resolves with the application's roles up to it and no
user overlay. `usePageToolbar` offers the roles the host lists
(`knownRoles`, `roleChoice`); `usePageViews` lists a held role's templates
as the role's (`PageViewChoice` of kind `"role"`, with the role's name)
and, editing for a role, chooses, saves, renames and deletes the role's
own, writing through the same `overlayTargetOf`. Add is locked for a role
(`AddLock` `"role-view"`): a role's layout places the widgets the shared
page has. The editing hook's `templateChoice` offers the editing cell's
widget templates as the role's choice (`TemplateChoice`).

Breaking since 6 November 2026: `PageViewsInput.withUserOverlay` and
`PageEditingInput.withUserOverlay` are gone (the target says it);
`PageToolbarInput.roles` is `knownRoles`; a layout change the engine
refuses throws from `changeLayout` instead of warning on the console.

## Export page

The WHOLE shared page as one file (doc/ADR/0011-pages-as-code.md): the
engine's `pageFile` — the page's prebuilt templates, its `on`, the widget
templates its cells reference down into its containers, and the route your
application gives it — as `<page>.page.json`. `usePageExport` takes the
registries, the shared tree, the page, the route (optional), the edit lock
(exporting is an administrator's act and waits for the permission like Edit
page) and, optionally, `save(fileName, text)` — the browser's download
unless you say otherwise (`downloadTextFile`). It opens a panel with the
text and downloads it; nothing is committed, the user's overlay never
travels. A developer merges a received file into the application's view
models with the engine's `mergePageFiles([file], viewModels)`.

## Hooks

- `useWidgetForm` — one field per input port, per primitive setting — and
  for a NAMED LIST (a tabs widget's tabs, a collapse's panels: entries with
  a key and a label, kind `items`) a row per entry, added, named and
  removed (`addItem`, `removeItem`, `setItemLabel`, `setItemValue`), the
  key made from the label and the entry's layout kept behind the row —,
  and per event its reactions: the write-back the event does by default (shown,
  following the port's path) and a list of rows, run in order, each `set` a
  path from a payload field or `call` an action with its declared
  parameters (`addReaction`, `removeReaction`); and the CONDITION under
  which the widget shows (doc/ADR/0008-conditions.md) as rows of a path, a
  check picked from the predicate registry by its phrase — or the
  `CONSTRUCTOR`, a tree of groups (and / or, negated, nested as
  parentheses) and tests built step by step (`editConstructor`, `editTree`,
  `TreeEdit`) and saved as the words the engine reads —, the value it
  takes and when/unless (`conditions`, `predicateChoices`, `testChoices`,
  `conditionPaths`, `addCondition`, `removeCondition`, `setCondition`),
  every row gating submit until it holds together, and how the widget
  appears and disappears as the condition changes (`appear`, `disappear`,
  `appearChoices` — the names of the `appearances` registry given, the
  standard ones alone otherwise —, `setAppear`, `setDisappear` — saved
  only with a condition); `collect()` gives bindings (`inputs`, `on`,
  `when`, `appear`, `disappear`) and settings, the default never among
  them, and `templateOf` writes them into a template.
- `useWidgetBuilder` — a widget choice with generated input paths on top of
  the form; `add` hands the result to the host.
- `useWidgetSearch`, `usePalettePress` — the palette's search and card presses.
- `useWidgetEditor` — the form prefilled from a placed widget.
- `usePageEditing` — the edit session: layout changes, widget edits and
  removals as pure ops replayed over the live trees, committed on Save;
  `wrapCell(cellId, widget)` puts a cell into a new container. The ops
  themselves are `page-edits.ts`, pure functions of an `EditContext` (the
  location, the widgets, the naming, the shown view) and plain trees —
  `changeLayoutOp`, `removeCellOp`, `wrapCellOp`, `saveWidgetOp`,
  `setCellViewOp`, and `plannedInput` for the shown layout's plan — so the
  routing by target and location is tested without a hook. With `at`
  (doc/ADR/0009-containers.md — a chain of containers, `card-1`,
  `tabs-1/tabs.0.content`) the session edits the layout INSIDE a container's
  template, shown as the page under its nested name (`layoutPage`); every
  op remembers where it was made, and a host saves or cancels the session
  before it changes `at` (a session is one layout's); a location inside a
  container is the shared page's (keep `at` clear while the overlay is on).
- `useBuilder` — the layout being built (the page, or the one `at` a chain),
  its engine choice while it is empty, and placing a widget — a container's
  layouts started empty on the same engine, its cell appended tall, and
  `onAdded` told the id and those layouts so a host can open it at once.
- `useLayoutNavigation` — moving between the page and the layouts INSIDE its
  containers: given the host's `at` state and its Save page, it returns
  `goTo` (a breadcrumb's step), `editLayout` (for `PageView`'s
  `onEditLayout`: "Edit content" opens the layout inside in edit mode),
  `onAdded` (for `useBuilder`: a container just placed opens at once),
  `adding` (whether to offer the palette here) and `addAt` (`useBuilder`'s
  `at`). Every move saves the open session first; widgets are added inside
  a container on the shared page only.
- `usePageToolbar` — what the toolbar above a page offers: the breadcrumb
  from the page down to the layout shown (`crumbs`, `goTo`), the engine
  choice, Edit / Save / Cancel with the pending count, the overlay switch and
  where edits go, each lock as a reason.
- `usePageViews` — the page's views: the list with each one's kind, the
  shown one, choosing another, Save as / Rename / Delete / Share / Import and
  the panel they open.
- `usePageExport` — the whole shared page as a file to download and hand to
  a developer: `canExport`, the panel with the text, `download`.
- `usePathCombobox` — autocomplete over existing store paths.
