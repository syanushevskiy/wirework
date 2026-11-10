# Roles — one page, different for an admin and for everybody else

Designed 5 November 2026 with the tiger team (doc/team_tiger.md), at the
product owner's ask. Status: BUILT 6 November 2026, both phases (story
WW-31 in doc/product-stories.md) — see "Built" at the end for what the
build changed about the design.

## The ask

"Roles for widgets and functionality. On one page an admin has additional
filters for the table, fires a separate action with additional filter
data, sees some buttons, or a card, that others do not — depending on the
role."

Three things hide in that sentence, and they are not the same thing:

1. **Show or hide a widget by role** — a button, a card.
2. **A different LAYOUT by role** — the admin's runs page has a filter the
   others' does not, and no hole where it would be.
3. **Different WIRING by role** — the admin's table loads with another
   action, or the same action with more arguments; the admin's filter
   writes a path the others' page never writes.

## What there is

- **The role is in the store.** The session request answers with
  `user: { name, role }` and `permissions: { editPages }`; the host's
  session loader writes `app.user` and `app.permissions`
  (`actions/session-loader.ts`). Global state, present on every page of
  the demo application. One role as text today; the fixture's is "QA
  engineer".
- **Conditions** (doc/conditions-design.md, WW-25): a widget's `when` is a
  list of tests over store paths with named predicates, AND of ORs, or the
  constructor in words. The design doc already shows the role case —
  `{ path: "app.permissions.role", is: "one-of", to: ["admin", "owner"] }`
  — and it works today against `app.user.role`. A hidden widget leaves its
  cell in the layout as a blank (accepted then: no reflow on store
  changes). A `when` lives in the widget's template beside `inputs` and
  `on`; the user overlay may not carry one.
- **Page views** (doc/page-views-design.md, WW-22): a page has several
  prebuilt templates (`viewModels.pages.runs.default`, `.compact`), the
  user picks one in the overlay (`userViewModels.pages.runs.view`). A view
  is a LAYOUT of the same page: which cells, where. Two views may hold
  different cells — the overview's `compact` has three of the default's
  eight.
- **The user overlay** (`userViewModelsSchema`): per page a chosen `view`,
  own `templates`, and per CELL a chosen widget template (`view`) and
  settings overrides per template. It is applied on top of the base in
  `resolvePage` / `resolveCells` (`pageTemplates` for the page,
  `userWidget` for the cell). Settings only — never `inputs`, `on`, `when`.
- **Widget templates**: a cell names a model path and a template
  (`widgets.runs.table` / `default`); the model may hold several templates
  (`default`, `loud`), each with its own wiring — a template may call a
  different action with different `with`. Which template a cell uses is
  the cell's `template`, or the user overlay's `view` for that cell.
- **Actions**: `{ call, with }`; the handler gets the event, the store and
  the parsed `with`. The table's `load` declares the view
  (`table-view/load` with `url`, `into`, `filters`, `columns`); the
  request carries `filterIn` and `filterLike` from the store. The team
  rejected `when` on reactions in the conditions review: "an action
  decides what it does".
- **Permissions already gate the builder**: `editPages` fails closed
  (`use-playground.ts`); the e2e suite sets it with
  `the store holds at "app.permissions"`.

## The question, and five answers

How does one page differ by role, without a second page and without an
expression language?

**A. Conditions only.** `when` on every role-dependent widget
(`app.user.role is one of "admin"`). Exists. Covers 1. Fails 2 — the
others' page keeps a blank where the admin's filter sits, and a card-sized
blank is not a page anyone ships — and fails 3 — the table's `load` is one
list, so an admin cannot load differently without a conditional reaction.
**Kept** as the right answer for the single widget: cheap, in the form
already, no new concept.

