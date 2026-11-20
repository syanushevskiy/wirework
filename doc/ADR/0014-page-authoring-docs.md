# ADR-0014: Documentation for page authors — people and, above all, AI agents

- **Status:** Proposed — not built
- **Deciders:** the product owner

## 1. Decision

Proposed; nothing is built (story WW-33). Page authors — people and, above
all, AI agents inside a host that embeds Wirework — get five things:
`AGENTS.md` as the door, a short guide carrying the model, a catalog and a
JSON Schema GENERATED from the host's registries, the demo pages as tested
example page files, and `pnpm pages:check` as the gate. The one rule:
what an author must get exactly right is generated from the code or proven
by a test; prose carries only the model and the rules no schema states.

## 2. Problem

The ask: "Good documentation so that anyone — especially other AI agents —
understands how to create pages using this library." The reader is not
this repository's maintainer. It is somebody, or some agent, inside an
application that EMBEDS Wirework, asked "add a page that shows the open
incidents with a filter and a retry button", who must produce a page the
application boots without a developer in the loop.

The knowledge exists, but nothing assembles it for a reader who starts
from "I need a page":

- The READMEs are an inventory of exports; the decision records explain
  why, at length, and nowhere say "a page is this JSON, check it like so".
- `CLAUDE.md` is for agents working ON this repository; it does not travel
  with the packages.
