# ADR-0014: Documentation for page authors — people and, above all, AI agents

- **Status:** Proposed — not built
- **Date:** 2026-11-07
- **Deciders:** the tiger team (doc/team_tiger.md) and the product owner

Designed 7 November 2026 with the tiger team (doc/team_tiger.md), at the
product owner's ask. Status: designed (story WW-33), nothing built.

## The ask

"Good documentation so that anyone — especially other AI agents —
understands how to create pages using this library." The reader is not
this repository's maintainer: it is somebody, or some agent, inside an
application that EMBEDS Wirework, asked "add a page that shows the open
incidents with a filter and a retry button", who has to produce a page the
application boots without a developer in the loop.

## What there is

- **An inventory, not a guide.** The root README is a table of packages;
  sixteen package READMEs list what each exports (`resolvePage`,
  `settingFields`, …) — complete, and useless to someone who wants to
  WRITE a page rather than call the engine. Fourteen design documents in
  `doc/` record decisions and their status; they explain why, at length,
  and nowhere say "a page is this JSON, here is one, check it like so".
- **The only complete examples are the fixtures**:
  `packages/view-data-models-examples/src/index.ts`, 1 400 lines of
  TypeScript, well commented, six pages, every feature used once — and
  mixed with the failure-path tree, the user overlays and the sample data.
  An agent that finds it learns the shape by inference; one that does not
  guesses.
- **CLAUDE.md is the de facto agent document today** — eighty dense lines
  for Claude Code working on THIS repository: shell rules, test
  conventions, where things are. It is not about building pages and does
  not travel with the packages.
- **The machine already knows everything an author must get right.**
  Every widget kind is a contract with a `description`, ports and events
  with descriptions, and settings as a zod object with `.describe()` and
  `.default()` on each field — `settingFields` reads them for the builder's
  form. Every action and predicate is registered with a `description` (a
  predicate with its `phrase` and `argument` validator). Every layout
  engine owns a zod schema of its template. `validateViewModels` checks a
  whole tree against the registries and says what is wrong in sentences
  (`cell[2] (#tag-run-retry): unknown predicate "runs/retriable"`). None
  of this is written anywhere a reader finds it; all of it is read by the
  builder at run time.
- **A page IS a file already** (doc/ADR/0011-pages-as-code.md, "Built"):
  `wirework-page` v1 — the page's views, its `on`, every widget template
  its cells reference, its route — cut by `pageFile`, checked by
  `parsePageFile`, merged by `mergePageFiles`. Export page produces it;
  nothing documents it as the thing an author writes.

So the author's problem is not missing knowledge in the repository. It is
that the knowledge is in TypeScript, in zod, in design prose and in a
builder's run-time form, and nothing assembles it for a reader who starts
from "I need a page".

## Who reads, and what each must find in under a minute

- **An AI agent in a host repository**, asked for a page. It reads what is
  short and nearby and never a 600-line design document whole. It needs:
  the vocabulary (page, view, cell, widget template, port, reaction,
  condition, engine); the EXACT shapes; the catalog of what THIS host has
  registered — its widgets with settings, its actions with parameters,
  its predicates, its engines — because the library cannot list a host's
  own `runs/delete-selected`; worked examples it can copy; a way to CHECK
  its page before anyone runs it; and the ten rules no schema states
  (below). It is also a fast and literal reader: a table beats a
  paragraph, a rule stated once beats three places that imply it.
- **A developer embedding Wirework**: how to register, where pages live,
  how the check runs in CI. Secondary here (the package READMEs and
  doc/ADR/0011-pages-as-code.md cover the host), but the same entry page
  must send them on in one line.
- **A page builder who does not code**: the builder UI is their
  documentation; they are served by WW-1 and the Gherkin stories. Out of
  scope except that the examples below are the pages they see.
- **The non-technical QAs**: read the Gherkin and the examples; a page
  file is JSON they can read beside a scenario.

## The question, and five answers

How does an author — a person or an agent — learn to write a page that
boots, in a host they have never seen, without a developer? Five answers,
weighed; the design takes a composition of them with a clear rule about
which is allowed to be prose.

**A. A handbook in prose.** `doc/page-authoring.md`: concepts, every
section of a page explained, every widget described, examples inline.
Human-friendly and the obvious first move. Rejected as THE answer: a
handbook that describes 19 widgets' settings by hand is wrong within a
month (the widgets' `.describe()` strings already changed three times
this autumn), it cannot know a host's own widgets and actions, and an
agent will not read it whole. Kept for the ONE thing nothing else can
carry — the model in the author's head and the rules no schema states —
and capped at a page and a half.