**B. A page per role.** `runs` and `runs-admin`, the router picking by
role. Covers 1, 2 and 3 with nothing new. Rejected: two pages to keep in
step — every change to the runs page is made twice, and the day they drift
nobody knows which is right. Also the admin IS a user of the plain page:
the personal view they saved must survive their promotion.

**C. A ROLE LAYER — the overlay shape, keyed by role, between the base
and the user.** `viewModels.roles.admin` holds, in exactly the user
overlay's shape, what the admin's pages are: a page's chosen `view`, own
`templates` (the admin layout with the extra filter), per-cell widget
`view` (the table on its `admin` template, whose `load` calls the admin's
action) and settings. Resolution becomes base → the user's roles → the
user's own. Covers 2 and 3 with ONE new key and NO new grammar: a role's
layout is a page view, a role's wiring is a widget template, both things
the engine, the builder, the validation and the file already have.
**Chosen.** The role never carries `inputs`/`on`/`when` itself — it picks
a TEMPLATE that does, so the wiring stays in the templates where boot
validation reads it.

**D. `when` on reactions, or a `role` field on them.** "Call `runs/load-all`
when the role is admin." Rejected again, for the same reason as in the
conditions review: a conditional reaction is a workflow engine by
accretion, and the same result is a second template picked by the role
layer, which validation can read whole.

**E. A roles registry in the engine, like predicates.** The engine would
know which roles exist and check every reference. Rejected: the engine
has no business knowing an application's roles; they come from the
session, change without a release, and the names in `viewModels.roles`
are validated the way page names are — by what the configuration itself
declares. The HOST tells the builder which roles there are to edit for,
as it tells it which pages there are.

## The design

### The shape

```ts
// @wirework/schema, models/view-models.ts
export interface ViewModels {
  pages: Record<string, Templates<PageViewModel>>;
  widgets: Record<string, unknown>;
  on?: Record<string, PageBindings>;
  /** What a ROLE's pages are, on top of the base: the overlay shape, keyed by role name. */
  roles?: Record<string, UserViewModels>;
}
// roles: z.record(ROLE_NAME, userViewModelsSchema).optional()
```

```ts
// the runs page for admins: an extra filter in the layout, the table on its admin template
roles: {
  admin: {
    pages: {
      runs: {
        view: "admin",
        templates: {
          admin: { engine: "react-grid-layout", cells: [
            /* the default's cells … */,
            { id: "select-owner", widget: "antd-select", model: "widgets.runs.ownerFilter", template: "default", x: 9, y: 0, w: 3, h: 2 },
          ] },
        },
        cells: { "table-runs": { view: "admin" } },
      },
      settings: { view: "admin" },   // a prebuilt view that holds the "Danger zone" card
    },
  },
}

// the table's second template: the same table, loaded for every owner, with the owner filter in the request
widgets.runs.table: {
  default: { …, on: { load: [{ call: "table-view/load", with: { url: "/api/v1/view/runs", into: "runs", … } }] } },
  admin:   { …, inputs: { …, filterIn: "runs.filterIn" },
             on: { load: [{ call: "table-view/load", with: { url: "/api/v1/view/runs/all", into: "runs",
                             filters: { owner: { label: "Owner", values: ["alice", "bob"] } }, … } }] } },
}
widgets.runs.ownerFilter: { default: { inputs: { value: "runs.filterIn.owner", options: "app.lists.owners" },
  on: { changed: [{ set: "runs.page", value: 1 }, { call: "table-view/load", with: { into: "runs" } }] }, label: "Owner" } }
```

- A role name follows the action grammar (`ROLE_NAME`: kebab-case, one
  optional namespace — `admin`, `ops/on-call`), so a role is a word in a
  sentence (`app.user.roles has the role "admin"`) and a file name.
- A role's entry is the user overlay's schema REUSED, not copied: a page's
  `view`, `templates`, `cells` with `view` and `settings`; strict; no
  `inputs`/`on`/`when` in its settings — the same rule, for the same
  reason: wiring belongs to the templates, where validation reads it.