- The machine already knows everything an author must get right: every
  contract has a `description`, ports, events and settings as a zod object
  with `.describe()` and `.default()` (`settingFields` reads them for the
  builder's form); every action and predicate is registered with a
  description; every layout engine owns a schema of its template;
  `validateViewModels` says what is wrong in sentences.
- A page IS a file already (ADR-0011): `wirework-page`, cut by `pageFile`,
  checked by `parsePageFile`, merged by `mergePageFiles`.

Who reads: an AI agent in a host repository (short, exact, literal — a
table beats a paragraph, a rule stated once beats three places that imply
it; it needs the catalog of what THIS host registered); a developer
embedding Wirework (sent on in one line); testers, who read a page file
beside a scenario. A page builder who does not code is served by the
builder UI.

## 3. Details

Not built: everything below is the design.

### The one rule and the three guarantees

**Everything an author must get exactly right is generated from the code
or proven by a test; prose carries only the model and the rules no schema
states.** A sentence of prose that restates a setting's description is a
bug. A rule appears ONCE, in `AGENTS.md`; the guide links to it.

Three guarantees, or it is not documentation:

- the generated files equal a fresh generation (a stale catalog fails CI);
- every example boots (parse, merge, validate);
- every claim the commentary makes names a cell that exists.

### Where it lives

```
AGENTS.md                              the door (root)
doc/authoring/
  page-authoring.md                    the model and the rules (written once, short)
  catalog.md                           GENERATED: widgets, actions, predicates, appearances, engines
  wirework-page.schema.json            GENERATED: the page file's JSON Schema
  examples/
    <page>.page.json                   GENERATED: one per demo page
    README.md                          one paragraph per example (hand-written, tested by name)
```

Everything generated is committed, so a reader sees it without running
anything, and is never edited by hand: `pnpm docs:check` fails
`pnpm check` when a registration or a page changed and the folder was not
regenerated. The playground is the host whose catalog the folder holds. A
host that embeds Wirework gets the same folder by running the same
generator against its own registries — engine functions plus a
thirty-line script it copies.

### `AGENTS.md` (the door)

Sixty lines at most. Its first line says who it is for — an author of
pages in a host — and sends maintainers of this repository to `CLAUDE.md`.
Then:

1. **What Wirework is**, in five sentences: a page is configuration;
   widgets read one store and emit events; reactions write paths or call
   host actions by name; a layout engine places cells; a host registers
   everything and boots the pages.
2. **Reading order**: the guide (ten minutes), the catalog, the example
   closest to the page wanted, then write the page file and run the check.
3. **The ten rules** — what no schema states; each one line, each enforced
   by validation or a test:
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
   6. `when` is a list of tests that must ALL hold
      (`{ path, is, to?, not? }` or `{ any: [...] }`, or `{ expression }`
      in words); a hidden cell keeps its place.
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
       own data starts over on every visit; what the router matched is at
       `route.params.*`.
4. **The two commands**: `pnpm docs` (regenerate the folder) and
   `pnpm pages:check doc/authoring/examples/*.page.json` (what boot would
   say), with one line of what a failure looks like. The door says that
   the check, not the JSON Schema, is the gate.
5. **Where the host's code is** for what a page cannot say: actions,
   predicates, routes, a page's initial data.

### `page-authoring.md` (the model)

A page and a half, for a reader who has the catalog beside it; no widget
is described here. Ten sections, each a few lines and one JSON fragment:
the smallest page file that boots and the file's keys; a cell (`widget`
names a registered implementation, `model` the author's template); a
widget template (settings, `inputs`, `on`, `when`, `appear` /
`disappear`); the store (page data, `app.*`, `route`); reactions;
conditions; the layout engines in one table with when to pick each;
containers; views and roles — what an author does not write; and "check,
then hand in" — the kinds of problem `pnpm pages:check` reports, then
ADR-0011 for how the file reaches the application.

### The catalog and the JSON Schema (generated)

Three pure functions in `@wirework/engine` (`catalog.ts`, beside
`pages-file.ts`); no documentation generator is a dependency of a package.

- `describeRegistries(registries): Catalog` — plain data:

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

  Five maps over five `list()`s, each entry read with what exists:
  `settingFields`, `validatorKeys`, `argumentKind`, the contract's
  `description` and `preview.viewModel` (the example), the engine's
  template schema. No new introspection.

- `catalogMarkdown(catalog): string` — a heading per widget with a table
  of settings, a line of inputs, a line of events and the example as
  JSON; then actions, predicates, appearances and engines as tables.
- `pageFileJsonSchema(layoutEngines)` — the page file's zod schema with a
  `oneOf` over the registered engines' template schemas, converted to JSON
  Schema (one dev dependency of the host's script). It cannot check widget
  templates — their shape follows the cell's `widget` — and its
  `description` on `widgets` says so: "run the check".

The host's script, `apps/playground/scripts/docs.ts` (`pnpm docs`), builds
the registries the way `boot.ts` does — the widgets registered, never
rendered —, calls the three functions, exports the demo pages with
`pageFile` and `exportPageFile`, and writes the folder. `pnpm docs:check`
is the same script comparing instead of writing. If
`@wirework/antd-widgets` cannot be imported without a window, the script
runs under jsdom.

### The check command

`pnpm pages:check <file>…` (`apps/playground/scripts/pages-check.ts`): for
every file `parsePageFile`, then `mergePageFiles(files, demoViewModels)`,
then `validateViewModels` with the host's registries and `knownRoles`. It
prints the sentences boot prints, with the file name in front and no stack
traces; exit code 1 on an error, warnings listed. An agent runs it after
writing; CI runs it on the examples and on the host's pages.

### The examples

`pnpm docs` writes one `examples/<page>.page.json` per demo page through
`pageFile` — the same cut Export page makes, so what a reader sees in the
playground and what they read are one thing. `examples/README.md` is
hand-written: a paragraph per page naming the cells that prove a feature
(a table the server describes; a control writing a global setting; a
widget under a condition; a card holding a layout; a role's view; css-grid
areas; four engines on one page). A unit test asserts every cell it names
exists in the file it names.

### Tests and acceptance

- `catalog.test.ts` (engine): `describeRegistries` lists a button's
  settings with defaults and descriptions, the table's `load` event, a
  predicate's phrase; `catalogMarkdown` holds the rows;
  `pageFileJsonSchema` accepts a demo page's file and refuses a cell
  without an `id`.
- `docs.test.ts` (playground): the folder equals a fresh generation; every
  example parses, merges and validates with zero errors; every cell the
  README names exists.
- `pages-check`: a broken file (an unknown widget, a forbidden path) gives
  the two sentences and the exit code.
- The acceptance is a TRIAL, not a review of the prose: an agent given
  ONLY `AGENTS.md` and `doc/authoring/`, asked for a page in one sentence,
  produces a file `pnpm pages:check` accepts on the first or second try.
  Run once, the transcript kept in the story; not automated.

### Phases

| Phase | Work                                                                                                                                                                                 | Estimate |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1     | `AGENTS.md` and the guide; the examples exported by a script with `examples/README.md`; `pnpm pages:check` with its test; the examples' unit test; README and `CLAUDE.md` pointers   | 1 day    |
| 2     | `describeRegistries`, `catalogMarkdown`, `pageFileJsonSchema` with tests; `pnpm docs` writing the catalog and the schema; `pnpm docs:check` in `pnpm check`; the trial with an agent | 1 day    |
| 3     | What the trial shows: the rules the agent missed moved into `AGENTS.md`, the check's sentences made clearer                                                                          | ½ day    |

After that, each only when asked for:

- an MCP server exposing `describe` (the catalog as JSON) and `check` —
  when a second host embeds Wirework;
- the guide and the script shipped in `@wirework/engine`'s `dist`, so a
  host gets them from npm;
- a `docs` field on a contract, rendered by the catalog, when
  `.describe()` is not enough — only when a trial shows the need.

## 4. Options weighed

How does an author learn to write a page that boots, in a host they have
never seen, without a developer? The design composes all five answers.

| Option                                         | Verdict                                                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. A handbook in prose                         | Kept only for the model and the rules no schema states, capped at a page and a half. As THE answer it rots, cannot know a host's own widgets and actions, and an agent will not read it whole.    |
| B. A catalog generated from the registries     | Chosen as the reference. It is the builder's form on paper, so it cannot disagree with the builder; it runs IN THE HOST, so it lists the host's own kinds and actions; CI fails a stale copy.     |
| C. A JSON Schema of the page file, and a check | Chosen. The schema lets an editor complete and an agent validate a draft; it cannot follow a widget template's shape, so the check command — what boot would say, before boot — is the real gate. |
| D. The demo pages as examples                  | Chosen as what makes the rest usable: an agent learns faster from a worked example. Not the whole answer — an example says what, not what else is possible. They cannot drift: a test loads each. |
| E. An `AGENTS.md` entry point                  | Chosen: the convention coding agents look for. Without the door an agent opens the fixtures first.                                                                                                |
| Tools instead of documents (an MCP server)     | Not first: the folder costs a day and serves people too, and the server would wrap the same two functions, so nothing is wasted.                                                                  |

Why generated over polished: "polished" is what rots. Documentation stops
being a chore — register a widget with its `.describe()` strings,
`pnpm docs` updates the catalog, `pnpm check` says when it was forgotten.
The guide changes only when the MODEL changes, which is rare. Nothing is
new to the engine's model, and a reader installs nothing.

Risks:

- **A green schema is not a correct page.** The schema says so itself and
  the door says the check is the gate, or an agent will trust the schema
  and ship a wrong template.
- **`AGENTS.md` at the root of a library repository** is read by agents
  working ON the library too: its first line says who it is for.
