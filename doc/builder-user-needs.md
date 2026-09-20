# What users want to be able to do with the builder

Written 2026-09-20 by two members of Team Tiger:

- **Morgan (Product Owner)** wrote the wants — from the product sketch
  (`widgets.jpg`), the design docs, the plain-language scenarios
  (`e2e/features`) and the wording a user sees in the builder. She does not
  read code.
- **Alexei (Architect)** then checked every want against the code: what
  exists today, what is missing, the smallest design that fits, its rough
  size and what it depends on.

Nothing here is built unless the **Today** column says so. This is a needs
analysis and a proposed order, not a commitment.

**How to read the tables.** *Priority* is Must / Should / Could for a first
customer release (Morgan). *Today* is verified in code (Alexei), and differs
from the scenarios in a few places — those are called out. *Size* is rough:
**S** ≤ 1 day, **M** 2–4 days, **L** ≥ 1 week. *Depends on* names other
wants, a foundation (section 5) or a phase of an existing design doc.

## 1. Who uses the builder

| Who | Wants | Must never need to know |
|---|---|---|
| **Page author** — an analyst or QA lead at the customer | a working dashboard the same day, with no developer ticket | paths, payloads, engines, JSON |
| **Team admin** | to publish shared pages and team views (the sketch's default / simple / e2e / regression pills) and decide who may edit them | how pages are stored |
| **End user** | their own layout and settings ("my own") and a way back to the team's page | the word "overlay" |
| **Developer** | to add a widget or a named action once and see it in the palette with a preview | — but must never be NEEDED for a new table or page |

## 2. The wants

### Finding and adding widgets

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W1 | Find a widget by its look and an everyday name. *Done when* searching "dropdown" finds Select, and cards say "Label", not "antd-label". | Must | Partly — live previews and search exist; a card prints the technical type, and no widget has a human title | an optional `title` on contracts and definitions (schema); the palette shows and searches it | S | Names |
| W2 | Add a widget by filling only the essentials. *Done when* a newcomer adds a label and a button unaided, and the form says what is missing. | Must | Partly — one yes/no "can add": the Add button is only greyed, required fields carry a `*` | list what is missing from the same checks; required fields first, optional ones collapsed (playground) | S | — |
| W3 | Drag a card from the palette to the spot I want. *Done when* the card lands where I release it. | Should | Not built (previews phase 3); `appendCell` takes no position | an optional placement hint on `appendCell`; external drop in the two grid engines, the others append | M–L | W19 |
| W4 | The sketch's missing widgets: view pills, date range, switch, radio, link, avatar. *Done when* the sketch's filter bar and pills can be rebuilt from the palette alone. | Should | Not built — switch, radio-group and segmented are "next" in `widget-catalog.md`, the others "later" | a contract, an antd implementation and stories each; date range needs a value-format decision | S each | W16 (link) |

### Connecting widgets to data

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W5 | Point a table at our runs address ("Fetch from URL…") with no developer. *Done when* I paste an address and rows appear, no JSON touched. | Must | Not built — no data sources in any package (`refresher-design.md` phases 1–3) | as designed: named sources in the view models, a runner, `source/refresh`, loading on open, "Fetch from URL…" in the builder. **New concept: data source** | L | W13, W7 |
| W6 | Pick data from a named list that shows sample values. *Done when* every data field is a picker and nothing is typed from memory. | Must | Partly, **weaker than it looks** — suggestions are bare path strings of values CURRENTLY in the store; a fresh builder page has no data, so it offers nothing; reaction targets get no suggestions at all | suggestions carry path, sample value and title, grouped by source | S–M | W5, Names |
| W7 | Set table columns (title, order, hide) and dropdown options in a form. *Done when* I change columns without opening State. | Must | Not built — the form skips non-primitive settings (they do survive a save); columns and options are edited as JSON | a "list" setting kind for arrays of simple objects — covers table `columns` AND select `options`; a row editor; `hidden` on a column | M | — |
| W8 | Make a column a link to the run; add row actions (the sketch's "repeat"). *Done when* clicking # opens that run. | Should | Not built — a column is `{ title, property }`, the table has one event | a column kind "link" that SELECTS a row property holding the URL; a `rowActions` list and a `row-action` event | M | W7, W13, W16 |
| W9 | Sort by clicking a column header. *Done when* clicking "Status" reorders the rows. | Should | Not built | controlled like pagination: a `sort` port and a `sort-changed` event; the source's query reads it (the server sorts) | M | W5 |
| W10 | See loading, "Updated 12:03:05" and a plain error while the last good rows stay. *Done when*, with the server off, a message appears and the rows remain. | Must | Partly — `loading` only; **a failed request writes nothing to the store** and reaches only the browser console | `refresher-design.md` phase 4: source status with error and updated-at, a table `error` port, a refresher `updatedAt` port | S–M | W5 |
| W11 | Put a refresher by a table and choose "refresh: runs table", off by default. *Done when* I choose the table from a list that names it. | Must | Partly — off by default is built; the demo calls a developer-written action. Hazard: any author can pick `runs/load-page` on ANY page, because actions have no scope | `source/refresh`, whose `source` parameter renders as a select of the named sources | S | W5, W13 |

### Making widgets talk, and deciding what a click does

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W12 | Connect two widgets by picking the other one. *Done when* a counter and a display are wired with zero typing. | Must | Partly, weak (as W6) — a path another widget WILL write is not offered until someone has used it | a "wiring index" derived from the page plan: who reads and who writes each path; a picker "value of ‹widget title›"; a controlled widget's port-and-event pair becomes ONE field with a generated path. **New, derived only** | M | Names |
| W13 | Choose what a click does from described actions, and fill their options. *Done when* an action's options (which page…) appear as form fields. | Must | Partly — actions have no declared parameters; an existing `with` is preserved but cannot be edited | `actions-design.md` phase 1: `params` rendered with the same introspection as widget settings, `with` validated, `scope` | S–M | — |
| W14 | Run several steps in order on one event, each editable. *Done when* all steps are listed and editable, not "then 2 more reactions, kept as configured". | Should | Partly — the first step is editable, the rest are kept; the engine already runs ordered lists | a step-list editor per event, including literal values (playground) | M | W13 |
| W15 | Dependent filters (Applications → Test suites) without a developer per pair. *Done when* the second filter narrows with no developer involved. | Could | Not generic — one developer-written action per pair | the child's options are a data source whose query reads the parent's path; the parent's change refreshes it; one core action prunes stale choices | S | W5, W13 |
| W16 | A button opens another page or a dialog; a confirmation message afterwards. *Done when* "Open run" navigates and a "Saved" message shows. | Should | Not built (actions phase 2); navigation is React state in the playground | core actions `nav/go`, `dialog/open-page`, `notify/show`. **New: navigator, dialog and notifier host services** | M–L | W13, W25 |
| W17 | Ready-made input checks (required, email, own pattern and message). *Done when* a wrong email shows my message. | Must | **Built** | — | — | — |

### Laying out the page

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W18 | Drag, resize and remove widgets in one Edit page session, then Save or Cancel. *Done when* Cancel restores everything. | Must | **Built** (the flex-rows engine is not interactive) | — | — | — |
| W19 | Add widgets while editing. *Done when* I never see "Save or cancel the page edit first". | Should | Not built — Add is disabled during a session | adding becomes a session step like drag and remove (playground) | S | — |
| W20 | Choose a page style in plain words (grid, tabs) and change it later. *Done when* no engine names are shown and the style is not locked. | Should | Partly — the choice locks after the first widget; engines have only technical names | an engine `title`; "re-place, don't convert" (section 6) | S–M | Names |

### Trying it out safely

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W21 | Undo or redo one step. *Done when* Undo brings back a removed widget. | Should | Not built — Cancel drops the whole session; edits are already replayable steps | undo moves the last step to a redo stack (playground) | S | W19 |
| W22 | Be warned before leaving with unsaved work. *Done when* switching page asks me first. | Must | Not built — switching page cancels silently; no browser leave warning (moot while nothing persists) | a guard on pending changes and a dirty form | S | W24 |
| W23 | One broken widget never takes the page down. *Done when* the others keep working and a plain message takes its place. | Must | **Built** — per-widget and per-layout boundaries. Gap: a failed ACTION is invisible (W34) | — | — | — |

### Saving, publishing and sharing

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W24 | My saved page is there tomorrow, and for colleagues. *Done when* the page is intact after a reload. | Must | Not built — no storage code anywhere; every playground visit starts from the page's initial state | a host repository for the view models (load, save, a schema version); ONE write path for configuration (today there are three); a local adapter first, then HTTP; the engine is untouched. **New: repository (host service)** | M local, L shared | W19 |
| W25 | Several named pages with a menu between them. *Done when* two pages exist and are linked. | Must | Not built — two hard-coded pages | pages come from the repository; a new page is the engine's empty template; page metadata (title, order). **New, small: page metadata** | M | W24 |
| W26 | Keep a draft apart from the published page, preview it, roll back. *Done when* users see changes only after Publish. | Should | Not built | the repository keeps draft, published and versions; preview is the same renderer on the draft tree | M | W24 |
| W27 | Decide who edits the shared page and who only personalises. *Done when* a role decides, not a "user overlay" checkbox. | Should | Not built — the edit target is "which page plus a checkbox" | a role picks the edit target; the server enforces it; the overlay schema already forbids rewiring. **New: role (host)** | S UI, M server | W24 |

### Personal views

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W28 | Rearrange, hide and restyle for myself without touching the shared page. *Done when* a colleague still sees the original. | Must | **Built** (but see risk 3) | — | — | — |
| W29 | Switch named views with pills (default / simple / e2e / regression / my own) and keep several of my own. *Done when* pills switch views and I can save two personal ones. | Should | Partly, **further along than it looks** — the engine supports many named base and user templates and a selected view; only the playground hard-codes one "my-own" and has no switcher | a switcher and "Save as view…" in the host's own chrome | S–M | W24 |
| W30 | "Reset to the team's page" for the whole page, one widget or one setting. *Done when* one click restores it. | Must | Partly — the toggle only hides the personal view; worse, a save copies every default into it, so a personal copy masks later team changes | save a DIFF against the shared page; reset at three levels (a setting, a widget, the page) | M | — |
| W31 | My filters, page size and refresh schedule are remembered. *Done when* my next visit opens as I left it. | Should | Not built | the shared page declares which DATA paths persist per user; the host stores those values and seeds the visit. **New: persisted paths** | M | W24 |

### Reusing work

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W32 | Duplicate a widget with its settings and connections. *Done when* a working copy appears beside the original. | Should | Not built | a "duplicate" step; ask "same value or its own" | S | W19, W12 |
| W33 | Start from a template ("table + filters + pagination + refresher") or a copy of a page. *Done when* the template works after I only choose the data. | Should | Not built | a blueprint: a view-model fragment instantiated with fresh ids and paths; copying a page is the same operation. **New, data only** | M | W25, W5 |

### Understanding and fixing problems

| ID | Want · *done when* | Priority | Today | What it takes | Size | Depends on |
|---|---|---|---|---|---|---|
| W34 | See problems in plain words, pointing at the widget, with a way to fix. *Done when* I read "Table 'Runs' has no data connected" and can click to fix it. | Must | Partly, **worse than it looks** — a broken widget cannot be opened: Edit is disabled on it and the editor fills in only from a valid configuration; today's fix is Remove or the JSON inspector. Four different causes read as one sentence | structured problems with a plain-text map; "Fix" opens the editor from the RAW configuration; an error channel for failed reactions | M | Names |
| W35 | See what each widget reads, changes and triggers, on the page itself. *Done when* I click a widget and its connections are highlighted. | Should | Not built — only the State JSON and the event log | the wiring index (W12) shown in the edit chrome | S–M | W12 |

Renaming the jargon (section 3) and a "Developer tools" switch are
playground-only work: **S**.

## 3. What users must never have to see

The words on the left are in the builder today.

| Today | Plain wording |
|---|---|
| "input: value", "select a store path…", "store.path" | "Show data from…", "Choose data…" |
| "(empty path shows 0)" | "Shows 0 until connected" |
| "Emits", "This widget emits no events." | "When something happens", "Nothing to set up here" |
| "on incremented: set store path / call action" | "When clicked: Save the value to… / Run an action…" |
| "from payload", "whole payload", "field (optional)" | "Which value?", "Everything" |
| "then 2 more reactions, kept as configured" | "…then 2 more steps" — and the steps editable (W14) |
| "engine", "choose an engine…", "react-grid-layout", "gridstack", "flexlayout" | "Page style: Grid / Tabs" |
| the "user overlay" checkbox; the tag "edits → user overlay / view models" | "My view"; "You are editing: my view / the shared page" |
| "Your view changes settings only. Inputs and reactions belong to the shared page — turn the user overlay off to change them." | "You're changing your own view. Connections belong to the shared page." |
| "Edit cell custom-1" | "Edit 'Status label'" — names the author gives |
| "antd-label" and the kind tags; "antd-crash", "antd-echo" in the palette | "Label"; test widgets hidden from customers |
| "runs/load-page", "log-event" | the description first: "Load this page of runs" |
| "view models: OK", "Broken-widget registration", the State and Events panels | behind a "Developer tools" switch |
| raw patterns such as `^[A-Z]{3}-[0-9]+$` | ready-made rules first, patterns under "Advanced" |

## 4. What users should NOT be able to do

| Guardrail | Today |
|---|---|
| Break the shared page for everyone by personalising | Protected: personal changes live in a separate tree |
| Rewire connections or actions from a personal view | Protected: read-only in the editor, and the schema rejects it |
| Redirect a page's requests from a personal view; put credentials into configuration | Designed (`refresher-design.md`, decisions 2 and 7), not built |
| Lose work silently — leaving, reloading, switching pages | **Open**: W22, W24 |
| Publish a page with known problems without being told | Live validation exists; publishing does not (W26) |
| Add a widget that cannot work | Protected by the Add gate — which must also explain itself (W2) |
| Auto-refresh on by default; polling from a hidden tab | Protected by the refresher contract |
| Type code anywhere | Protected by design: two reaction verbs, actions picked by name |

## 5. Foundations several wants share

| # | Foundation | Unlocks |
|---|---|---|
| 1 | **Names** — an optional `title` on contract and definition, port, event, action, layout engine and CELL (one line: every engine extends the same cell schema) | W1, W6, W11, W12, W20, W34, W35, the jargon pass |
| 2 | **One write path + a repository** for the view models | W19, W21, W22, W24–W27, W29, W31, W33 |
| 3 | **Action parameters and scope** (`actions-design.md` phase 1) | W13, W11, W5, W15, W16, W8 |
| 4 | **List settings** in the form | W7, W8, W4 (options), W5 (the query form) |
| 5 | **Data sources** (`refresher-design.md`) | W5, W6, W9, W10, W11, W15, W33 |
| 6 | **Wiring index** (derived, never stored) | W12, W35, W34, W32 |
| 7 | **Page list + navigator** | W25, W16, W33, the link widget |
| 8 | **Identity and role** | W27, shared W24, W31 |

## 6. Where a want meets one of the architecture's rules

- **W15 dependent filters vs "reactions never transform".** The SERVER
  filters, through a source whose query reads the parent's path; pruning
  stale choices is a named core action. Configuration still only selects.
- **W12 "pick the other widget" vs path-based binding.** Paths stay the
  model; the picker is a view over the wiring index plus generated paths. No
  widget-to-widget reference enters the schema.
- **W20 changing the page style vs "no conversion between engines".**
  Re-place, don't convert: a NEW template of the target engine is built from
  the same cells, so identity, settings and wiring carry over; positions
  start over; the old template stays as the way back.
- **W31 remembered filters vs "a personal view carries settings only".**
  Remembered values are DATA, not configuration: the shared page declares
  which paths persist, the user's document holds only values.
- **W29 view pills vs "a reaction may not write configuration".** The view
  switcher is host chrome, not a widget bound to the user's view models.
- **W8 link columns.** A link column SELECTS a row property that holds the
  URL; building URLs is adapter code on the data source.
- **W24 persistence vs "every visit starts fresh".** The rule stays: the
  initial state becomes the LOADED configuration plus the declared persisted
  values.

## 7. Proposed build order

Morgan's five to fund first, by customer impact: **W24** (saved pages
persist — "there is no product without this"), **W5** (fetch from URL —
"no developer ticket is the promise we make"), **W7** (columns and options
in a form), **W6** (pick data, don't type paths), **W10** (loading, updated
at and a plain error — "stale data that looks fresh destroys trust"). The
renames of section 3 are cheap and ship with whichever goes first.

Alexei's increments, each shippable. All five land in the first three.

| # | Increment | Wants | Rough size | Why here |
|---|---|---|---|---|
| 1 | **Nothing is lost** | W19, W21, W24 (local, versioned), W22 | ~1 week | one write path and a version stamp must exist before any schema grows |
| 2 | **Forms without JSON** | Names, W1, W2, W7, W13, W14, the jargon pass and Developer tools | ~1.5 weeks | "Fetch from URL…" IS a list form plus a parameter select, so W7 and W13 come before W5 |
| 3 | **Live data** | W5, W6, W10, W11, then W9, W15 | ~2 weeks | |
| 4 | **Wiring you can see** | W12, W35, W34, W32 | ~1.5 weeks | |
| 5 | **Pages and sharing** | W25, shared W24, W27, W26, W16, W33 | ~2–3 weeks | needs identity |
| 6 | **Personal views** | W30 first, then W29, W31, W20; W4, W8, W3 as capacity allows | ~1.5 weeks | |

Roughly 10 weeks in all; the sizes are rough.

## 8. Risks of building a builder for non-technical authors on this design

1. **Saved pages vs strict, evolving schemas.** Every schema is strict and a
   cell names the IMPLEMENTATION (`antd-table`); once pages are saved (W24),
   any renamed setting, port, action or widget breaks them. *Mitigation:* a
   schema version and migrations per contract, golden saved pages in tests,
   deprecate-never-rename; revisit cells naming a kind instead
   (`widget-contracts-design.md`).
2. **Paths are the real model.** Nothing checks that a bound path is ever
   written, or written by one widget only. *Mitigation:* wiring-index
   warnings, generated paths, pickers; free text behind Developer tools.
3. **Personal views are copies.** "My own" copies the whole page template;
   once persisted, team changes never reach users who personalised.
   *Mitigation:* W30's diff-saving BEFORE personal views persist; stamp the
   copied version and offer "the team's page changed".
4. **Actions are the only escape hatch** — and they get the whole store,
   configuration included, with no scope and no parameters. *Mitigation:*
   parameters and scope first; a data-only store for actions by default; a
   small curated core; a mandatory title.
5. **Silent runtime failures.** A rejected action reaches only the console;
   the author sees "nothing happened". *Mitigation:* source status plus an
   error channel rendered in plain words (W10, W34).

## 9. Open points for a decision

- **Musts that land late.** Four Musts fall outside the first three
  increments: W12 and W34 (increment 4), W25 (5) and W30 (6). If "first
  customer release" means increments 1–3, either these move up or their
  priority is really Should.
- **Risk 3 contradicts the order as written.** W30 (diff-saving) is in
  increment 6, yet it must exist before personal views persist, and
  increment 1 introduces persistence. Either increment 1 persists SHARED
  pages only and personal views stay in memory until W30, or W30 moves into
  increment 1.
- **Where saved pages live** (W24): browser storage proves the flow but does
  not meet "and for colleagues"; a server with identity (foundation 8)
  does.
- **Cells naming a kind instead of an implementation** (risk 1): cheaper to
  decide before anything is saved.
