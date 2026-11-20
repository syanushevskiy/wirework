# ADR-0012: Roles — one page, different for an admin and for everybody else

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

- A ROLE LAYER, `viewModels.roles.<role>`, in the user overlay's own
  shape. A page is read base → the user's roles (broadest first, later
  wins) → the user's own overlay.
- A role's layout is a page view; a role's wiring is a widget template
  the layer picks. One widget is shown or hidden by `when`. The server
  decides the data.
- The builder edits for everyone, for a role or for me, and Add places a
  widget for a role. On the application's pages widgets are added in edit
  mode and by admins only.
- Built (story WW-31), the page file's `roles` included. No inheritance,
  no conflict warning, no roles registry.

## 2. Problem

The ask: "Roles for widgets and functionality. On one page an admin has
additional filters for the table, fires a separate action with additional
filter data, sees some buttons, or a card, that others do not — depending
on the role."

Three different things hide in that sentence:

1. **Show or hide a widget by role** — a button, a card.
2. **A different LAYOUT by role** — the admin's page has a card the
   others' does not, and no hole where it would be.
3. **Different WIRING by role** — the admin's table loads with another
   action or other arguments.

What the decision builds on:

- **Conditions** (doc/ADR/0008-conditions.md): a widget's `when` shows or
  hides it; a hidden widget leaves its cell as a blank.
- **Page views** (doc/ADR/0006-page-views.md): a page has several
  templates, each a layout that may hold different cells.
- **The user overlay** (`userViewModelsSchema`): per page a chosen
  `view`, own `templates`, and per cell a chosen widget template (`view`)
  and settings — never `inputs`, `on`, `when`.
- **Widget templates**: one model may hold several templates, each with
  its own wiring; a cell names which one it uses.

## 3. Details

The role layer for layouts and wiring, `when` for a single widget, the
server for data. The builder's help says which to use: one widget →
`when`; a different page → a role; different DATA → the server.

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
roles: {
  admin: {
    pages: {
      pagination: { cells: { "table-main": { view: "admin" } } }, // the table on its admin template
      settings: { view: "admin", templates: { admin: { engine: "react-grid-layout", cells: [/* … */] } } },
    },
  },
}

