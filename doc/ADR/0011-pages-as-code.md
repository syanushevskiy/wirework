# ADR-0011: Pages as code — an admin builds a page in the builder and lands it in the application's source

- **Status:** Accepted — partly built (the file, Export page, Import page, the page folders)
- **Date:** 2026-11-04
- **Deciders:** the product owner

Designed 4 November 2026, at the product owner's ask. Status: designed
(story WW-29); its first step — the page file format, the pure functions
and "Export page" (answer A) — built 5 November 2026 (story WW-30), see
"Built" at the end.

## Description

"An admin user creates a page using the builder and saves it in the app
code. How should the process look?" The page a builder makes today lives
in the store of one browser tab: the host's `save` in the playground only
counts the saves (`use-playground.ts`, `persist`), and a reload starts
from the fixtures. The product owner wants the page to end up where the
application's own pages are — versioned with the application, reviewed,
released, present in every environment — without a developer typing it
in.

## What there is

- **The pages are a TypeScript module.** `demoViewModels` in
  `packages/view-data-models-examples/src/index.ts` is one object of 1 200
  lines: `pages` (a page's templates), `widgets` (the widget templates the
  cells point at, grouped by page name by convention: `widgets.cards.*`)
  and `on` (a page's own `load` reactions). The host loads it whole into
  the session store (`demo/pages.ts`, `demoSessionState`). Routes are code
  too: `routes.ts` names each page's path, title and menu entry;
  `demo/pages.ts` gives each page its initial data and an optional `onOpen`.
- **One write path.** Everything the builder changes goes through
  `commit` (`packages/builder/src/use-commit.ts`): the store is written,
  then the host's `SaveTrees` is called with both trees as they now stand,
  in order, one save at a time. The doc comment already says what a real
  host does there: "writes the trees somewhere and reads them back when it
  boots". Nothing writes a file today.
- **A file format exists for one view** (doc/ADR/0006-page-views.md, "The
  file"): `wirework-page-view` v1 carries one page template. Share and
  Import move it through the clipboard. It does not carry the widget
  templates the cells reference, so a page shared this way "ships without
  its widgets" — the bundle question doc/ADR/0009-containers.md left open.
- **Boot validation** (`validateViewModels`) checks every template against
  the registered widgets, engines, actions, predicates and appearances and
  reports `rejections`; the playground shows them above the page. A page
  file is checkable before it is loaded.
- **Permissions.** `app.permissions.editPages` gates every edit; the demo's
  session grants it. There is no notion of an authoring environment versus
  production yet.

## Options considered

How does a page built in a browser become a file in the repository, and
how does a developer-free admin get it there?

**A. Download a file, a developer commits it.** The builder gets an
"Export page" button; the admin saves `inventory.page.json` and sends it
to a developer, who drops it in the right folder. Honest and zero
infrastructure. Rejected as THE process: it reintroduces the developer
for every change, loses the admin's name on the commit, and invites
copies that drift. Kept as the fallback for a host without the dev-server
plugin — and, at the product owner's ask on 5 November 2026, BUILT FIRST:
a product owner, a QA or another developer builds a page, exports it and
sends it to a developer. It is the same file B writes, so nothing of it is
thrown away when B comes.

**B. Write-through from the dev server.** The application is run in an
AUTHORING mode — a developer's `pnpm dev`, or a shared authoring
deployment — in which the host's `SaveTrees` posts the saved page to the
dev server, and a small Vite plugin writes it as a file under `src/pages/`.
Every Save page is a file change in the working tree; the app reloads the
file through HMR; the admin sees the page as users will. From there the
change takes the road every change takes: a branch, a pull request, CI,
review, merge, release. It reuses the one write path, the dev server that
already exists, the validation that already runs, and git as the history.
What it leaves open is the admin who cannot use git — see E.

**C. A page store on a server, pulled into the repo for release.** Pages
live in a database behind an API; the builder saves there in every
environment; a CLI (`wirework pull`) writes them into the repository
before a release. Rejected for now: two sources of truth (the database
and the files) with a sync between them, an API and a schema to run and
back up, and an answer the product owner did not ask for — pages that can
change in production without a release. Noted as the route if "a fix
without a release" becomes the requirement (see "Later").

**D. Generate TypeScript instead of JSON.** Emit `inventory.page.ts` so
the pages stay typed modules like today's fixtures. Rejected: a generator
to maintain, formatted output to keep stable, and nothing gained — a JSON
file parsed by the existing zod schemas at load IS typed, and a file a
machine writes and a human reviews is best kept as data.

**E. A pull request from the browser.** The authoring server commits the
page file on a branch and opens the pull request through the forge's API;
the admin presses "Propose" and gets a link. This is B's hand-off for an
admin without git, and it needs B's file first.

## Decision

**B for the mechanism**: the write-through from the dev server, one JSON
file per page, handed to the code as a branch and a pull request. It is
the smallest thing that gives git the page. The pull request is
acceptable as the hand-off because that is how this organisation ships
everything, and it gives the admin something today's save does not: a
reviewer and a rollback.

**A is kept as the fallback** for a host without the dev-server plugin
and, at the product owner's ask on 5 November 2026, was built first (see
"Built"). **E is the THIRD phase**, after B has proven the file and the
review loop with a developer in the middle — and soon after phase 2,
because admins who do not use git are the admins there are. C is rejected
for now and kept under "Later"; D is rejected.

The minimum is one format, three pure functions, one plugin with two
routes, one loader change and one toolbar line. Everything else ("New
page", "Propose") is UI on top and waits its phase. The toolbar must
always say WHERE a save went.

## The design

### The page file

One file per page, `apps/playground/src/pages/<name>.page.json` (a host
chooses its folder), holding EVERYTHING the page needs that is
configuration — the bundle doc/ADR/0009-containers.md asked for:

```json
{
  "kind": "wirework-page",
  "version": 1,
  "page": "inventory",
  "route": { "path": "/demo/inventory", "title": "Inventory", "menu": true },
  "templates": {
    "default": { "engine": "react-grid-layout", "cells": [ … ] },
    "compact": { "engine": "react-grid-layout", "cells": [ … ] }
  },
  "on": { "load": [ { "call": "runs/overview" } ] },
  "widgets": {
    "widgets.inventory.table": { "default": { … } },
    "widgets.inventory.filter": { "default": { … } }
  }
}
```

- `templates` is `viewModels.pages[<name>]` as it is today — the prebuilt
  views of the page.
- `on` is `viewModels.on[<name>]`.
- `widgets` holds, by model path, every widget template a cell of any of
  the page's templates references — the cells inside containers included
  (`cellsWithin`). A template two pages reference lands in both files and
  must be identical; the loader reports a difference as a boot problem
  (`widget template "widgets.shared.x" differs between pages "a" and "b"`).
  A `shared.page.json` for templates meant to be shared is a follow-up.
- `route` is what `routes.ts` says per page today. It is in the file
  because the builder must be able to make a NEW page without a developer,
  and a page without a route is not a page. It is data the host loads,
  not routing logic: the host's router reads it. The host's code keeps what
  only code can say — `onOpen`, the initial data — by page name, optional:
  a page file without a code counterpart gets the defaults (no own data,
  overlay on).
- Keys are written in a fixed order and the file pretty-printed, so a
  save that changes one setting is a one-line diff for the reviewer.

Pure functions in `@wirework/engine` (`pages-file.ts`, beside `trees.ts`):
`pageFile(viewModels, registry, layoutEngines, name, route)` cuts one
page's bundle out of the trees; `mergePageFiles(files)` builds the
`ViewModels` (and the routes) from many, reporting the conflicts;
`parsePageFile(text)` validates one file with zod and reports what is
wrong in the language of the view-models schema. No React, no I/O: the
same functions serve the dev server, the loader, the CLI check and the
tests.

### The loader (the host)

`demo/pages.ts` stops importing one big object. It reads the folder —
`import.meta.glob("../pages/*.page.json", { eager: true })` in Vite — and
merges the files with `mergePageFiles`; `routes.ts` becomes the merged
`route` entries plus the builder's own. The per-page code (`onOpen` of
runs and history, the page-size seeding) stays as a plain map by page
name next to the loader, so a reader finds in one place what a page's
file cannot say. No glob magic beyond Vite's own `import.meta.glob`.
The fixtures package keeps the builder's empty page, the failure-path
page and the user overlay fixtures; the six demo pages move into six
files, which is also the first test of the format: cut the fixtures into
files, load them back, and the suite must not notice.

### Authoring mode and the write-through

A Vite plugin in the host (`apps/playground/vite/pages-plugin.ts`,
`apply: "serve"` — it does not exist in a production build) adds two
routes to the dev server:

- `PUT /__wirework/pages/<name>` — body: a page file. The plugin parses
  it with `parsePageFile` (a file that does not validate is refused with
  the problems, nothing is written), checks the name
  (`^[a-z][a-z0-9-]*$`, so a name can never leave the folder), writes
  `<pagesDir>/<name>.page.json` atomically (write then rename), and
  answers with the path written. Vite's own file watching reloads the
  loader module.
- `GET /__wirework/pages/<name>` — the file as written, for the e2e suite
  and for a "what is saved" check in the builder.

The plugin is I/O and belongs to the host; it stays in the app until a
second host needs it — a package too early is surface to maintain. The
builder never knows about files: it calls `commit` as today and the
host's `SaveTrees` does the rest.

The host's `SaveTrees` in authoring mode becomes: for every page whose
templates or referenced widgets changed in this commit, `pageFile(...)`
and `PUT`. The user overlay is NOT written: a user's own view is theirs,
not the application's (WW-19 keeps it on a server per user). The playground
knows it is in authoring mode when the dev server answers the plugin's
`GET /__wirework/pages` (a list); without it `SaveTrees` keeps today's
counter and the builder shows "Saved in this browser only" on the toolbar,
and "Export page" (answer A) remains as the way out.

The folder is a plugin option (`pagesDir`), so the e2e suite's own dev
server (port 5174) writes into `e2e/.pages-out/` (gitignored) and never
into the application's source during a test run.

### "New page" in the builder

The builder is one page today, `/builder`, editing `pages.builder`. It
gets a page picker in its toolbar — the pages the loader knows, plus "New
page…" — and the builder's route takes the page: `/builder/<name>`.
"New page" asks for the name (made from the title as a tab's key is made
from its label — `Inventory` → `inventory`, numbered when taken), the
title, the path (`/demo/<name>` suggested) and whether it is in the menu,
and creates an empty page template on the default engine, which the
toolbar lets the admin change while the page is empty, as now. Everything
after that is the builder as it stands: Add, Edit, arrange, Edit content,
Save page. The widget templates the builder makes keep their naming
(`widgets.custom.custom-n` today) but under the PAGE's group:
`widgets.inventory.custom-1`, so a page's templates travel with its file
and two pages' never collide.

### The process, step by step (what the admin does)

The README is to document these six steps for the admin.

1. **Open the application in authoring mode.** On a developer's machine
   that is `pnpm dev`; for admins, a shared AUTHORING deployment runs the
   same dev server on a checkout of the main branch, behind the
   application's login, with `editPages` for admins — a checkout running
   `pnpm dev`, nothing new to operate. Production never runs it.
2. **Build the page.** `/builder` → "New page…" → name, title, path, menu
   → the empty page opens. Add widgets from the catalog, wire them to
   data and actions in the form, arrange them with the engine, put cards
   around them, edit the content of cards, save prebuilt views (Save as
   with the overlay off).
3. **Save page.** Every Save writes `src/pages/<name>.page.json` through
   the dev server. The toolbar says where it went ("Saved to
   src/pages/inventory.page.json"). The app reloads the file; the page is
   in the menu at its route; the admin visits it as a user would, overlay
   on, and comes back to the builder to adjust.
4. **Hand the change to the code.** The file is a change in the working
   tree, like a developer's edit. Phase 2: a developer (or an admin who
   uses git) commits it on a branch and opens the pull request. Phase 3:
   the admin presses "Propose" in the toolbar; the authoring server
   commits on a branch named after the page and opens the pull request,
   and the toolbar shows its link.
5. **CI checks it.** The pull request runs the configuration check — every
   page file parses, merges without conflicts and validates against the
   registries, the same `validateViewModels` the app runs at boot, as a
   unit test that fails the build on the first rejection — then the e2e
   suite. A reviewer reads a JSON diff that says which cell moved or which
   setting changed.
6. **Merge and release.** The page ships with the next release of the
   application to every environment, like any change. In production the
   builder's writes to the shared page are off (no plugin, no endpoint);
   personal views (overlay on) keep working as they do.

### Guards

- The write endpoint exists only in the dev server (`apply: "serve"`),
  writes only under `pagesDir`, only names that match the pattern, only
  files that validate, and refuses bodies over a size limit. It is
  reachable only where the dev server is: a developer's machine, or the
  authoring deployment behind the application's login.
- `editPages` is what gates the builder today and stays the gate; the
  authoring deployment grants it to admins only.
- The file is written atomically and never partially; a failed write is
  reported in the toolbar (`SaveError`) and the page on screen is still
  the saved one in the store, so the admin loses nothing and tries again.
- The e2e suite writes into its own folder, never into `src/pages/`.

### Tests

Three layers.

- **Unit:** `pageFile` / `mergePageFiles` / `parsePageFile` round-trip on
  every demo page, conflicts reported, the name pattern, the plugin's
  handler as a plain function with a temp folder.
- **E2E:** `pages-as-code.feature` — New page, add, save, `the page file
"inventory" holds the cell "custom-1"` through the GET endpoint, reload
  and find it in the menu; a failing save shows its error.
- **CI:** the configuration check as a test every pull request runs, so a
  hand-edited page file cannot break the boot.

The first phase is the fixtures cut into files with the suite green: that
proves the format and the loader before any UI.

## Risks to watch

- **A page fix needs a release.** Pages in the repository means exactly
  that, and it should be decided knowingly: C (a server store) is the
  opposite trade, and some teams want it for dashboards. C stays in
  "Later", not off the table.
- **The authoring deployment runs a DEV server for admins.** It needs the
  application's login in front of it and nothing else exposed, and the
  plugin must be the only writable thing.
- **A widget template copied into two page files will drift** the day
  someone edits one — hence the identical-or-problem rule now and a
  shared file later.

## Phases

| Phase | Work                                                                                                                                                                                                                                                                       | Estimate |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 0     | DONE 5 November 2026 (WW-30): the format in the schema, `pages-file.ts` in the engine (`pageFile`, `exportPageFile`, `parsePageFile`, `mergePageFiles`, tests), "Export page" in the builder with its download, `pages-as-code.feature`                                    | —        |
| 1     | The six demo pages cut into `src/pages/*.page.json`; the loader and routes from the files; the CI configuration check; the suite green                                                                                                                                     | ½ day    |
| 2     | The Vite plugin (PUT/GET, `pagesDir`, guards); the host's `SaveTrees` writing page files in authoring mode and saying so in the toolbar; "New page…" with the page picker and `/builder/<name>`; builder templates under the page's group; more of `pages-as-code.feature` | 2 days   |
| 3     | "Propose": the authoring server commits on a branch and opens the pull request through the forge API, the link in the toolbar; the authoring deployment documented                                                                                                         | 1 day    |

## Later

- **A page fix without a release**: a server page store (C) with
  the same file format as its exchange unit, pulled into the repository
  for release. Not before the product owner asks for it.
- **Shared widget templates** in a file of their own, referenced by
  several pages, instead of identical copies.
- **The user's own views travelling with the page**: a user view promoted
  to prebuilt is Share → overlay off → Import today; with the page file it
  is one button in phase 2 if cheap.
- **Per-user overlays on a server** are WW-19 and stay separate from
  pages as code: the application's pages are the team's, the overlay is
  the user's.

## Built (5 November 2026): the file, and Export page

The product owner asked for the hand-off first: "the product, QA or
another developer creates a page, exports it as JSON and sends it to a
developer." That is answer A, built on the format and functions phase 1
calls for, so the write-through (B) will write the very file Export
produces.

- **The format** is `pageFileSchema` in `@wirework/schema`
  (`models/page-file.ts`): kind `wirework-page`, version 1, `page`,
  `route?` (`path`, `title`, `menu`), `templates`, `on?`, `widgets` by
  model path — exactly "The page file" above. The schema package holds it
  because it is a model's shape checked by zod, like the view models'.
- **The functions** are `pages-file.ts` in `@wirework/engine`:
  `pageFile(input, page, route?)` cuts the page out — its templates, its
  `on`, the template MAP at every model path its cells point at, the cells
  inside containers included (`cellsWithin`), each once, sorted; a
  dangling model path contributes nothing. `exportPageFile` pretty-prints;
  `parsePageFile(text)` checks the shape and says what is wrong in the
  schema's words; `mergePageFiles(files, into?)` builds the tree — laid
  over an application's own when given — with the routes the files carry
  and the problems (a page in two files; a widget template two pages hold
  differently, the later file winning). The engine stays free of zod at
  run time; `pageFileName(page)` is `<page>.page.json`.
- **The builder** has `usePageExport` (`use-page-export.ts`): the SHARED
  page as a file, never the overlay; `canExport` gated by the edit lock as
  Edit page is — exporting is an administrator's act; a panel with the
  text; `download()` through the given `save`, the browser's download by
  default (`downloadTextFile`). Nothing is committed: an export changes no
  tree. `@wirework/antd-builder` renders it as `PageExport`: the button
  "Export page…" and a panel with the JSON read-only, Close and "Download
  <page>.page.json".
- **The host** passes its route for the page (`PAGE_ROUTES`) and renders
  the panel under the views row.
- **What the developer does with the file today**: `parsePageFile` it and
  `mergePageFiles([file], demoViewModels)` into the fixtures — or read it
  and type the page in, since it IS the fixtures' shape. The loader that
  reads `src/pages/*.page.json` at boot is phase 1's next step, not built.
- **Tested**: `pages-file.test.ts` (the cut through a box, each widget
  once, no route or `on` when there is none; export and parse round trip,
  the refusals; merge into a tree that validates like the original, laid
  over another tree, the two conflicts); `use-page-export.test.tsx` (the
  file with the widgets down into the box and never the user's views, the
  panel and `save`, the lock); `pages-as-code.feature` (the overview whole
  — both prebuilt views, its `load`, its widgets, its path, my own view
  not in it — and downloaded as `overview.page.json`; the cards page with
  the widgets inside its cards three engines deep; a page built in the
  builder; no export without the permission).

## Built (9 November 2026): the pages as folders, and the loader

The product owner asked for the pages in the source as FOLDERS — "pages →
roles → viewModel.json and so on" — and for the store to get a page's
configuration when the page is reached, nothing of another page's. That is
phase 1's loader, with one change to the file: it is a folder.

- **The folder** is `apps/playground/src/pages/<page>/`, three files that
  are the page file in three parts (`PAGE_FOLDER_FILES` in the schema,
  `pageFolder` / `pageFromFolder` in the engine): `page.json` says WHICH
  page — `kind`, `version`, `page`, `route`; `viewModel.json` everything
  that is LAYOUT — `templates`, `on`, `roles` and, since the review below,
  `containers`; `widgets.json` the templates of the other widgets its cells
  point at, by model path. A reader opens the file they are after; a
  change to one setting is a one-line diff in one of them. Export page
  still downloads the one-file form, which a developer splits with
  `pageFolder` — a "Download as folder" is the next step.
- **The loader** is `src/pages/index.ts`: Vite's `import.meta.glob` over
  `./*/*.json`, each folder joined by `pageFromFolder` (the folder's name
  must be the page's), every page of `DEMO_PAGES` having a folder and every
  folder being a demo page's — a problem fails the boot naming the file,
  before any page shows. The routes (`routes.ts`) are the folders'
  `route` entries in the menu's order plus the builder's own.
- **The store holds one page at a time.** `viewModels` stays a root of the
  application's long-lived store, but when a page opens the session puts
  THAT page's view models there (`AppSession.enter` in boot.ts): the
  folder's, merged into a tree of its own — or, when this session saw the
  page before, the tree as it was when the page was left, so an inspector
  edit or a saved page is still there on the next visit, as it was when
  the whole tree lived in the store. The memory is per page and per
  session, this demo's stand-in for the server a host would ask; a visit
  to the builder ends the session and the memory with it. The State panel's
  "This page's views" editor now shows the store as it is.
- **The fixtures package** keeps what is not a page: `DEMO_PAGES` (the
  menu's order), the page data every visit starts with, the user overlay,
  the session's people and permissions, the fake servers' seed, the
  builder's empty page and the failure-path tree. `demoViewModels` is
  gone; the seven pages were cut into their folders by the same rule the
  page file uses (every model a cell points at, through the containers'
  layouts).
- **Tested**: `pages-file.test.ts` (the split and the join, what a page
  has not left out, the problem named after its file, a `page.json` naming
  another page than its folder); `pages-as-code.feature` (a page's view
  models come from its folder when it opens — the roles page's card and
  widgets without the runs table, then the runs page's table and the
  admin's entry without the card); and the whole suite, which renders
  every demo page from the folders.

## Reviewed (9 November 2026): where a container's layout goes in the folder

The product owner opened the roles page's folder and found
`viewModel.json` holding one root layout with one card in it, and the
layout INSIDE the card — the input, the button, the echo, the note — in
`widgets.json`, because a container's layout lives in its widget template
(doc/ADR/0009-containers.md: `content: { engine, cells }`). "This is not
convenient. Combine in one, or somehow split so that all layout and views
are in viewModel." Five answers were weighed.

### The question, and five answers

**A. One file.** `page.json` holds the whole page file, as Export page
produces it. Nothing to explain; the reader scrolls. Three files were
asked for a week ago for the reader's sake, and the reader now has to know
the rule that splits them — if the rule is not obvious, one file beats
three. Every split needs a rule, and the next question is why a label's
text — visible on the page — is in `widgets.json` while a card's title is
in `viewModel.json`. A is also the least code: it DELETES the folder
functions. Not taken because the owner wants the folder of parts; kept as
the honest fallback — if the next complaint is about which file holds a
widget's settings, go to one file and stop splitting.

**B. The containers' templates go with the layout.** A widget whose
definition `contains` a layout — a card, tabs, a collapse, a dialog — IS
layout: its template holds `content` (or a `content` per tab or panel),
with the cells inside. `viewModel.json` gets a `containers` map of those
templates, by model path, next to `templates`; `widgets.json` keeps the
other widgets'. The model does not change: the folder is a serialisation,
the split a partition of the widget map by one predicate the registry
already answers. The join is a union, a model in both files a problem.
For it: the rule follows from the model instead of fighting it, it can be
told in one breath, and it is the smallest change that keeps the parts —
one optional key in a schema, one predicate, one partition, one union
with one problem. `page.json` stays tiny and separate: the route is what
the author of a new page writes first and what a reviewer checks first.
Its costs: the partition is by widget TYPE, which a reader must know; the
key must say what it holds (`containers`, not `layouts`); a widget that
gains `contains` later moves files on the next save — a diff to expect,
not a bug; and, measured on the demo, the containers are a third to a
half of every page's widget map, so B moves most of the file anyway. The
invariant would have to be tested, not hoped: a model path in exactly one
of the two widget maps, the join refusing one in both, the split-then-join
round trip with a container.

**C. The layouts cut out of the templates.** `viewModel.json` gets a
`layouts` map by chain (`card-roles`, `tabs-1/tabs.0.content`) holding each
container's inner layout; the container's template in `widgets.json` keeps
its other settings with the layout removed; the join puts every layout
back where `layoutsOf` says it was. Every layout in one flat list — but a
second representation of the same tree, surgery on both ends, and a
two-way invariant between two files that a hand edit breaks silently. The
reader must reassemble the card in their head from two files, and it is
about five times the code of B for the same page.

**D. The layout inline in the cell.** The page template's card cell
carries its inner layout itself. Changes the model: a cell is identity and
binding, the LAYOUT belongs to the template so that a role or a user may
pick another template of the same card and a user's own copy of a card's
content lives in their overlay as a setting (doc/ADR/0009-containers.md).
Rejected on the model, not the file.

**E. Leave it and document.** Rejected: the owner read the folder and
could not find the page in it.

### Decision: D — the layouts nested in their cells, in the file

B was the first recommendation, its rule one sentence: `viewModel.json`
holds everything that is layout — the page's and its containers' — and
`widgets.json` the widgets that show or edit a value. Shown the two
shapes side by side, the
product owner asked why the card's inside was not nested in the card's
cell "like a file structure or HTML", heard what is lost (nothing at run
time; in the FILE, a second shape for a card with two templates or a
template placed twice) and decided: **nest, in the folder and in Export
alike, and put the roles in a file of their own.**

So D is the FILE's shape, not the model's. The model is right and stays —
a container's layout is its template's, so a role or a user can pick
another template of the card. In a page file a cell of a
widget whose definition `contains` a layout carries the widget's template
map as `templates`, the layouts inside it with their own cells, nested in
turn — a card inside a card nests inside it. The two cases that were the
worry have one rule: a container's templates are written ONCE, in the first
cell (document order: the page's templates, then the roles') that points at
its model; a later cell of the same model only names it, as an HTML
reference would; a model with two templates nests both, and the cell's
`template` says which it shows. Merging a file into a tree moves every
nested map back to its model path and the cells are plain again, so the
store, the builder, the roles and the user's own views are exactly as
before. `widgets` keeps the other widgets' template maps by model path.

The roles page's `viewModel.json` now reads: the root row, its card, the
card's title and its three rows inside, in one tree. The folder is four
files, always: `page.json`, `viewModel.json` (templates and reactions),
`roles.json` (what every role says, its templates nested the same way — `{}`
where no role does, so the file is there to be found and filled; the roles
page's picks the card's `admin` template for the admin, both templates
nested in the card's cell in `viewModel.json`) and `widgets.json`. Export
page downloads the same nested shape as one file.

### What changed

`pageFile` nests: the containers' template maps into their first cells
(`mapCells`, a walk over every cell wherever its engine keeps it — a cell
is the `CellBase` object the engines' `cells` return), the other widgets
by model path as before. `mergePageFiles` un-nests by the same walk, the
nested maps placed at their model paths with the same differs-between-pages
check as the flat ones. The page file's schema documents the nesting; the
folder has a `roles` part (`pageRolesSchema`, `roles.json` in every folder,
`{}` where no role says anything), and `pageFolder` / `pageFromFolder` are a split and a
join of keys again, no registry needed — the nesting happened in the file.
The seven folders were re-cut. Tests: the box nested in its cell, a box
inside a box, the same box twice written once, the round trip back to the
tree, the folder with and without roles, the problem named after its file.

## Import page (17 November 2026): the exported file read back in the application

### Description

The owner asked: an administrator builds a page in one browser — a view of
a role's own with more widgets among it —, exports it, and another
administrator in another browser imports the file and has the same. Export
page made the file; nothing in the application read one. The only way in
was a developer's `mergePageFiles` in the source.

### Options considered

- **A. The developer's route only** (as it was): the file goes into the
  source and ships with the next release. Safe, and useless between two
  administrators.
- **B. Paste into the State panel.** It works today for whoever knows the
  trees' shape; it checks nothing a file from somebody else needs checked,
  and the file's nested layouts are not the tree's shape.
- **C. Import of a VIEW, widened to carry widgets.** A view is a layout
  only (ADR-0006) and is the user's own; a view that brings widget
  templates is a page file by another name, with the user as its author.
  It would make the gap ADR-0019 names as its first finding wider.
- **D. Import page: the page file read back, in place of the shared page,
  by an administrator** — the same permission, the same file, the same
  panel as the export, and every check a file from somebody else needs.

### Decision

D. "Import page…" stands under "Export page…". The file takes the WHOLE
shared page's place — its prebuilt views, what every role says about it,
the widget templates its cells reference —, as `mergePageFiles` always did:
an import is a replacement, not a merge of two people's edits. The user's
own views are not touched. It waits for the editing permission, like Edit
page and Export page, and is one commit through the builder's one write
path, after which the page loads again.

The file is somebody else's (ADR-0019, finding 5), so the engine's
`importPageFile` refuses it unless it is exactly one page — this one:

1. a page file by its shape (`parsePageFile`);
2. naming the page that is open;
3. of a data format this version reads — a newer one is refused with
   `stampProblem`'s reason, an older one is brought forward through the
   door (`upgradeTrees`, the file merged alone and cut again) before it
   meets the tree;
4. writing widget templates only: every model path the file writes —
   the keys of `widgets` and the cells with a nested template map
   (`pageFileModels`) — is under `widgets.`;
5. replacing no template the page did not hold before: a path that
   exists in the tree and that no cell of this page pointed at is another
   page's;
6. leaving the tree with no validation ERROR it did not have
   (`validateViewModels` before and after; new warnings are shown, not
   refused — a role nobody holds here, for one).

The panel runs these on every change of the text and says the first
refusal, or what the file holds (its views, its roles, how many widget
templates); Import is offered only for a file that would go in.

### What it is not

- Not a merge: a view the importing page had and the file has not is
  gone. Export first to keep it.
- Not persistence: the demo keeps nothing across a reload, an imported
  page like every other edit. A host's `save` is where it is kept.
- Not the route: the file's `route` is ignored — routes are the host's
  code.
- Not a fix of ADR-0019's finding 5 in `mergePageFiles` itself: a
  developer's merge is as it was. The door a user can reach is guarded.
- A template left in the tree by a cell since removed is not the page's
  own any more: a file that writes its path is refused under rule 5.

### Built

`packages/engine/src/page-import.ts` (`importPageFile`, pure),
`pageFileModels` beside the file's other functions; `usePageImport` in the
builder (the panel's state, the check, the commit); `PageImport` in
antd-builder (`page-import`, `page-import-open`, `page-import-panel`,
`page-import-json`, `page-import-summary`, `page-import-problem`,
`page-import-warnings`, `page-import-choose` — a file from the disk, read
into the same field —, `page-import-apply`, `page-import-close`); the
playground under its export button. Tests: the engine's refusals one by
one and the upgrade of an older file; the hook; two scenarios in
`pages-as-code.feature` — a page built for everyone and for the admin in
the builder, exported, imported into a fresh builder; a file of another
page, one that writes `roles.admin`, and text that is no JSON, each
refused with its reason.

## The demo's pages redrawn (19 November 2026)

The owner's word: no Overview and no History; "Pagination" for Runs,
"Infinite List" for the Archive, "FlexLayout" for Cards — the rename all
the way down. What was done, and what this record's sections above call
by the old names:

- The folders are `pages/pagination`, `pages/infinite-list` and
  `pages/flexlayout`; a page's id, its address (`/demo/<id>`), its store
  root and its model paths (`widgets.<id>.*`) follow. What names the DATA
  kept its name — the fake servers and their URLs, the actions `runs/*` and
  `archive/set-favorite`, the run page's `/demo/runs/:runId`, the cells'
  ids.
- `pages/overview` is gone. Its eight widgets and its two views stand at
  the top of the SETTINGS page (its `title` model is `widgets.settings.banner`
  there); its `overview/load` action and the fake server's numbers are
  deleted. The demo's first page is Pagination.
- `pages/history` is gone. Its table's bar — the title, the two filters
  above the table, both tools — and its link cells are the Infinite List
  table's. No demo page holds a list that appends any more; the builder
  can still add one.

One thing this showed and did not solve (doc/ADR/0017-versioning-and-upgrades.md):
a page's NAME is in stored data — `userViewModels.pages.<page>`, a page
file's `page` — and no migration verb renames or removes a page. The
demo's users are fixtures, so nothing was lost; the frozen document of
format 1 still names `overview`, and its choice there is now nobody's
(`upgrades.feature`). A real application renaming a page needs that verb
first.
