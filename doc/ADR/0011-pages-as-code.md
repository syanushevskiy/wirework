# ADR-0011: Pages as code — an admin builds a page in the builder and lands it in the application's source

- **Status:** Accepted — partly built (the file, Export page, Import page, the page folders)
- **Deciders:** the product owner

## 1. Decision

A page is one JSON page file (`wirework-page`: its route, its views, its
`on`, what every role says, every widget template its cells reference),
cut and merged by pure engine functions. In the host's source a page is a
FOLDER of that file's four parts. Built: the format, the functions,
"Export page", "Import page", the folders and their loader. Not built:
the write-through from the dev server, "New page…" and "Propose".

## 2. Problem

"An admin user creates a page using the builder and saves it in the app
code. How should the process look?" A page built in the builder lives in
the store of one browser tab; a reload starts over. The product owner
wants it where the application's own pages are — versioned, reviewed,
released, present in every environment — without a developer typing it
in.

What the decision builds on:

- **One write path.** Everything the builder changes goes through
  `commit` (`packages/builder/src/use-commit.ts`): the store is written,
  then the host's `SaveTrees` is called with both trees.
- **A file format for one view** (ADR-0006, `wirework-page-view`) carries
  one layout and none of the widget templates its cells reference.
- **Boot validation** (`validateViewModels`) checks every template
  against the registries, so a page file is checkable before it loads.
- **`app.permissions.editPages`** gates every edit. There is no notion of
  an authoring environment versus production.

## 3. Details

### The page file

One file holds EVERYTHING of a page that is configuration. The format is
`pageFileSchema` in `@wirework/schema` (`models/page-file.ts`);
`pageFileName(page)` is `<page>.page.json`.

```json
{
  "kind": "wirework-page",
  "version": 1,
  "page": "roles",
  "route": { "path": "/demo/roles", "title": "Roles", "menu": true },
  "templates": {
    "default": {
      "engine": "flex-rows",
      "rows": [
        {
          "cells": [
            {
              "id": "card-roles",
              "widget": "antd-card",
              "model": "widgets.roles.card",
              "template": "default",
              "templates": {
                "default": { "title": "…", "content": { "engine": "flex-rows", "rows": [ … ] } },
                "admin": { "title": "…", "content": { … } }
              }
            }
          ]
        }
      ]
    }
  },
  "on": { "load": [ … ] },
  "roles": { "admin": { … } },
  "widgets": {
    "widgets.roles.note": { "default": { … } }
  }
}
```

- `templates` is `viewModels.pages[<page>]` — the page's prebuilt views.
  `on` is `viewModels.on[<page>]`. `roles` is what every role says about
  the page (ADR-0012). The user's overlay is never in the file.
- `route` (`path`, `title`, `menu`) is data the host's router reads. The
  host's code keeps what only code can say (`onOpen`, the initial data),
  by page name.
- `widgets` holds, by model path, the template MAP of every widget a cell
  of the page points at — each once, sorted. A dangling model path
  contributes nothing.
- **Containers' layouts are NESTED in their cells**, like HTML. The cell
  of a widget whose definition `contains` a layout (ADR-0009: a card,
  tabs, a collapse, a dialog) carries the widget's template map as
  `templates`, with the cells inside, nested in turn. The map is written
  ONCE, in the first cell that points at the model (document order: the
  page's templates, then the roles'); a later cell of the same model only
  names it. A model with two templates nests both, and the cell's
  `template` says which it shows.
- The nesting is the FILE's shape, not the model's. In the store a
  container's layout lives in its widget template, so a role or a user
  can pick another template of the same card. Merging a file moves every
  nested map back to its model path.
- Keys are written in a fixed order and the file pretty-printed, so a
  change to one setting is a one-line diff.
- A file may carry the data-format stamp `versions` of ADR-0017.

### The functions (`@wirework/engine`, `pages-file.ts`)

Pure — no React, no I/O; the engine stays free of zod at run time.

- `pageFile(input, page, route?)` cuts the page out of the trees and
  nests the containers' template maps into their first cells (`mapCells`,
  a walk over every cell wherever its engine keeps it; `cellsWithin`
  reaches the cells inside containers).
- `exportPageFile` pretty-prints it.
- `parsePageFile(text)` checks the shape and says what is wrong in the
  schema's words.
- `mergePageFiles(files, into?)` builds the tree — laid over an
  application's own when given — un-nests by the same walk, and returns
  the routes and the problems: a page in two files; a widget template two
  pages hold differently (the later file wins).
- `pageFolder` / `pageFromFolder` split a page file into the folder's
  parts and join them — a split and a join of keys, no registry needed.
- `pageFileModels` lists every model path a file writes.

### The page folders

In the host's source a page is `apps/playground/src/pages/<page>/`, four
files, always (`PAGE_FOLDER_FILES` in the schema):