- Roles may ADD prebuilt templates (the admin layout) — they are shared
  configuration, in the application's tree, exported with the page
  (the page file gains a `roles` section cut the same way: the page's
  entry in every role).

### Who has which roles

The engine does not know. The host tells it, per resolution, which roles
THIS user holds, in the order they apply:

```ts
// @wirework/engine, ResolveInput
roles?: readonly string[]; // the user's roles, least to most specific; absent or empty: the base alone
```

The host reads them from the store — the demo's session answers
`user: { name, role }` today and will answer `roles: ["qa"]`, a list,
because people hold several: a QA who is also an admin holds
`["qa", "admin"]`, a Wirework admin `["qa", "admin", "wirework-admin"]`. One line
in the host: `roles: store.get("app.user.roles")`. A role in the list
that the configuration has no entry for is simply nothing — a user may
hold roles the pages do not care about; a role in the configuration nobody
holds is a boot WARNING (dead configuration, like an overlay for a cell
that is not there), never an error.

### Several roles at once

A user with several roles gets ONE page, so the layers must combine by a
rule a page builder can predict. The rule is the fold's order and nothing
else — no inheritance, no priorities in configuration:

- **The order is the session's.** The server answers the roles from the
  broadest to the most specific (`["qa", "admin", "wirework-admin"]`), and the
  host hands them on as they came. The server knows that a Wirework admin is
  also an admin; the configuration does not have to say it twice and the
  engine never has to know it at all. A role entry has no `extends`: a
  hierarchy belongs where the roles are granted.
- **Later wins, per thing.** For every fact the fold reads — a page's
  view, a cell's template, one setting — the LAST role that sets it wins,
  then the user's own choice over all of them. The admin's entry sets the
  runs page's view to `admin`; the Wirework admin's entry sets nothing for the
  runs page, so a Wirework admin sees the admin's runs page; the Wirework admin's
  entry sets the settings page's view to `wirework-admin`, so there they see
  their own. Settings `deepMerge` the same way, one key at a time.
- **A role sets only what differs.** The Wirework admin's entry is small: the
  pages and cells where a Wirework admin differs from an admin. Two roles that
  both set the SAME page's view (`admin` → `admin`, `ops/on-call` →
  `on-call`) are a conflict for a user who holds both; the fold still picks
  the later, and boot validation WARNS when two role entries set the same
  page's view or the same cell's template to different names, naming both
  roles — a page builder then decides on purpose, with a view that serves
  both or a `when`.
- **One more widget for the stronger role is a `when`, not a view.** A
  Wirework admin who gets the admin's runs page plus a "Delete" button does not
  get a third layout that repeats the admin's: the button sits in the
  admin layout with `when: app.user.roles has the role "wirework-admin"` — a
  button-sized blank for admins, which is what `when` is for. A role gets a
  layout of its own only when the PAGE differs (more than a widget, another
  arrangement), which is the layout-versus-condition guidance in one line.
- **Predicates read the list.** `user/has-role` holds when the list
  contains the name; "is one of" and "equals" are for a single value and
  do not apply to the list — the builder's help says so beside the host's
  phrase. For "admin or Wirework admin" the condition is the constructor:
  `app.user.roles has the role "admin" or app.user.roles has the role
"wirework-admin"` — or, since the session orders roles by strength, the
  server grants `admin` to every Wirework admin and one test suffices.

### Resolution: base → roles → user

One rule, applied at the three places the user overlay is applied today,
each a fold over the layers in order (the base, then each role, then the
user):

- **The page's templates** (`pageTemplates`): the base templates, each
  role's own templates layered on by name, the user's last. The admin's
  `admin` layout is offered in the view list as "prebuilt" — it IS prebuilt,
  for admins.
- **The shown view**: the user's `view` if set, else the last role's `view`
  that is set, else `default`. A user who chose a view keeps it; a user who
  chose nothing sees their role's page.