**B. A catalog generated from the registries.** A pure function in the
engine reads the sealed registries — contracts, widgets, actions,
predicates, appearances, layout engines — into plain data, and a second
one renders Markdown: one table per widget (setting, kind, default,
description; inputs; events with their payload keys), one line per action
(name, description, parameter fields), one per predicate (name, phrase,
argument), one per engine (name and the fields a cell carries). It is the
builder's form on paper, so it cannot disagree with the builder; it is
run IN THE HOST, so it lists the host's own kinds and actions; a check in
CI fails when the committed catalog is stale. Chosen as the reference.

**C. A JSON Schema of the page file, and a check command.** The zod
schemas are turned into one `wirework-page.schema.json` (zod → JSON
Schema), so an editor completes and an agent validates its draft without
running anything; and `pnpm pages:check <file>…` runs `parsePageFile`,
`mergePageFiles` and `validateViewModels` against the host's registries
and prints the problems in the engine's own sentences — exactly what boot
would say, before boot. The honest limit, stated in the schema's
description: a widget template's shape depends on the cell's `widget`,
which JSON Schema cannot follow, so the schema checks the page-level
shape and the engines' templates (a `oneOf` over the registered engines),
and the check command checks everything. Chosen; the check is the part an
agent uses most.

**D. Examples as documentation.** The six demo pages exported as
`*.page.json` — the pages a reader can open in the playground — each with
a short commentary: what the page shows, which feature each cell proves
(a table a server describes; a control writing a global setting; a widget
under a condition; a card holding a layout; a role's view). Rejected as
the whole answer (an example says what, not what else is possible), chosen
as the part that makes the rest usable: an agent learns from a worked
example faster than from a schema, and these examples cannot drift
because a unit test loads every one and the suite opens the pages. They
are the very files phase 1 of pages as code needs — one piece of work,
two designs served.

**E. An `AGENTS.md` entry point.** One short file at the root, in the
convention coding agents look for (Codex, Cursor, Copilot and Claude Code
all read it or can be pointed at it), that says what Wirework is in five
sentences, the reading order through A–D, the ten rules, and the two
commands (`docs`, `pages:check`). Chosen: it is the door; without it the
agent still opens the fixtures first. CLAUDE.md keeps its role (working
on this repository) and gains one line pointing here.

**The composition and its one rule.** E → A (short) → B and C (generated)
→ D (tested examples) → the check. The rule: **everything an author must
get exactly right is generated from the code or proven by a test; prose
carries only the model and the rules no schema states.** A sentence of
prose that restates a setting's description is a bug.

## The design

### Where it lives

A folder `doc/authoring/` in this repository, the playground being the
host whose catalog it holds:

```
AGENTS.md                              the door (root; E)
doc/authoring/
  page-authoring.md                    the model and the rules (A; written once, short)
  catalog.md                           GENERATED: widgets, actions, predicates, appearances, engines (B)
  wirework-page.schema.json            GENERATED: the page file's JSON Schema (C)
  examples/
    overview.page.json … cards.page.json   GENERATED from the fixtures (D)
    README.md                          one paragraph per example: what it proves (hand-written, tested by name)
```

Everything GENERATED is committed, so a reader (and an agent cloning the
repository) sees it without running anything, and `pnpm docs:check` fails
`pnpm check` when a registration or a fixture changed and the folder was
not regenerated. A host that embeds Wirework gets the same folder by
running the same generator against its own registries (the generator is
engine functions plus a thirty-line script a host copies — "Later" says
how it may ship in a package).

### `AGENTS.md` (the door)

Sixty lines at most, in this order:

1. **What Wirework is**, in five sentences: a page is configuration;
   widgets read one store and emit events; reactions write paths or call
   host actions by name; a layout engine places cells; a host registers
   everything and boots the pages.
2. **Reading order**: `doc/authoring/page-authoring.md` (ten minutes),
   then the catalog for the widgets and actions this application has,
   then an example closest to the page wanted, then write the page file
   and run the check.
3. **The ten rules** (the things no schema states; each one line, each
   enforced by validation or a test, so the list can be trusted):
   1. Every cell has a stable `id`, unique in its page; identity is never
      positional. A widget inside a card is addressed as `card-1/button`.
   2. A cell points at a widget template by `model` (a path in
      `viewModels.widgets`) and `template` (a name there, `default` by
      convention); templates are grouped by page: `widgets.<page>.<name>`.
   3. A page has VIEWS (`viewModels.pages.<page>.<view>`): `default` is
      the one shown; every view is a complete layout; a user's own view
      and a role's live elsewhere and are never written by an author.
   4. `inputs` binds a PORT to a STORE PATH; a path is dot-separated
      segments, never into `viewModels`, `userViewModels` or `route`
      except to read (`CONFIG_ROOTS`, `FORBIDDEN_SEGMENTS`).
   5. `on` lists reactions per event, run IN ORDER: `{ set, value | from }`
      writes a path, `{ call, with }` calls a host action by name. A
      control's `changed` writes back to its port by default — bind the
      port and add only what should follow.
   6. `when` is a list of tests that must ALL hold (`{ path, is, to?,
not? }` or `{ any: [...] }`, or `{ expression }` in words); a hidden
      cell keeps its place.
   7. The page's own `load` is `viewModels.on.<page>.load`; a table's
      `load` is in its template.
   8. The layout engine is chosen per view by `engine`; each engine adds
      its own cell fields (`x y w h`; `rows[].cells[].classes`; `areas`
      and the cell's id as its area). There is no conversion between
      engines.
   9. A container (card, tabs, collapse) holds a layout in its template
      (`content: { engine, cells }`, one per tab or panel); the page is
      still one page.
   10. Global state lives under `app.*` and survives navigation; a page's
       own data starts over on every visit; what the router matched is
       at `route.params.*`.
4. **The two commands**: `pnpm docs` (regenerate the folder) and
   `pnpm pages:check doc/authoring/examples/*.page.json` (what boot would
   say), with one line of what a failure looks like.
5. **Where the host's code is** for what a page cannot say: actions,
   predicates, routes, a page's initial data — two paths.

### `page-authoring.md` (the model, one page and a half)

Written for a reader who has the catalog beside it; no widget is
described here. Sections, each a few lines and one JSON fragment:

1. **One page, read as data.** The smallest page file that boots: one
   view on `flex-rows`, one label, its template; the five keys of the
   file (`kind`, `version`, `page`, `route`, `templates`, `widgets`,
   `on`).
2. **A cell.** `{ id, widget, model, template }` plus the engine's
   placement; what `widget` names (a registered implementation, e.g.
   `antd-table`) versus what `model` names (the author's template).
3. **A widget template.** Settings (from the catalog), `inputs`, `on`,
   `when`, `appear` / `disappear` — one fragment showing all five on a
   button that resets a counter when the user is an admin.
4. **The store.** Paths; page data versus `app.*` versus `route`; a
   server-described table's data arriving at `into`; the state inspector
   in the playground to see it.
5. **Reactions.** `set` with `value` or `from` (a key of the event's
   payload), `call` with `with`; order; default write-back; a page's
   `load`.
6. **Conditions.** The eight standard predicates and the host's own; the
   constructor's words; appearances.
7. **Layouts.** The five engines in one table: name, what a cell adds,
   when to pick it (a dashboard: a grid; a form: flex rows; a skeleton
   with named areas: css-grid; docking: flexlayout).
8. **Containers.** A card around a layout; the chain key.
9. **Views and roles — what an author does not write.** One paragraph:
   the user's own views and a role's layer exist, are produced by the
   builder, and a page file carries the role's part under `roles`.
10. **Check, then hand in.** `pnpm pages:check`; the kinds of problem it
    reports (unknown widget, unknown action, a setting the schema
    refuses, a path with a forbidden segment, a condition's unknown
    predicate, a non-rectangle area) and what each means; then
    doc/ADR/0011-pages-as-code.md for how the file reaches the
    application.

### The catalog (generated)

`describeRegistries(registries): Catalog` in `@wirework/engine`
(`catalog.ts`, beside `pages-file.ts`): plain data —

```ts
interface Catalog {
  widgets: {
    type: string;
    kind?: string;
    description?: string;
    implements?: string;
    inputs: PortEntry[];
    events: EventEntry[];
    settings: SettingField[];
    contains?: string[];
    example: unknown;
  }[];
  actions: { name: string; description: string; parameters: SettingField[] }[];
  predicates: { name: string; phrase: string; description: string; argument: ArgumentKind }[];
  appearances: { name: string; description: string }[];
  engines: { name: string; cellFields: SettingField[]; templateFields: SettingField[] }[];
}
```

— every entry read with what exists: `settingFields` for the settings and
an action's parameters, `validatorKeys` for an event's payload, the
contract's `description` and `preview.viewModel` (the example), the
engine's template schema for its fields. `catalogMarkdown(catalog):
string` renders it: a heading per widget, one table of settings, a line
of inputs, a line of events, the example as a fenced JSON fragment; then
the actions, predicates, appearances and engines as tables. No
generator framework, no typedoc: Markdown tables a reader scans and an
agent parses.

The JSON Schema: `pageFileJsonSchema(layoutEngines)` composes the page
file's zod schema with a `oneOf` over the registered engines' template
schemas and converts (zod → JSON Schema, one dev dependency in the host's
script, not in any package), with the honest `description` on `widgets`
("the shape depends on the cell's `widget`; run the check").

The host's script, `apps/playground/scripts/docs.ts` (`pnpm docs`): build
the registries the way `boot.ts` does — `installDemo` without a DOM, the
widgets registered, never rendered —, call the three functions, export
the six demo pages with `pageFile` and `exportPageFile`, write the
folder. `pnpm docs:check` is the same script comparing instead of
writing, in `pnpm check`. If `@wirework/antd-widgets` cannot be imported
without a window, the script runs under jsdom — a detail phase 1 settles.

### The check command

`pnpm pages:check <file>…` (`apps/playground/scripts/pages-check.ts`):
for every file `parsePageFile` (the shape, in the schema's words), then
`mergePageFiles(files, demoViewModels)` (a page in two files; a widget
template two pages hold differently), then `validateViewModels` with the
host's registries and `knownRoles` — the sentences boot prints, with the
file name in front; exit code 1 on the first error, warnings listed. It
is what an agent runs after writing, and what CI runs on
`doc/authoring/examples/` and, with pages as code phase 1, on
`src/pages/`.

### The examples

`pnpm docs` writes `doc/authoring/examples/<page>.page.json` for the six
demo pages from the fixtures through `pageFile` — the same cut Export
page makes, so what a reader sees in the playground and what they read
are one thing. `examples/README.md` is hand-written, a paragraph per
page naming the cells that prove a feature (the runs page: a table the
server describes, a filter bar, a refresher, "Open run" under a
condition, the Wirework admin's Delete under `has the role`; the
settings page: a card holding a grid, controls writing `app.settings`,
the admin's Danger zone as a role's view; the run page: css-grid areas, a
condition with the host's predicate, an appearance; the cards page: four
engines). A unit test asserts every cell the README names exists in the
file it names, so the commentary cannot drift either.

### Tests

- `catalog.test.ts` (engine): `describeRegistries` over a registry with
  the standard contracts and one host action lists the button's two
  settings with their defaults and descriptions, the table's `load`
  event, the predicate's phrase; `catalogMarkdown` holds the table rows;
  `pageFileJsonSchema` accepts the overview's file and refuses a cell
  without an `id`.
- `docs.test.ts` (playground): the generated folder equals a fresh
  generation (`pnpm docs:check`'s assertion as a test); every example
  parses, merges and validates with zero errors; every cell
  `examples/README.md` names exists.
- `pages-check` has a test with a broken file (an unknown widget, a
  forbidden path) asserting the two sentences and the exit code.
- The acceptance that matters (Morgan's): an agent given ONLY `AGENTS.md`
  and `doc/authoring/` — no fixtures, no design documents — asked for a
  page in one sentence, produces a file `pnpm pages:check` accepts on the
  first or second try. Run once at the end of phase 2 as a trial, the
  transcript kept in the story; not automated.

## The tiger team's positions

- **Morgan (product):** the value is a page from a one-sentence ask with
  no developer, by the agents this organisation already pays for. Wants
  the acceptance to be a TRIAL, not a review of the prose: give an agent
  the folder and the ask, watch. Accepts generated reference over a
  polished handbook because "polished" is what rots. Asks that the check
  command's output be readable by her QAs: sentences, file names, no
  stack traces.
- **Alexei (architecture):** the catalog and the JSON Schema are pure
  functions over the registries in the engine, beside `pages-file.ts`;
  I/O (the folder, the diff, the exit code) is a host script. The
  generated files are build outputs that happen to be committed for
  readers — never edited by hand, and the check makes that a rule. No
  documentation generator as a dependency of a package.
- **Dmitri (readability):** one entry file, one short guide, tables for
  everything else. A rule appears ONCE, in `AGENTS.md`, and the guide
  links to it rather than repeating it. The examples are the real pages
  — a reader who opens `/demo/runs` and `runs.page.json` side by side
  learns more than from any paragraph. Keep `AGENTS.md` under sixty
  lines or it will not be read.
- **Katya (team):** the win is that documentation stops being a chore:
  register a widget with its `.describe()` strings and the catalog is
  updated by `pnpm docs`, and `pnpm check` tells you when you forgot. The
  guide is written once and changes only when the MODEL changes (a new
  section of a view model), which is rare. Put the folder in this repo
  first; a host that needs it copies a thirty-line script — a package for
  it only when the second host asks.
- **Sasha (QA):** three guarantees or it is not documentation: the
  generated files equal a fresh generation (a stale catalog fails CI);
  every example boots (parse, merge, validate, and the e2e suite opens
  the pages anyway); every claim the commentary makes names a cell that
  exists. Plus the check command's own test with a broken file. The
  non-technical QAs can read a page file next to its Gherkin — and
  `examples/README.md` tells them which cell is which.
- **Ren (contrarian):** two things to be honest about. First: agents may
  not need documents at all — they need TOOLS: "describe this host" and
  "check this file" are the two functions above behind an MCP server,
  and that may serve a coding agent better than a folder it must find.
  Agrees to the folder FIRST because it costs a day, serves people too,
  and the MCP server would wrap the same two functions (see "Later"), so
  nothing is wasted. Second: the JSON Schema cannot check widget
  templates (their shape follows the cell's `widget`); say so in the
  schema itself or an agent will trust a green schema and ship a wrong
  template — the check command is the real gate, make the door say so.
  One more risk: `AGENTS.md` at the root of a library repository will be
  read by agents working ON the library too; its first line must say who
  it is for and send maintainers to CLAUDE.md.
- **Vlad (fluency):** `describeRegistries` is five maps over five
  `list()`s, each entry a spread of what `settingFields`, `validatorKeys`
  and `argumentKind` already return — no new introspection, no
  intermediate state; `catalogMarkdown` a `flatMap` into lines joined
  once. The check command: parse, merge, validate, print — a pipeline, a
  `process.exit` at the end.
- **External reviewer:** the minimum is one door, one short guide, two
  pure functions with a Markdown renderer, one script with two modes,
  one check command, six exported files with a README, and the tests that
  pin them. Nothing new to the engine's model; nothing a reader must
  install. Everything beyond (MCP, publishing the guide in a package) is
  "Later".

## Phases

| Phase | Work                                                                                                                                                                                                                                                   | Estimate |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1     | `AGENTS.md` and `doc/authoring/page-authoring.md`; the six examples exported by a script with `examples/README.md`; `pnpm pages:check` with its test; the examples' unit test (parse, merge, validate, the named cells); README and CLAUDE.md pointers | 1 day    |
| 2     | `describeRegistries`, `catalogMarkdown`, `pageFileJsonSchema` in the engine with tests; `pnpm docs` writing `catalog.md` and the schema; `pnpm docs:check` in `pnpm check`; the trial with an agent, its transcript in the story                       | 1 day    |
| 3     | What the trial shows: the rules the agent missed moved into `AGENTS.md`, the problems it hit made clearer in the check's sentences                                                                                                                     | ½ day    |

## Later

- **The same two functions as tools**: an MCP server exposing `describe`
  (the catalog as JSON) and `check` (a page file's problems), so a coding
  agent in a host asks rather than reads (Ren). Worth it when a second
  host embeds Wirework.
- **The guide in a package**: `page-authoring.md` and the script shipped
  in `@wirework/engine`'s `dist` (`docs/`), so a host gets them from npm
  and `pnpm docs` in the host writes its own folder.
- **Pages as code phase 1** (doc/ADR/0011-pages-as-code.md) takes the
  examples as `src/pages/*.page.json`: one folder, read by the loader and
  by the reader.
- **A widget's own prose** — when `.describe()` is not enough (the table's
  cell kinds, the filter bar's shapes) — as a `docs` field on the contract,
  rendered by the catalog under the table; only when a trial shows the
  need.