| File             | Holds                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `page.json`      | which page: `kind`, `version`, `page`, `route`                                                     |
| `viewModel.json` | `templates` and `on` — every layout, the containers' nested in their cells                         |
| `roles.json`     | what every role says about the page (`pageRolesSchema`), nested the same way; `{}` where none does |
| `widgets.json`   | the other widgets' templates, by model path                                                        |

- **The loader** is `src/pages/index.ts`: Vite's `import.meta.glob` over
  `./*/*.json`, each folder joined by `pageFromFolder`. The folder's name
  must be the page's; every page of `DEMO_PAGES` has a folder and every
  folder is a demo page's. A problem fails the boot naming the file,
  before any page shows.
- **Routes** (`routes.ts`) are the folders' `route` entries in the menu's
  order, plus the builder's own.
- **The store holds one page at a time.** When a page opens, the session
  puts THAT page's view models into `viewModels` (`AppSession.enter` in
  `boot.ts`): the folder's — or, when this session saw the page before,
  the tree as it was when the page was left, so an inspector edit or a
  saved page is still there. The memory is per page and per session, the
  demo's stand-in for a server; a visit to the builder ends both.
- **The fixtures package** keeps what is not a page: `DEMO_PAGES` (the
  menu's order), the page data a visit starts with, the user overlay, the
  session's people and permissions, the fake servers' seed, the builder's
  empty page and the failure-path tree.

### Export page

The hand-off by file: a product owner, a QA or a developer builds a page,
exports it and sends it to a developer.

- `usePageExport` in the builder (`use-page-export.ts`): the SHARED page
  as a file; `canExport` is gated by the edit lock, as Edit page is;
  `download()` goes through the given `save`, the browser's download by
  default (`downloadTextFile`). An export changes no tree.
- `PageExport` in `@wirework/antd-builder`: the button "Export page…" and
  a panel with the JSON read-only, Close and "Download `<page>.page.json`".
  The host passes the page's route and renders the panel under the views
  row.
- Export downloads the one-file form. A developer merges it with
  `mergePageFiles([file], viewModels)` or splits it into a folder with
  `pageFolder`. A "Download as folder" is not built.

### Import page

"Import page…" stands under "Export page…": an administrator pastes (or
chooses from the disk) a file another administrator exported, and the
page becomes the same.

- The file takes the WHOLE shared page's place — its prebuilt views, what
  every role says, the widget templates its cells reference. It is a
  replacement, not a merge: a view the page had and the file has not is
  gone.
- The user's own views are not touched. The file's `route` is ignored:
  routes are the host's code.
- It waits for the editing permission, and is one commit through the
  builder's one write path, after which the page loads again. Keeping it
  across a reload is the host's `save`.

The file is somebody else's (ADR-0019, finding 5). The engine's
`importPageFile` (`page-import.ts`, pure) refuses it unless it is:

1. a page file by its shape (`parsePageFile`);
2. naming the page that is open;
3. of a data format this version reads — a newer one is refused with
   `stampProblem`'s reason, an older one is brought forward
   (`upgradeTrees`) before it meets the tree;
4. writing widget templates only: every model path it writes
   (`pageFileModels`) is under `widgets.`;
5. replacing no template the page did not hold: a path that exists in
   the tree and that no cell of this page points at is another page's — a
   template left behind by a cell since removed included;
6. leaving the tree with no validation ERROR it did not have
   (`validateViewModels` before and after). New warnings are shown, not
   refused.

The panel runs these on every change of the text and says the first
refusal, or what the file holds (its views, its roles, how many widget
templates). Import is offered only for a file that would go in.
`mergePageFiles` itself is unguarded: a developer's merge is trusted.

Code: `usePageImport` in the builder; `PageImport` in antd-builder (test
ids `page-import-open`, `-panel`, `-json`, `-choose`, `-summary`,
`-problem`, `-warnings`, `-apply`, `-close`).

### Not built: the write-through, "New page…" and "Propose"

The mechanism chosen for landing a page in the source without a
developer. It writes the very file Export produces.

- **Authoring mode.** A Vite plugin in the host
  (`apps/playground/vite/pages-plugin.ts`, `apply: "serve"` — absent from
  a production build) adds two routes to the dev server:
  - `PUT /__wirework/pages/<name>` — parses the body with `parsePageFile`
    (an invalid file is refused, nothing written), checks the name
    (`^[a-z][a-z0-9-]*$`, so it cannot leave the folder), refuses a body
    over a size limit, writes atomically (write, then rename) and answers
    with the path.
  - `GET /__wirework/pages/<name>` — the file as written; `GET
/__wirework/pages` lists them, which is how the host knows it is in
    authoring mode.
- **Save page.** In authoring mode the host's `SaveTrees` cuts a
  `pageFile` for every page the commit changed and PUTs it. The user
  overlay is never written. The toolbar always says WHERE a save went
  ("Saved to src/pages/…" or "Saved in this browser only"); a failed
  write is a `SaveError` and the store keeps the page.
- **The folder** is a plugin option (`pagesDir`): the e2e suite's dev
  server writes into `e2e/.pages-out/`, never into the source.
- **"New page…"**: a page picker in the builder's toolbar and a route
  `/builder/<name>`. It asks for the name (made from the title, numbered
  when taken), the title, the path and the menu flag, and creates an
  empty page. The builder's widget templates go under the PAGE's group
  (`widgets.inventory.custom-1`), so two pages' never collide.
- **The hand-off.** A saved file is a change in the working tree: a
  branch, a pull request, CI, review, merge, release. CI runs a
  configuration check — every page parses, merges without conflicts and
  validates as at boot — then the e2e suite.
- **"Propose"**: for an admin without git, the authoring server commits
  on a branch named after the page and opens the pull request through
  the forge's API; the toolbar shows the link.
- **Where it runs.** A developer's `pnpm dev`, or a shared authoring
  deployment — the dev server on a checkout of the main branch, behind
  the application's login, `editPages` for admins only. Production never
  runs it: there the shared page is not writable, and personal views
  work as they do.

Also not built: shared widget templates in a file of their own (today a
template two pages reference is copied into both and must be identical);
a server page store for a page fix without a release (option C below);
promoting a user's own view to prebuilt in one button. Per-user overlays
on a server are story WW-19 and stay separate.

### A known gap

A page's NAME is in stored data — `userViewModels.pages.<page>`, a page
file's `page` — and no migration verb of ADR-0017 renames or removes a
page. An application that renames a page needs that verb first.

### Tests

`pages-file.test.ts`, `use-page-export.test.tsx`, the engine's import
refusals and the import hook's tests, and `pages-as-code.feature`
(stories WW-29, WW-30).

## 4. Options weighed

### How a page built in a browser becomes a file in the repository

| Option                                            | Verdict                                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Download a file, a developer commits it        | Built first, as "Export page", and kept as the fallback for a host without the plugin. Not THE process: it needs a developer for every change, loses the admin's name on the commit and invites drifting copies. |
| B. Write-through from the dev server              | Chosen as the mechanism. The smallest thing that gives git the page: it reuses the one write path, the dev server, the boot validation and git as the history. The pull request gives a reviewer and a rollback. |
| C. A page store on a server, pulled into the repo | Rejected for now. Two sources of truth with a sync, an API and a schema to run — and pages that change in production without a release, which was not asked for. The route if that becomes the requirement.      |
| D. Generate TypeScript instead of JSON            | Rejected. A generator to maintain and nothing gained: JSON parsed by the zod schemas at load IS typed, and a file a machine writes and a human reviews is best kept as data.                                     |
| E. A pull request from the browser ("Propose")    | The last phase, on top of B's file — and soon after it, because admins who do not use git are the admins there are.                                                                                              |

Risks accepted with B: a page fix needs a release (C is the opposite
trade); the authoring deployment runs a DEV server for admins, so it
needs the application's login in front and the plugin as the only
writable thing; a widget template copied into two page files will drift,
hence the identical-or-problem rule.

### Where a container's layout goes in the file

In the store a container's layout lives in its widget template, so a flat
folder showed a page's root layout in `viewModel.json` and the inside of
its card in `widgets.json`. The owner could not find the page in it.

| Option                                           | Verdict                                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. One file                                      | Not taken: the owner wants a folder of parts. The least code, and the fallback if the split keeps raising questions.                                                                                   |
| B. Containers' templates move to the layout file | A `containers` map in `viewModel.json`, split by one predicate the registry answers. The smallest change, but the split is by widget TYPE and the card's inside still sits apart from its cell.        |
| C. Layouts cut out of the templates              | A `layouts` map by chain. A second representation of the same tree, a two-way invariant a hand edit breaks silently, about five times the code of B.                                                   |
| D. The layout nested in its cell (chosen)        | The owner chose it: the file reads like HTML. As a change to the MODEL it is wrong — the layout must stay the template's — so it is the file's shape only, written once per model, un-nested on merge. |
| E. Leave it and document                         | Rejected: the folder was read and the page not found in it.                                                                                                                                            |

### How an exported file gets back into the application

| Option                                        | Verdict                                                                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. The developer's route only                 | Safe, and useless between two administrators.                                                                                                                         |
| B. Paste into the State panel                 | Checks nothing a file from somebody else needs checked, and the file's nested layouts are not the tree's shape.                                                       |
| C. Import of a VIEW, widened to carry widgets | A view is a layout only and the user's own (ADR-0006); one that brings widget templates is a page file with the user as its author — ADR-0019's first finding, wider. |
| D. Import page, by an administrator (chosen)  | The same permission, file and panel as the export, with every check a file from somebody else needs.                                                                  |
