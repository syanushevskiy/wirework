# Playground — a routed demo application, one builder page

| Part | Status |
|---|---|
| Router (react-router), a page visit per navigation | built |
| Demo application: overview, runs, one run, settings | built |
| Global state + fresh page state behind one store (`layerStores`) | built |
| Navigation as actions (`nav/go`, `runs/open-selected`) | built |
| Route parameters in the store (`route`) | built |
| A permission from global state gates "Edit page" | built |
| Persistence of global state across reloads | not built (W24) |
| Navigation guards, query parameters as state, nested layouts | not built |

## Motivation

One hard-coded "demo" page could show widgets, but not an APPLICATION: no
addresses, nothing handed from one page to the next, no state that belongs
to the user rather than to a page. The playground is now a small routed
application plus the builder, which stays a single page.

## Addresses (`apps/playground/src/routes.ts`)

| Address | Page (`viewModels.pages.<page>`) | Menu |
|---|---|---|
| `/demo` | `overview` | yes |
| `/demo/runs` | `runs` | yes |
| `/demo/runs/:runId` | `run` | no — opened from the runs list |
| `/demo/settings` | `settings` | yes |
| `/builder` | `builder` | yes |

`/` and unknown addresses redirect to `/demo`.

## Two kinds of state, one tree

| | lives | starts over | holds |
|---|---|---|---|
| **Global** (the application's) | one store per application session | when the user comes back from the builder, or reloads | `app` (user, permissions, settings, lists), `viewModels`, `userViewModels` |
| **Page** (a visit's) | one store per visit | on EVERY navigation, the current page included | the page's own data (`demo`, `runs`, `run`, `filters`, `overview`) and `route` |

`layerStores({ page, shared, sharedRoots })` (`@wirework/store`) puts both
behind one `Store`: the first segment of a path decides the layer. Widgets,
reactions and actions never know — a view model binds `app.user.name`
exactly like `runs.data`, and a reaction `set`s `app.settings.pageSize`
like any data path. The state inspector shows (and replaces) one tree.

Why two stores rather than "replace everything but `app`" in one: a request
still in flight when the user leaves must resolve into a store nobody shows
any more — never into the next page's state. A visit's store is simply
dropped.

Why the configuration is global: a real host loads an application's view
models and the user's overlay once, not per page; an edit of a page (shared
or personal) must still be there after a look at another page.

Everything reaches the store through a visible step. The session (user,
permissions, global lists) arrives with a mock request when the application
starts; a page's server data with the page's own request when it opens.

## A visit per navigation

Every page route has a LOADER, and the loader opens the visit
(`boot.ts`: `openDemoPage`, `openBuilder`). The router runs it for a menu
click, Back/Forward, a deep link, an action's `nav/go` — and for a click on
the page already shown. The visit is therefore created once per navigation,
outside rendering (StrictMode renders twice; a loader runs once). The page's
opening side effects (`visit.start()`: the session request, the page's
first request) still run in an effect, idempotently.

The route element is keyed by the visit, so all UI state of the visit's view
(edit session, overlay toggle, inspector draft, event log) starts over with
it; which diagnostics panels are open is remembered across visits.

## The router and the pages

- **What a page loads is configuration** (`widget-events-design.md`, "Page
  events and load events"): the overview and the run page declare it as the
  PAGE's own `load` reaction (`viewModels.on.overview.load` →
  `overview/load`, `on.run.load` → `run/load`); the runs list as its TABLE's
  `load` reaction (`table-view/load` with the URL). The host's `onOpen` code
  runs before them and holds only what the application knows: the fake
  server starting over, the runs page seeded from the user's settings.
- **Parameters in**: the host writes what the router matched to `route`
  (`{ path, params }`) in the visit's initial state. The run page's loader
  code reads `route.params.runId`; a widget can bind to it like any path.
- **Navigation out**: a page never touches the router. `nav/go` takes
  `with: { to: "/demo/runs" }`; `nav/follow` goes where the event's `href`
  points (the runs table's `#` and Name cells are links to
  `/demo/runs/{id}`, `table-view-design.md`, "Customizing a table");
  `runs/open-selected` reads `runs.selected` and opens `/demo/runs/<id>`.
  All get a `Navigator` — a host service, the same factory pattern as the
  fake server (`actions-design.md`). This is W16's navigator in its
  smallest form. Every address is checked to be the application's own.
- **The host's own table cell**: boot registers the antd widgets with one
  cell renderer of this app, `run-status` (`src/widgets/run-status-cell.tsx`
  — the state as a tag with the run's message in a tooltip), through
  `createAntdWidgets({ tableCells })`; a column selects it with
  `cell: { kind: "custom", name: "run-status" }`. The demo's Status column
  uses the predefined `tag` kind instead — the no-code way.

## Global state at work (what the demo shows)

- Settings page writes `app.settings.*` through ordinary reactions; the
  overview greets by `displayName`; the runs loader takes its page size
  from `pageSize`; the runs page starts its refresher from `autoRefresh`.
- `app.lists.applications` feeds the runs page's Applications filter.
- `app.permissions.editPages === false` disables "Edit page" (only an
  explicit `false` forbids: the builder has no global state).

## Known limits

- Global state is lost on reload — persistence is W24.
- A user's own page template is a copy; see `builder-user-needs.md`, risk 3.
- The fake server's timeline starts over whenever the runs list opens, so a
  run's page can show a later status than the list did.
