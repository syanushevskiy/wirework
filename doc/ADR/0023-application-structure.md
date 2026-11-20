# ADR-0023: The structure of an application that uses Wirework — the demo as the reference

- **Status:** Proposed — not built
- **Deciders:** the product owner

## 1. Decision

Proposed; nothing is built, and the demo is changed after the owner
chooses. For an application heading to forty pages: AREAS — a part of the
product one team owns, with `shared/` for what two areas use, and lint
holding "an area never imports another area". Under about fifteen pages
with one team: Structure 1 (declarations with the page, code by kind).
Structure 2 (the page as a slice) is declined at any size.

## 2. Problem

The owner asked for the structure of a project that USES the library, with
the demo as its reference implementation: how a page is laid out as a
folder; where the actions, widgets and styles of one page go and where
those shared between pages go; what the menu and the routing look like.
The project may be big — forty pages.

Five questions follow — the page's folder, actions, widgets, styles, menu
and routing — each with three answers. They are not independent (where
actions live decides what a page's folder holds), so they are also put
together as three whole structures.

What the engine fixes, whatever the folders:

- The widget and action registries are global and sealed at boot. The
  builder's palette offers every type on every page and saved views name
  types globally: nothing is "of one page" to the engine.
- An action's name and a widget's type are stored data. Renaming one is a
  migration (ADR-0017).
- A page id is its folder's name; store roots, `widgets.<page>.*` and
  `data-page` key on it.

## 3. Details

### Proposed

- **Areas** for an application known to grow to forty pages, with the demo
  regrouped into three of them as the reference. It is the one structure
  whose rule ("what a team owns") stays true as pages are added, and it is
  where Structure 1 ends up anyway, by a harder road.
- **Structure 1** for an application that stays under about fifteen pages
  with one team. It is also the first step on the way: the split into
  `host/`, `devtools/` and the rest, `page.ts`, a folder per widget,
  `navigation.json` and the checks are the same in both — only where the
  application's code is filed differs.
- **Structure 2** declined at any size: its rule contradicts how the
  engine scopes names, and its cost rises with every page.

### Areas

An AREA is a part of the product one team owns: its pages, the actions and
the API client behind them, the widgets and cells only it needs.

```
src/
  host/            boot.ts router.tsx page-visit-view.tsx   ← the template
  devtools/                                                 ← deletable
  theme.ts  wirework.css
  install.ts       the list of areas, in order — one line an area
  navigation.json  sections, order, nesting, home — one line a page
  shell/           app.tsx app.css use-menu.ts
  shared/          what two areas use — and nothing else
    session/       session-api.ts session-loader.ts
    api/           transport.ts
    actions/       nav.ts
    widgets/       index.ts  cells/copy/  code-editor/
  areas/
    runs/
      index.ts     install(registries, services); the area's pages
      actions.ts   → actions/ when it outgrows a file; names `runs/*`
      predicates.ts
      api.ts       fake/runs-server.ts
      widgets/     status-badge/  cells/run-status/
      pages/
        pagination/     page.json viewModel.json roles.json widgets.json page.ts
        infinite-list/  …
        run/            …
      __tests__/
    account/
      index.ts  actions.ts          names `settings/*`
      pages/    settings/  roles/
    showcase/
      pages/    flexlayout/  editor/
```

- **One rule of dependency, held by lint:** an area imports `shared/` and
  the library, never another area; `shared/` imports no area. A PAGE
  imports nothing — its JSON names actions and widget types, and a page of
  one area may name another area's action (`runs/retry` on a dashboard):
  the name is checked, no import is made.
- **`page.ts` is a page's only code:** its starting state, what runs when
  it opens, a check of its route's params, and its bridge as
  `connect(bus, store)`.
- **Names do not follow the folders' moves.** An action's namespace is its
  area's domain (`runs/*`) and stays when a file moves to `shared/`. A page
  id is its folder's name and unique across the application (boot refuses
  two); its address is said in `page.json`, so a page moved to another area
  keeps both.
- **Promotion is rare and coarse:** from an area to `shared/`, when a
  second AREA needs the code — not when a second page does.
- **A piece of work touches its own area.** A new page is a folder and one
  line of `navigation.json`; a new area one line of `install.ts`.
- **An area lifts out.** Since it imports only `shared/`, it can become a
  workspace package the day a team wants its own build and tests, without
  a file changing inside it.
- **The demo shows it small:** `runs` (three pages over one server),
  `account` (settings, roles), `showcase` (FlexLayout, the editor).
- **Weakness:** "which area?" is a judgement for a page that serves two (it
  goes where its owner is), and three areas for seven pages is more
  folders than the demo needs for itself. About four days.

### What forty pages need whichever structure is chosen

These are the host's and the engine's, not the folders'.

1. **A page's folder loaded with its route.** Every page's JSON is in the
   entry chunk (`import.meta.glob` eager). Loading it in the route's
   loader needs the saved-views door (`upgradeTrees` over
   `allViewModels()` at session open) moved to the page's opening.
2. **Every page checked in CI, not when somebody opens it.** A page's
   trees go through the door when the page OPENS; nobody opens forty.
   `pnpm pages:check` (ADR-0014, not built) resolves every folder against
   the registries; `check:actions` beside it reports a `call` nobody
   registered and an action nobody calls.
3. **The lists of pages derived, never kept.** The page-name type, the
   starting data, the opening code and the e2e addresses come from the
   folders (`page.ts`, a glob); `navigation.json` is the one list a person
   writes.
4. **`scope` on actions** (ADR-0005 phase 4). With eighty actions the
   builder's picker is unusable unsorted, and any page calling any action
   as the viewer (ADR-0019 finding 2) is not a small finding. An area's
   `install` is where its actions get their scope.
5. **Store roots by rule.** A page's data root is its page id; what an
   area's pages share is under the area's name. `demo.counter` is started
   by two pages each for itself — a collision waiting at forty. Boot can
   check a page's starting state against the rule.
6. **Actions cannot be loaded late.** A widget's component can (`load`,
   ADR-0018); an action's handler and its API client cannot. The same
   `load` on an action's definition — name and `params` registered at
   boot, the handler fetched on first call — is a record of its own.
7. **The same template on many pages.** A table's columns repeated over
   ten pages are copied ten times. A shared template root needs its own
   record.
8. **One chain of migrations, several teams.** The application's data
   format is ONE number (`app`, ADR-0017); two areas adding a step in the
   same week collide. Either the number is taken by the pull request that
   merges first, or the owners of formats become the areas — for the owner
   of ADR-0017 to say.
9. **The menu needs depth.** Thirty-five entries want sections, sub-menus
   and a search: antd's `Menu` in place of the `NavLink`s stops being a
   matter of taste.

### How it is tested

- No scenario changes: the e2e suite reads pages by address and test id.
  `PAGE_PATHS` becomes derived from the page folders.
- `pnpm check:actions` (new, part of `pnpm check`) reads every page's
  JSON, fails on a registered action nobody calls and prints which page
  calls what; an unknown `call` stays a boot error.
- `pnpm check:bundle` takes a list of lazy widgets instead of one mark.
- Lint holds the area rule and the lazy boundary (only a widget folder's
  `index.ts` and `contract.ts` are imported from outside).
- Boot refuses a `navigation.json` that names a page with no folder or
  names one twice.

### Consequences

- `packages/view-data-models-examples` stops holding `DEMO_PAGES` and
  `demoPageData`; it keeps the people, the servers' seed and the
  failure-path fixture.
- `boot.ts` takes the pages and the installer as arguments and imports
  nothing of the demo.
- `route.menu` leaves `page.json` (answer 5A) — a field of a file the host
  owns, which Import page ignores already.
- Renaming `reset-counter`, `log-event` and removing `clear-selected-run`
  is the demo's data format 3 (ADR-0017: a step, a corpus folder, a line).

### Phases

1. The split of `src/` (`host/`, `devtools/`, the rest) and `boot.ts`
   freed of the demo; `page.ts` and the starting data into the folders.
2. Actions by namespace out of `install.ts`; `check:actions`; the dead
   action and the unloaded presets file removed.
3. A folder per widget; the lint rule; the bundle check's list.
4. `theme.ts`, `wirework.css`, CSS beside its owner.
5. `navigation.json`, `useMenu`, derived `PAGE_PATHS`; then, apart, pages
   loaded with their routes.

### For the owner to decide

1. **The structure:** 1, 2 or 3 — 3 as areas if the application is to
   reach forty pages — or another mix of the fifteen answers. With areas:
   are the demo's three (`runs`, `account`, `showcase`) the right cut, and
   do pages live INSIDE their area or stay in one `pages/` grouped by
   section?
2. **The three bare action names:** renamed now (data format 3) or left.
3. **`scope` on actions** (ADR-0005 phase 4, ADR-0019 finding 2): built
   with this, or the check script alone.
4. **The bridge:** can `row-selected` → `pagination.selected` be a plain
   reaction? If so the reference has no bridges at all. Not verified.
5. **`page.css`:** allowed in its scoped form, or a page has no CSS.
6. **The menu:** antd's `Menu` (sub-menus and icons for nothing, its own
   DOM in the suite) or the `NavLink`s kept; a role-hidden entry as a
   condition in `navigation.json`, a list from the session, or both.
7. **An unknown address or a param that fails its check:** home, as now,
   or a "no such page" result.
8. **Widget type names:** bare (`status-badge`) or prefixed
   (`demo-code-editor`) — before teams copy, since a rename is a
   migration.
9. **Unit tests in the application:** a vitest script for the reference,
   or e2e as its only proof.
10. **The appearance's keyframes:** should the registry take a keyframes
    name, so a host stops writing in the `ww-` namespace (a library
    change).
11. **Which of the nine needs come with the rebuild** — pages loaded with
    their routes, `pages:check`, the store-root rule — and which get
    records of their own (actions loaded late, shared templates, the
    migrations' chain across teams).

## 4. Options weighed

### What there is

- **A page's things are in six places:** its four JSON parts in
  `apps/playground/src/pages/<page>/`; its starting data in another
  package (`demoPageData`); its opening code in `demo/pages.ts`; its
  actions in `actions/*.ts` or inline in `demo/install.ts`; its widgets
  across `contracts/`, `hooks/` and `widgets/`; its event bridge in
  `hooks/use-demo-bridge.ts`.
- **The host template is not separable from the demo.** `boot.ts` imports
  `DemoPage` and `installDemo`; the dev tools share `components/` and
  `hooks/` with the application's cells.
- **Adding a page touches five places in three packages:** the folder,
  `DEMO_PAGES`, `demoPageData`, `demo/pages.ts`, and `PAGE_PATHS` in the
  e2e suite (a hand copy of the addresses); `DEMO_HOME` when the first
  page changes.
- **Fifteen actions and two predicates go through one 280-line
  `demo/install.ts`** that also builds the fake servers, the transport,
  the widgets, the engines and the migrations. Three names have no
  namespace (`reset-counter`, `log-event`, `clear-selected-run`); the last
  is called by nobody, and nothing detects that. `demo/action-config.ts`
  is loaded by nobody.
- **Most actions are called by one page, but their names are DOMAIN
  names** (`runs/retry`, `archive/set-favorite`) — which is why they
  survive a page being renamed.
- **One widget is spread over three folders** (the lazy code editor: five
  files); its lazy boundary is a comment and one hardcoded mark in
  `scripts/check-bundle.mjs`.
- **A widget TEMPLATE cannot be shared between pages:** it is copied into
  each page's `widgets.json`, and the store holds one page's models at a
  time.
- **`index.css` is 157 lines in four groups** (shell, page frame, an
  appearance's keyframes, dev tools) with no page-specific rule. The host
  has no antd theme, and what the library needs from the host's CSS is not
  said in one place.
- **The menu is flat `NavLink`s in `App.tsx`**, computed outside React, so
  a role cannot hide an entry. A route's loader writes
  `route: { path, params }` unchecked.
- **The e2e suite imports nothing from `apps/playground/src`** and the
  playground has no unit tests: moving files there is low-risk.

### The five questions, three answers each

All finalists split `src/` into `host/` (the template: boot, router, page
visit — no import of the demo), `devtools/` (deletable as a folder) and
the application's own code.

#### 1. The page's folder

Dropped early: leave it (a team copying it cannot tell template from
demo); a workspace package per page (ceremony, given sealing at boot);
discovery by glob (the order of registration becomes invisible).

- **1A. Declarations and data.** The folder holds what DESCRIBES the page:
  the four JSON parts and one `data.ts` (starting state, what runs when it
  opens). All code is the application's, by kind. About 15 files moved, 8
  edited. Weakness: `run/load` lives three folders from the run page.
- **1B. The page as a slice, shared by kind.** The JSON, one `page.ts` and
  the page's own code beside it; `shared/<kind>/` for what two pages use.
  A thing moves to `shared/` in the commit that brings its second page; a
  page never imports another page (lint). About 30 of 45 files moved.
  Weakness: registration stays global, so the locality is a convention,
  not the engine's.
- **1C. The page as a slice, shared by domain.** As 1B, but shared code is
  filed under the business thing it serves (`domains/runs/`). About 35
  files. Weakness: the demo has one domain, and the "copy" cell belongs to
  none.

#### 2. Actions

Dropped early: a hand-written list per page of the actions it may call (a
second source of what the JSON says; `scope` is the declared form);
registration by glob (order and services become implicit).

Common to all three: a name's namespace is the DOMAIN, never the page;
every application action has a namespace; a library action is registered,
never wrapped; `pnpm check:actions` answers "which actions does this page
use".

- **2A. By kind.** `actions/<namespace>.ts`, `predicates/`, `presets/`,
  `bridges/`, `api/` with `api/fake/`; `install.ts` calls each factory.
  About half a day. Weakness: a page and its one action in two trees.
- **2B. By domain.** `domains/<namespace>/` holds its actions, predicates,
  presets, the API client and its fake, and exports one
  `install(registries, services)`; the namespace in a `call` IS the
  folder. About a day. Weakness: one more idea beside "page", and pure UI
  helpers (`filters/sync-suites`) have no domain.
- **2C. With the page.** `pages/<page>/actions.ts` and `bridge.ts`, shared
  ones in `shared/actions/`. About a day plus `scope: { pages }` built, or
  it is only a convention. Weakness: `runs/retry` and
  `runs/delete-selected` split one server client across two folders.

#### 3. Widgets

Dropped early: by kind as now (three folders per widget, the lazy boundary
invisible); discovery by glob (a stray folder registers itself);
registration per page (ADR-0018 declined it).

- **3A. A folder per widget, one list.** `widgets/<kind>/` holds
  `contract.ts`, the hook, the render-only component, its CSS and
  `index.ts`; `cells/`, `toolbar/`, `row-actions/`, `appearances/`
  likewise; `widgets/index.ts` is the one list the install reads. The lazy
  rule becomes a folder rule lint holds. About 11 moves, no type renamed.
  Weakness: a widget one page uses sits far from it.
- **3B. With the page, promoted on second use.**
  `pages/<page>/widgets/<kind>/`, the list still global. Weakness: the
  place lies about the scope — the palette offers the type on any page —
  and an admin who adds it to a second page triggers a move nobody makes.
- **3C. A package of the application's widgets.** `packages/app-widgets`
  with 3A inside; gains a test script and stories. Weakness: ceremony for
  two widgets; the step for when a second application appears.

Under all three, templates stay per page (`widgets.<page>.*`); pages share
a widget's code and its contract's defaults.

#### 4. Styles

Dropped early: one global file (it mixes four concerns); CSS Modules
(hashed names cannot write `@keyframes ww-drop` or target
`.ww-page[data-page]` without `:global`); Tailwind (nothing new since
ADR-0010).

Common to all three: the antd theme is ONE `theme.ts` given to a
`ConfigProvider`, and the application's CSS reads `--ant-*` and types no
colour; what the library needs from the host is one named section with
the ADR beside each rule; a lazy widget's CSS is imported by its
component.

- **4A. Beside its owner.** `shell/app.css`, `devtools/*.css`,
  `widgets/<kind>/<kind>.css`, `wirework.css` (the library's sheets in
  order, then the host's duties). A page's own look, if ever needed, is
  `pages/<page>/page.css` with every selector starting
  `.ww-page[data-page="<page>"]`: look only, never placement. About two
  hours. Weakness: `page.css` is a door to layout no view, role or builder
  can see.
- **4B. One ordered `styles/` folder.** `wirework.css`, `tokens.css`,
  `shell.css`, `devtools.css`, `pages.css`. About an hour. Weakness: a
  deleted component leaves its CSS behind, `pages.css` becomes a heap, and
  the lazy widget's CSS is the exception.
- **4C. Tokens only.** The shell rebuilt from antd's `Layout` and `Menu`,
  no page CSS at all — a look is a widget setting, a template or a widget.
  About a day; the e2e ids on the menu and `.pg-sign-in` must survive.
  Weakness: "this page's header in the brand colour" has no home.

#### 5. Menu and routing

Dropped early: an order number in each `page.json` (a reorder edits
several pages); the menu as a Wirework widget (navigation editable by a
user's overlay — ADR-0019); the menu sent by the server (kept only as a
FILTER: a list of hidden entries with the session).

Common to all three: a hidden entry is presentation only — the address
still opens and the server refuses the data; `/` and an unknown address
lead home; `PAGE_PATHS` is derived.

- **5A. One `navigation.json` beside the pages.** `page.json` keeps the
  address and the title (and `parent` for a page reached by link):

  ```json
  {
    "home": "pagination",
    "menu": [
      {
        "section": "demo app",
        "items": [
          { "page": "pagination", "icon": "table" },
          { "page": "infinite-list" },
          { "page": "settings", "items": [{ "page": "roles" }] },
          { "page": "flexlayout" },
          { "page": "editor", "show": { "role": "admin" } }
        ]
      },
      { "section": "tools", "items": [{ "page": "builder" }] }
    ]
  }
  ```

  Order is the array's, nesting is `items`; `run` is absent, so reached by
  link only. Boot checks every id is a folder, none twice. About half a
  day. Weakness: two files speak of one page.

- **5B. One typed `routes.ts`.** Path, title, menu, nesting, role and a
  check of the params in code; typed `pathTo("run", { runId })`;
  `page.json` loses its route. About half a day and an amendment to
  ADR-0011. Weakness: an exported page does not say where it lives, and
  "New page…" in the builder is not one folder written.
- **5C. Folders are addresses.** `pages/demo/runs/[runId]/`. One place per
  page. About a day and a half. Weakness: the page id stops being the
  folder's name, while store roots, `widgets.<page>.*` and `data-page` key
  on it.

### The three whole structures

#### Structure 1 — Declarations with the page, code by kind

```
src/
  host/           boot.ts router.tsx page-visit-view.tsx use-host.ts   ← kept by every application
  devtools/       state inspector, event log                           ← deletable
  theme.ts
  wirework.css    the library's sheets, then what the host owes it
  navigation.json
  install.ts      the explicit lists, nothing else
  shell/          app.tsx app.css use-menu.ts
  session/        session-api.ts session-loader.ts
  api/            transport.ts   fake/ runs-server.ts …
  actions/        runs.ts archive.ts settings.ts filters.ts nav.ts debug.ts
  widgets/
    index.ts
    status-badge/   contract.ts use-status-badge.ts status-badge.tsx index.ts
    code-editor/    contract.ts use-code-editor.ts code-editor.tsx code-editor.css index.ts
    cells/copy/  cells/run-status/  appearances/drop.ts drop.css
  pages/
    pagination/   page.json viewModel.json roles.json widgets.json page.ts
    run/          page.json viewModel.json roles.json widgets.json page.ts
```

(1A with a `page.ts`, 2A in 2B's `install` shape, 3A, 4A without any
`page.css`, 5A.)

- **Rule:** the page's folder says what the page IS; code is filed by what
  it is and named by its domain. Nothing moves because a second page
  started using it.
- **Why:** it is how the engine already scopes things. The least code and
  the least to explain.
- **Cost:** about two days, mostly moves; one data-format step if the
  three bare action names are renamed.
- **Weakness:** to read everything the run page does, one opens its folder
  AND `actions/runs.ts`; `check:actions` prints the map.

#### Structure 2 — The page as a slice

```
src/
  host/  devtools/  theme.ts  wirework.css
  shared/
    install.ts
    actions/    nav.ts debug.ts
    widgets/    cells/copy/ status-badge/
    api/        transport.ts fake/…
    shell/
  pages/
    index.ts        the list of page modules: the menu's order, the page-name type
    pagination/
      page.json viewModel.json roles.json widgets.json
      page.ts  actions.ts  bridge.ts
    run/
      page.json … page.ts  actions.ts
    editor/
      page.json … page.ts  code-editor/
```

(1B, 2C, 3B, 4A with `page.css` allowed, the menu's order in
`pages/index.ts` or 5A.)

- **Rule:** a thing lives with its page while one page uses it, and moves
  to `shared/` in the commit that brings the second.
- **Why:** everything about a page is in one folder; deleting a page is
  deleting a folder.
- **Cost:** about three days, and `scope` built in the engine for the
  locality to be more than a convention.
- **Weakness:** the place says "of this page" while the registry, the
  palette and saved views say "of the application"; a promotion is a move
  somebody has to notice.

#### Structure 3 — Domains

```
src/
  host/  devtools/  theme.ts  wirework.css  navigation.json  install.ts
  app/        shell/ session/ nav/
  domains/
    runs/     actions.ts predicates.ts api.ts fake-server.ts
              status-badge/ cells/run-status/  index.ts → install(registries, services)
    archive/  actions.ts index.ts
    settings/ actions.ts index.ts
  widgets/    cells/copy/ code-editor/        ← what no domain owns
  pages/
    pagination/   four JSON + page.ts
    run/          four JSON + page.ts
```

(1C, 2B, 3A inside the domains, 4A, 5A.)

- **Rule:** code is filed under the business thing it serves; a page only
  consumes. A real application swaps `fake-server.ts` for `api.ts` in one
  place per domain.
- **Why:** it is what a large application grows into; an action's
  namespace is its folder.
- **Cost:** about three days.
- **Weakness:** the demo has one domain, so "which domain?" is a judgement
  per file; and the pages stay in one `pages/`, apart from the code that
  serves them. Areas (section 3) are this structure with the pages inside
  and the unit made what a team owns.

### The demo's numbers, carried to forty pages

Measured on the seven pages and multiplied; a real application will
differ, the order of size will not.

| What                                    | Now (7 pages)       | At 40 pages                 |
| --------------------------------------- | ------------------- | --------------------------- |
| Page JSON, all of it in the entry chunk | 61 kB (9 kB a page) | about 350 kB                |
| Application actions                     | 13 (2 a page)       | 75–90, in 10–15 namespaces  |
| Lines registering them in one file      | 281 (`install.ts`)  | not one file any more       |
| Hand-kept lists of pages                | 4, of 7 entries     | 4, of 40 entries            |
| Folders directly under `pages/`         | 7                   | 40                          |
| Menu entries in one flat row            | 6                   | 35–40: sections and nesting |
| People changing it at once              | one                 | several teams               |

The entry chunk is 2,169 kB (budget 2,400), so forty pages' JSON alone
would be a sixth of it — and every action and API client of every page
with it, since only a widget's component can be loaded late.

### What gives way first

- **Structure 1** holds to about fifteen pages. Past that
  `actions/runs.ts` is five hundred lines and becomes a folder — Structure
  3 arrived at by accident, one namespace at a time, with its API client
  still in `api/` and its cells in `widgets/`. `pages/` is forty folders
  with nothing saying which belong together. NO FOLDER IS A TEAM'S: any
  file may import any other, and a rule of who reviews what needs forty
  lines. `install.ts`, `widgets/index.ts` and `api/` are touched by every
  piece of work.
- **Structure 2** gets worse with every page. The share of things two
  pages use only rises — three pages over one server's runs already split
  its client's actions across three folders — so `shared/` grows into
  Structure 1 while half the code stays in pages. Every promotion is a
  move somebody must notice, and at forty pages the cheaper thing is to
  copy the action. That is the failure this structure invites.
- **Structure 3** is the only one whose weakness SHRINKS with size: "the
  demo has one domain" is not true of forty pages, and its unit is what a
  team owns. What it lacks is the pages beside their code — which areas
  add.