- **A cell's template**: the user's `view` for the cell, else the last
  role's, else the cell's `template` — the existing fallback chain with one
  more link, the same `pickTemplate` with one more candidate, the same
  fallback note when a name is missing.
- **A cell's settings**: the base template, then each role's settings for
  that template, then the user's, `deepMerge`d in that order — a role may
  retitle a card for admins, and the admin may still retitle it for
  themselves.

`roleOverlays(viewModels, roles)` is one `flatMap` over the roles to the
entries that exist; the fold is `[...roleOverlays, userViewModels]` where
today one overlay is read. `locateLayoutAt` and the containers' inner
overlays take the same list. Nothing else in resolve changes; `when` stays
what it is and keeps working for the single widget.

### Validation

Boot validation walks `viewModels.roles` as it walks the user overlay
(`checkOverlay` per role, then the cells): a role's `view` naming a
template nobody has, a cell key no layout has, settings for a template
that does not exist — reported under `roles.admin.pages.runs`, in the
same sentences. A role's own templates are validated by their engine like
any page template, and their cells resolved — so the admin layout's
`select-owner` cell is checked against its widget and its paths at boot,
not when an admin first opens the page. A role nobody in the fixture's
session holds is a warning (see above).

### Showing and hiding a single widget: unchanged

For "this button is for admins" the answer stays the `when`, in the form,
in words. Two things make it read better:

- The session answers `roles` as a list, and a host predicate
  `user/has-role` with the phrase "has the role" reads it
  (`app.user.roles has the role "admin"`): the standard eight stay eight
  (`contains` over the list's JSON would also match "wirework-admin").
- Guidance in the builder's "Show when" help and in this doc: one widget →
  `when`; a different page → a role layer; different DATA → the server.

### Different data: the server's job

The admin's table "fires a separate action with additional filter data" —
a different URL, or an extra fixed filter. That is a second TEMPLATE of
the table, picked by the role layer; the request it sends is the same
`table-view/load` with other arguments. What the server answers is the
server's decision from the session it sees: a role layer is a USER
INTERFACE arrangement, not access control. A plain user who types the
admin's URL into the inspector gets what the server allows a plain user —
nothing else, or this design is wrong (Ren's point, below).

### The builder

The builder today edits for everyone (overlay off, target `base`) or for
me (overlay on, target `user`). It gets the third: for a ROLE.

- The toolbar's edit target becomes a choice: "edits → view models",
  "edits → role: admin", "edits → user overlay" — a select of the roles the
  HOST lists (`roles: readonly string[]` on `usePageToolbar`'s input, the
  demo's from `app.lists.roles`), the overlay switch as today. With a role
  chosen, every edit — a moved cell, a saved view, a widget's template or
  settings, a card's content — is written into `viewModels.roles.<role>`
  with the SAME ops that write the user overlay today
  (`updateUserPageTemplate`, `updateUserCellSettings`, `updateUserLayoutAt`
  on the role's entry), through the one commit. `EditTarget` grows to
  `"base" | { role: string } | "user"`; the hooks already route by target.
- The page shown while editing for a role is the page AS THAT ROLE SEES IT
  — the builder resolves with `roles: [role]` and no user overlay — so an
  admin's layout is built looking at the admin's page. A "view as" that is
  not an edit is the same selector with the edit session closed.
- Add stays the shared page's: a role's layout holds widgets the page has;
  a widget an admin alone needs is added to the shared page and placed in
  the admin layout only (the default layout simply does not list it).
  That is how "the admin's filter" is made: Add the select on the runs page,
  switch to "role: admin", Save as "admin", remove it from `default`.
- The widget editor on a role target keeps `inputs` / `on` / `when`
  read-only like the user target does, and offers the widget's TEMPLATES
  (`default`, `admin`) as the role's `view` for that cell — the way an
  admin's table gets its admin wiring without touching wiring.

### Demo and scenarios

- The session answers `roles: ["qa"]`; a "Sign in as" select in the
  playground's header (the host's, not a widget) offers three people — a
  QA (`["qa"]`), an admin (`["qa", "admin"]`) and a Wirework admin
  (`["qa", "admin", "wirework-admin"]`) — re-running the session loader, so a
  tester sees the page change without the inspector. The e2e suite keeps
  using `the store holds at "app.user"` for speed and adds
  `I sign in as "admin"`.
- Wirework admin: the settings page gets a `wirework-admin` view with a second
  card, "Sessions" (a table of signed-in users from the fake server), on
  top of the admin's Danger zone; the runs page is the admin's, plus a
  "Delete run" button in the admin layout shown by
  `app.user.roles has the role "wirework-admin"` — the two ways to add for a
  stronger role, side by side in the demo.
- Runs page: for `admin` an "Owner" filter at the end of the filter row
  and the table on `widgets.runs.table.admin`, which loads
  `/api/v1/view/runs/all` (the fake server adds an `owner` property to
  every run and this URL answers runs of every owner); for everybody else
  the page as today.
- Settings page: a "Danger zone" card (`card-danger`: a "Reset every
  setting" button calling `settings/reset-all`) in the `admin` view only;
  the card is not in the default layout, so there is no hole.
- Run page: the existing "Retry possible" tag gets the `when`
  `app.user.roles has the role "admin"` ANDed — the single-widget case,
  with the host predicate.
- Scenarios (`roles.feature`): as QA the runs page has no Owner filter
  and the table loads `/api/v1/view/runs`; signed in as admin the filter is
  there, the table loads `/runs/all`, choosing an owner re-requests with
  `filterIn.owner`; the settings page has the card for admin and four
  cells, not five, for QA; signed in as Wirework admin the runs page is the
  admin's with the Delete button shown and the settings page has both
  cards; the retry tag shows for admin only; a QA who
  saved a personal view keeps it when signed in as admin; in the builder
  "edits → role: admin" saves a view into `viewModels.roles.admin` and the
  state JSON shows it; validation reports a role's view that names a
  missing template.

## The tiger team's positions

- **Morgan (product):** the three asks are one feature to the user — "my
  page looks like my job" — and the answer must not make the page builder
  learn three mechanisms. Accepts the split as long as the builder says
  which to use: a help line under "Show when" ("to hide one widget; for a
  different page use a role"). Wants "Sign in as" in the demo, because a
  product owner demos roles by switching, not by editing JSON. Asks that
  a user's saved personal view survive a role change — nobody should lose
  their layout on promotion.
- **Alexei (architecture):** C is the design the layers already imply:
  base, role, user are three instances of ONE overlay schema applied by
  ONE fold, so no new resolution code paths, no new validation walker — the
  existing ones take a list. Insists the role layer picks templates and
  never carries wiring, so `inputs`/`on`/`when` have exactly one home as
  before. `roles` on `ResolveInput`, not the role name read from the store
  by the engine: the engine does not know where a host keeps its session.
- **Dmitri (readability):** a reader opening `viewModels.roles.admin`
  sees the user overlay they already know, keyed by role — nothing to
  learn. Against any `role:` field on cells, reactions or templates
  scattered through the tree: one place says what admins get. The fold's
  order must be written in one sentence in the code and the doc ("base,
  then the roles in the order given, then the user") and tested with
  three layers that all set the same thing.
- **Katya (team lead):** phase 1 is the schema key, the fold, the
  validation and the demo — no builder — so the team can configure a role
  in the inspector and prove the model before UI is spent on it. The
  builder's third target reuses the user-target code paths or it is not
  built. The host predicate `user/has-role` is four lines in
  `demo/install.ts`; the standard set stays eight.
- **Sasha (QA):** every role fact must be a fact on the page: the cell
  is there or not (`the page has N cells`), the request URL is the fake
  server's log (`the server was asked for "/api/v1/view/runs/all"` — a new
  step over `wirework.requests()`), the shown view is `data-view`. The
  non-technical QAs test roles by "Sign in as" and a written matrix: role ×
  page × expected cells; the Gherkin reads the same. Validation of a
  broken role entry is a unit test with the sentence asserted. The fold
  gets a table test over the combinations of (base has it, a first role
  sets it, a second role sets it, the user sets it) for the view, the
  cell's template and a setting — and the conflict warning its own test
  with both role names in the sentence.
- **Ren (contrarian):** first, the obvious objection — "roles in the
  browser are not security" — and the answer the design must state: the
  layer decides what the page SHOWS and ASKS; the server decides what it
  ANSWERS from the session, every time. If the admin's extra filter works
  by sending a parameter a plain user could also send, the role layer is
  theatre; the demo's `/runs/all` must refuse a non-admin session (the
  fake server checks a header the host sets) or the demo teaches the wrong
  lesson. Second: roles versus permissions. Roles are coarse and
  applications outgrow them ("admin, but not for billing"); the layer
  keyed by NAME does not care whether the name is a role or a permission —
  a host may hand `roles: ["can-see-all-runs"]` — so call the input
  `roles` for the product owner but say in the doc it is a list of names
  the host chooses. Third: several roles with conflicting entries — "last
  wins" is a rule, but the host must be the one ordering the list, and a
  warning when two held roles set the same cell's view differently would
  save an afternoon ("Several roles at once" is that answer). Fourth, on
  Wirework admin: resist `extends` in configuration; the moment a role entry
  inherits another, somebody builds a diamond. The server already knows
  who is also an admin; let it say so in the list. Agrees C beats B: a
  second page is the drift machine every team has built once.
- **Vlad (fluency):** `roleOverlays` is one `flatMap`; the fold is one
  `reduce` over `[...roleOverlays, user]` with the function that merges one
  overlay today; `pickTemplate` takes the candidates as
  `[user?.view, ...roles.map(r => r?.view).reverse(), cell.template]`; the
  predicate is one `includes`.
- **External reviewer:** the minimum is one optional key in the schema,
  one list on `ResolveInput`, the three merge sites taking a list instead
  of one overlay, and the validation walker called once more per role.
  Everything in the builder is phase 2 and reuses the user target. No new
  registry, no new grammar, no new widget.

## Decision

Build C with A kept: the role layer for layouts and wiring, `when` for a
single widget, the server for data. Phases below. Not built: `when` on
reactions, a page per role, a roles registry, any `role:` field on cells
or templates.

## Phases

| Phase | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Estimate |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1     | Schema: `roles` on `ViewModels` (`userViewModelsSchema` per role, `ROLE_NAME`); engine: `roles` on `ResolveInput`, the fold at the three merge sites, `locateLayoutAt` / inner overlays over the list, validation of every role entry (errors and the dead-role warning), the conflict warning; host: `app.user.roles` from the session, `user/has-role`; demo: the admin runs view with the Owner filter and the admin table template, the fake server's `/runs/all` refusing a non-admin, the settings card, the retry tag's role; "Sign in as"; `roles.feature`; unit tests of the fold and the validation | 1.5 days |
| 2     | Builder: the edit target as a choice of everyone / a role / me, the page shown as the role sees it, the editor offering the cell's templates as the role's view, the ops routed to `viewModels.roles.<role>`; the page file's `roles` section; scenarios                                                                                                                                                                                                                                                                                                                                                      | 1.5 days |

## Built (6 November 2026; reviewed by the tiger team and amended 7 November 2026)

Both phases, as designed, with these differences:

- **The layers are one list.** `overlayLayers(viewModels, roles,
userViewModels)` (engine, `layers.ts`) is the fold's input everywhere: the
  roles' entries in the order given, then the user's. `pageTemplates`,
  `locateLayoutAt` and `innerOverlaysAt` take that list instead of one
  overlay; `viewCandidates`, `cellViewCandidates` and `foldSettings` read
  it (the last layer's first; settings `deepMerge`d in order). The resolve
  input says the layers ONE of two ways (`ResolveLayers`): `roles` and
  `userViewModels` for a page, or `overlays` ready-made for a layout inside
  a container — `PageScope` carries the narrowed list, so a role's entry
  for a cell inside a card (`card-1/inner`) applies too. A role entry has
  the tree's shape (`viewModelsSchema` holds `roles` to the overlay schema,
  refused by the state inspector, reported at boot), so it is read as it is.
- **The order of roles is the application's.** `app.lists.roles` lists every
  role the application grants from the broadest to the most specific — the
  same order the session lists a person's. Validation takes it as
  `knownRoles` (a role entry outside it is dead configuration, a warning)
  and checks a role's entry with the roles before it, as a person holding
  it sees the page; the builder shows a role's page the same way.
- **No conflict warning.** The design's warning — two roles setting the
  same page's view differently — fires on the intended case: a stronger role
  overriding a weaker one on the same page, which "later wins" exists for.
  The demo's admin and Wirework admin both set the settings page's view, on
  purpose. Dropped; the fold's order is the rule.
- **Validation per layer.** The shared page is checked as everyone sees it
  (`pages.settings.default`), then once more through each layer at the
  layer's location (`roles.admin pages.settings.default cell[2]`, `user
pages.…`), skipping what was already reported — so a problem a role's
  settings cause names the role. A layer's own templates are checked the
  same way; one wording for a view nobody has.
- **The demo.** The admin's entry puts the runs TABLE on its `admin`
  template (the default template with one other URL,
  `/api/v1/view/runs/all`: the server adds an `owner` column and offers its
  own Owner filter, which the bar shows — no filter cell of the page's) and
  the settings page in an `admin` VIEW with the Danger-zone card; the
  Wirework admin's entry puts the settings page in a `wirework-admin` view
  with both cards — later wins on the one page both set — and their Delete
  button sits in the SHARED runs layout under `when: app.user.roles has the
role "wirework-admin"`: one more widget is a condition, not a view. The
  Retry tag stays everyone's. Deleting is a SERVER call the session must be
  allowed (`runs/delete-selected` refuses every other session), then the
  list is asked again: a role-only action is never a store write a
  condition hides.
- **The server checks the session, not a header.** The fake transport
  hands every endpoint the session (`sessionApi.current().roles`, the way a
  cookie travels); `/runs/all` answers a 403 to a session without `admin`,
  and the page shows it in its error label. `app.user.roles` in the store is
  what the page shows by, never what the server trusts. The request log
  (`wirework.requests().asked`) lists the URLs, for the step `the server
was asked for "<url>"`.
- **"Sign in as" opens the page again.** The host's select above the toolbar
  (`sign-in-as`, the demo's three people by name) sends the session request
  again and, once it has answered, opens the page at its address: a fresh
  visit, its data started over, loaded by the new roles as any page is on
  opening. (A reload in place kept the previous person's filters.)
- **The builder's third target.** `EditTarget` is `"base" | "user" | {
role }`; the toolbar's role choice (`edit-role`, "everyone" or one of the
  host's `knownRoles`) turns the user overlay OFF, and the target reads
  `edits → everyone` / `me` / `role: admin`; every overlay op writes the
  role's entry through `updateRole` with the SAME functions that write the
  user's (`overlayTargetOf`, shared by the views hook) — a prebuilt view
  edited becomes the role's own copy named after the role; the page shown
  is resolved with the known roles up to the role and no user overlay; Add
  PLACES THE WIDGET FOR THE ROLE (since 9 November 2026, below; it was
  locked before); the views list labels a role's templates `role:
<name>`, choosing one sets the role's view, Rename and Delete work on the
  role's own. The widget editor offers the cell's templates
  (`cell-template`, the hook's `templateChoice`) when editing for a role.
  An op edits exactly the layers the plan shows: a user who SEES a role's
  view and edits it gets their own copy, `my-own`.
- **The roles a builder may edit for, from the start (9 November 2026).**
  The product owner asked that the builder page know roles without a
  seed, and that a builder can add the roles the application grants. The
  builder page starts with `app-user` and `admin` in `app.lists.roles`
  (`BUILDER_ROLES`), configuration like its empty page; the toolbar has an
  "add a role" field beside the role choice (`onAddRole` on
  `usePageToolbar`, the field's draft and its problem in the hook,
  `roleNameProblem` exported: kebab-case as every role name, not already
  there), and the host puts the name into `app.lists.roles`. In a real
  host the list comes from the server with the session; the field is for
  building before the server knows the role, and the validation's "is held
  by nobody" keeps saying so until it does.
- **Add, while editing for a role (9 November 2026).** The product owner
  added an input for everyone, chose the admin and tried to add an echo:
  Add was disabled — the design had locked it ("a role picks, it does not
  add") and told the builder to add for everyone first. That is the wrong
  way round for the person building: the widget they want IS the role's.
  Now `useBuilder` takes the editing session's `context` (`usePageEditing`
  returns it) and, when the target is an overlay's, places the cell through
  `pageOp` — the role's own view, a copy of the shown layout named after
  the role when it has none yet, exactly as a move or a removal for the
  role does — while the widget's template goes under the builder's group as
  every template does (templates are the model's, everyone's). Everyone
  else's page is unchanged; the role sees one widget more. The `role-view`
  lock is gone; the user's own view keeps its lock (a personal widget is
  not asked for). `naming.ts` holds the builder's names so that the hook
  may use the ops without a module cycle.
- **The page file** carries `roles`: what every role says about the page
  (`pageFile` cuts it, `mergePageFiles` writes it back under the role — and
  drops a role's entry for the page the file no longer has), and the widgets
  the roles' layouts reference. The role names in a received file are the
  receiving application's to check (`knownRoles`).

Verified by `roles.feature` (nine scenarios), the engine's fold, validation,
tree and page-file tests, the React adapter's role tests, the builder's role
tests for the editing session and the views, and the toolbar story.

**The roles page (9 November 2026, doc/more-widgets-design.md "Built";
rebuilt the same day on the role layer).** A page of the demo that shows
a role in the layer's own shape: one card with TWO templates — `default`,
an input everyone sees and a line saying how it works; `admin`, the same
with a button and the echo of what it sets — and the admin's layer picking
`admin` for the cell (`pages/roles/roles.json`: `admin.cells["card-roles"].view`).
Signed in as QA the card is everyone's; as admin it holds two widgets
more; "Sign in as" shows the change. The page was first built with the
two admin widgets under a condition (`app.user.roles has the role admin`),
the smaller form for one more widget; the product owner asked for the
handling to be read in `roles.json`, which is this. The cost, named: the
card's inside is written twice, so a change to the note field is made in
both templates. The condition remains the builder's other way — add the
widget, open "Show when", pick the path, "has the role" and the role's
name — in its own scenario. Two scenarios in `roles.feature`: the page,
and the builder's way.

## Later

- **A warning in the builder** when a widget with a role `when` sits in a
  layout a role never sees (dead condition) — once both mechanisms are in
  use and somebody confuses them.
- **Row actions (WW-17)** take the same `when` grammar over the row; a
  role test on a row action is `app.user.roles has the role "admin"` as
  on any widget — nothing new.
- **Permission names as roles**: when the application's session answers
  fine-grained permissions, the host hands them in the same list; if that
  day the word "roles" misleads, rename the input to `audiences` — a
  rename, not a redesign.