// the table's second template: the same table with one other URL
widgets.pagination.table: {
  default: { …, on: { load: [{ call: "table-view/load", with: { url: "/api/v1/view/runs", … } }] } },
  admin:   { …, on: { load: [{ call: "table-view/load", with: { url: "/api/v1/view/runs/all", … } }] } },
}
```

- A role name follows the action grammar (`ROLE_NAME`: kebab-case, one
  optional namespace — `admin`, `ops/on-call`), so a role is a word in a
  sentence and a file name.
- A role's entry is the user overlay's schema REUSED: a page's `view`,
  `templates`, `cells` with `view` and `settings`; strict. It has no
  `inputs` / `on` / `when`: a role PICKS a template that carries the
  wiring, so wiring has one home, where validation reads it.
- A role may ADD templates of its own (the admin's layout). They are
  shared configuration, in the application's tree.
- The layer is keyed by NAME. A host may hand permission names
  (`can-see-all-runs`) in the same list; the engine does not care.

### Who has which roles, and their order

- The engine does not know an application's roles. The host tells it per
  resolution: `ResolveInput.roles`, a list from the broadest to the most
  specific. Absent or empty: the base alone.
- The session answers `app.user.roles` in that order (`["qa"]`,
  `["qa", "admin"]`, `["qa", "admin", "wirework-admin"]`), and the host
  hands the list on as it came.
- `app.lists.roles` lists EVERY role the application grants, in the same
  order. Validation takes it as `knownRoles`; the builder offers it as
  the roles to edit for.
- A role a user holds that the configuration has no entry for is nothing.
  A role entry outside `knownRoles` is dead configuration: a boot WARNING
  ("is held by nobody"), never an error.
- There is no inheritance and no `extends`. A hierarchy belongs where the
  roles are granted: the server grants `admin` to every Wirework admin.

### Resolution: base → roles → user

`overlayLayers(viewModels, roles, userViewModels)` (engine, `layers.ts`)
is the fold's input everywhere: the roles' entries that exist, in the
order given, then the user's. Later wins, per thing:

- **The page's templates** (`pageTemplates`): the base's, each layer's
  own templates laid on by name.
- **The shown view** (`viewCandidates`): the user's `view` if set, else
  the last role's that is set, else `default`. A user who chose a view
  keeps it — also through a promotion.
- **A cell's template** (`cellViewCandidates`): the user's `view` for the
  cell, else the last role's, else the cell's `template`; the same
  fallback note when a name is missing.
- **A cell's settings** (`foldSettings`): the base template, then each
  layer's settings for that template, `deepMerge`d in order, one key at
  a time.

More rules:

- The resolve input names the layers ONE of two ways (`ResolveLayers`):
  `roles` and `userViewModels` for a page, or `overlays` ready-made for a
  layout inside a container. `PageScope` carries the narrowed list, so a
  role's entry for a cell inside a card (`card-1/inner`) applies too.
  `locateLayoutAt` and `innerOverlaysAt` take the same list.
- **A role sets only what differs.** The Wirework admin's entry says
  nothing about the Pagination page, so a Wirework admin sees the
  admin's.
- **Two roles that set the same thing are not a problem.** The later one
  wins; that is what the order is for. There is no conflict warning.
- **One more widget for a stronger role is a `when`, not a view.** A role
  gets a layout of its own only when the PAGE differs.

### One widget: `when` and `user/has-role`

For "this button is for admins" the answer is the widget's `when`. The
host predicate `user/has-role`, phrase "has the role", reads the list:
`app.user.roles has the role "admin"`. The standard predicates stay
eight: `contains` over the list would also match "wirework-admin", and
"is one of" / "equals" are for a single value. "Admin or Wirework admin"
is the constructor with `or` — or one test, since every Wirework admin
holds `admin`.

### Different data: the server's job

Roles in the browser are not security. The layer decides what the page
SHOWS and ASKS; the server decides what it ANSWERS, from the session it
sees, every time.

- A different request for a role is a second TEMPLATE of the widget,
  picked by the layer: the same `table-view/load` with other arguments.
- A plain user who types the admin's URL gets what the server allows a
  plain user. The demo shows it: the fake transport hands every endpoint
  the session, and `/api/v1/view/runs/all` answers 403 to a session
  without `admin`.
- `app.user.roles` in the store is what the page shows by, never what the
  server trusts.
- A role-only action is a SERVER call the session must be allowed
  (`runs/delete-selected`), never a store write a condition hides.

### Validation

- The shared page is checked as everyone sees it
  (`pages.settings.default`), then once more through each layer at the
  layer's location (`roles.admin pages.settings.default cell[2]`,
  `user pages.…`), skipping what was already reported. So a problem a
  role's settings cause names the role.
- A role's entry is checked with the roles before it in `knownRoles`, as
  a person holding it sees the page.
- A role's own templates are validated by their engine and their cells
  resolved, like any page template — at boot, not when an admin first
  opens the page.
- A role's `view` naming a template nobody has, a cell key no layout has,
  settings for a template that does not exist: the user overlay's
  sentences, under `roles.<role> pages.<page>`.
- A role entry has the tree's shape: `viewModelsSchema` holds `roles` to
  the overlay schema, so a bad one is refused by the state inspector and
  reported at boot.

### The builder

`EditTarget` is `"base" | "user" | { role }`. The toolbar reads
`edits → everyone` / `me` / `role: <name>`.

- **Choosing a role** (`edit-role`: "everyone" or one of the host's
  `knownRoles`) turns the user overlay OFF. Every edit — a moved cell, a
  saved view, a widget's template or settings, a card's content — writes
  `viewModels.roles.<role>` through `updateRole`, with the SAME functions
  that write the user's overlay (`overlayTargetOf`).
- **A shared view edited for a role** becomes the role's own copy, named
  after the role.
- **The page shown** is the page as that role sees it: resolved with the
  known roles up to the role and no user overlay.
- **Views.** The list labels a role's templates `role: <name>`; choosing
  one sets the role's view; Save as, Rename and Delete work on the role's
  own.
- **Templates.** The widget editor offers the cell's templates
  (`cell-template`, the hook's `templateChoice`) as the role's `view` for
  the cell — how an admin's table gets its admin wiring.
- **An op edits exactly the layers the plan shows.** With the overlay on,
  a user who SEES a role's view and edits it gets their own copy,
  `my-own`.
- **Add places the widget for the role.** `useBuilder` takes the editing
  session's `context` (from `usePageEditing`). When the target is a role,
  the cell goes through `pageOp` into the role's own view — a copy of the
  shown layout named after the role when it has none — and the widget's
  template goes under the builder's group, as every template does.
  Everyone else's page is unchanged. The user's own view keeps Add
  locked. `naming.ts` holds the builder's names, so the hook uses the ops
  without a module cycle.
- **Adding a role.** The builder page starts with `app-user` and `admin`
  in `app.lists.roles` (`BUILDER_ROLES`). The toolbar's "add a role"
  field (`onAddRole` on `usePageToolbar`; `roleNameProblem`: kebab-case,
  not already there) lets the host put a name into the list. In a real
  host the list comes from the server; until the server knows the role,
  validation keeps saying "is held by nobody".

### The host's rules on the application's pages

These are the host's (`use-playground.ts`), not the builder package's:
the role's name and "in edit mode" are a host's to decide. Like every
role check in the browser they are presentation — what a session may
save is for the host's server.

- **Widgets are added in edit mode only, and by admins only** (the
  owner's rule). The palette shows while a layout that takes widgets is
  in an edit session of somebody whose session holds `admin`. Such a
  layout is a page edited for a role, or the layout inside a container of
  the shared page (`addsToPage` of `useLayoutNavigation`). In view mode,
  and for anybody else, there is no palette.
- **Add keeps the admin in edit mode.** A placed widget is a commit of
  its own: Add saves what the session has pending, places the widget and
  opens the session again. Cancel afterwards drops only what changed
  since. Choosing the engine of an empty layout does the same.
- **Edited for everyone, a page's own layout has no palette**: it is the
  application's configuration.
- **The BUILDER page** has no session, so nobody there holds a role: its
  palette is always there, and Add waits for an open page edit to end.
- **An admin's edits are their ROLE's from the start.** When the session
  says who is signed in, the host starts an admin with the overlay OFF
  and their most specific role as the edit target (`admin`, or
  `wirework-admin`). Edit page then writes the role's view, not a
  `my-own` copy. Everybody else starts with their own view. The toolbar
  still switches: the overlay on gives an admin their own views,
  "everyone" the shared page.
- **An admin rewires a widget from any session.** For others the editor
  locks ports, reactions and the condition whenever the target is an
  overlay (`bindingsLocked` is `target !== "base"`). For an admin they
  are open, and the overlay still carries no wiring: `saveWidgetOp` with
  `rewires` writes the form's SETTINGS to the target and its WIRING into
  the shared template, for everyone who uses it
  (`usePageEditing({ rewires })`).
- **"Sign in as"** (`sign-in-as`, the demo's three people) sends the
  session request again and then opens the page at its address: a fresh
  visit, its data started over, loaded by the new roles.

### The page file

The page file carries `roles`: what every role says about the page, and
the widgets the roles' layouts reference. `pageFile` cuts it;
`mergePageFiles` writes it back under the role and drops a role's entry
for the page that the file no longer has. The role names in a received
file are the receiving application's to check (`knownRoles`). Export page
carries a role's view with its added widgets, so another administrator
imports it (ADR-0011, "Import page").

### The demo

- **Pagination page:** the admin's entry puts the table on its `admin`
  template — the default with one other URL. The server adds an `owner`
  column and its own Owner filter; the page needs no filter cell.
- **Settings page:** an `admin` view with the Danger-zone card; the
  Wirework admin's `wirework-admin` view adds the Sessions card. Both
  roles set the page's view; later wins.
- **One more widget:** the Wirework admin's Delete button sits in the
  SHARED Pagination layout under
  `when: app.user.roles has the role "wirework-admin"`.
- **Roles page:** one card with TWO templates, `default` and `admin`, and
  the admin's layer picking `admin` for the cell
  (`pages/roles/roles.json`). The owner chose this over a condition so
  that the handling is read in `roles.json`. The cost: the card's inside
  is written twice. A second row shows the other way: an "Admin mode"
  switch and a button shown by conditions alone.

Proven by `roles.feature`, the engine's fold, validation and page-file
tests, and the builder's role tests.

### Not built

- A palette inside a container while the target is a role: a widget
  inside a card is added to the shared page, so an admin chooses
  "everyone" there first.
- `when` on reactions, a page per role, a roles registry, any `role:`
  field on cells or templates.
- A builder warning when a widget with a role `when` sits in a layout
  that role never sees (a dead condition).
- A rename of the input to `audiences`, should permission names in the
  list make the word "roles" mislead. A rename, not a redesign.

Row actions (doc/ADR/0020-row-actions.md) need nothing new: a role test
there is the same `when` grammar.

## 4. Options weighed

How does one page differ by role, without a second page and without an
expression language?

| Option                                                                        | Verdict                                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Conditions only** — `when` on every role-dependent widget                | Kept for the single widget: cheap, in the form already. Fails a layout (a card-sized blank is not a page anyone ships) and fails wiring (a table's `load` is one list).                                |
| **B. A page per role** — `runs` and `runs-admin`, the router picking          | Dropped. Two pages to keep in step; the day they drift nobody knows which is right. And an admin's saved personal view must survive their promotion.                                                   |
| **C. A role layer** — the overlay shape, keyed by role, between base and user | Chosen. One new key, no new grammar: a role's layout is a page view, a role's wiring a widget template — things the engine, the builder, validation and the page file already have.                    |
| **D. `when` or a `role` field on reactions**                                  | Dropped. A conditional reaction is a workflow engine by accretion; a second template picked by the layer gives the same result, and validation reads it whole.                                         |
| **E. A roles registry in the engine**                                         | Dropped. Roles come from the session and change without a release. The names are validated by what the application declares (`app.lists.roles`), and the host tells the builder which roles there are. |

What still explains the choice:

- **One schema, one fold.** Base, role and user are three instances of
  one overlay schema applied by one fold: no new resolution path, no new
  validation walker — the existing ones take a list. A reader opening
  `viewModels.roles.admin` sees the user overlay they already know.
- **One place says what admins get.** A `role:` field on cells, reactions
  or templates would scatter the answer through the tree.
- **The order is one sentence.** Base, then the roles in the order given,
  then the user. A warning for two roles setting the same page's view
  would fire on the intended case — a stronger role overriding a weaker
  one — so there is none.
- **No inheritance in configuration.** The moment a role entry inherits
  another, somebody builds a diamond.
- **Add for a role, not "add for everyone first".** The widget the
  person building wants IS the role's; a personal widget is not asked
  for, so the user's own view stays locked.
- **What it costs:** one optional key in the schema, one list on the
  resolve input, the merge sites taking a list, and one more validation
  pass per layer.
