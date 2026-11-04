# Containers — a Card (and tabs, panels, drawers) that hold other widgets, added in the builder

## Motivation

Every widget so far is a LEAF: it reads ports, emits events, shows one
thing. A page is leaves placed by a layout engine. What a page builder
asks for next is a widget that holds OTHER widgets — an antd `Card` with
a title around a table and its filter, `Tabs` with a layout per tab,
`Collapse` panels, a `Drawer` or `Modal` that opens a form — and asks to
add it in the builder like any widget, then put widgets inside it.

The question put to the tiger team: what are the ways a container can be
built so the builder can add one, and which one do we take?

Designed 2026-11-02 with the tiger team. Status: **built** the same day
(story WW-27 in doc/product-stories.md) — the three phases below, with
the differences the build found listed under "Built".

## What a container needs, that a leaf does not

- a place for CHILDREN: who decides which cells sit inside it, and where
  that is written (the page template belongs to the layout engine; a
  widget's view model to the widget);
- RENDERING the children: a widget component receives a view model, a
  read-only store and `emit` — never other cells, never the registries;
- EDITING: adding a widget INTO the container, moving one in or out,
  editing the children — with one edit session per page today;
- SHARING: a page with cards must share as one thing — a view (Share /
  Import, doc/page-views-design.md), a user's own copy of the layout, and
  a future bundle of a page for another installation;
- everything that already works per page — resolution, boot validation,
  reactions, `load` events, the user overlay, the condition `when` — must
  keep working for the children.

## The approaches

### A. Cells with a parent (nesting in the layout template)

Every cell gets `parent?: { cell, slot }`; the engine renders only the
top-level cells; the adapter renders a container widget's children into
the slots it exposes (`WidgetProps.slots`).

Cuts across everything: the core cell shape, every engine's template,
`cells()` ordering, the adapter's renderer contract, the builder's Add
(which slot?), drag between containers in every engine. The one approach
that touches every package to add one widget. **Rejected.**

### B. Sections as a layout engine

A new engine whose template is a list of sections (cards), each holding a
child engine's template: `cells()` flattens, the renderer draws a Card per
section and the child engine inside it. A pure plugin, no core change —
the proof the engine contract was built for.

But a section is not a widget: it has no ports, no events, no condition,
no place in the palette, and the builder's `appendCell` cannot say which
section. Right for a DESIGNER laying out regions, wrong for "add a card
with a title". **Deferred**, as the way to build dashboards of regions if
asked.

### C. A frame on any cell (decoration)

A cell's template gets `frame: { kind: "card", title? }` and the adapter
wraps the widget in a Card. One widget per card, one day of work, covers
"a title and a border around this table".

Covers the most common ask and nothing else: no card with two widgets, no
tabs, no drawer. And a second concept beside what D gives for free.
**Folded into D** as a builder action ("Wrap in a card"), not a concept of
its own.

### D. A widget whose content is a layout INSIDE its own template (chosen)

A container is a widget whose template holds a LAYOUT — a page template
(engine + cells) as one of its settings — exactly where a table's template
holds its columns:

```
viewModels.pages.overview.default            the screen's layout
  cells: [ label-welcome, card-1, card-2, counter-main ]

viewModels.widgets.overview.card1.default    the card's widget template
  title: "Controls"
  content:                                   the card's layout, inline
    engine: "react-grid-layout"
    cells: [ button-start, button-stop, input-name ]   each with its model path, as always
```

So a card with two buttons and an input is ONE cell of the screen's
layout; its three widgets are three cells of the layout inside the card's
template, on their own little grid. Three cards on one screen are three
cells and three such layouts. Nothing new appears at the top of the view
models: no page that is not a screen, no name to keep unique across
screens. Everything shares the screen's store and bus, so a button in one
card can set a path a widget in another card reads.

The widget renders its layout with the same `PageView` the host renders
the screen with, inside the Card (or the tab, the panel, the drawer).
Children are cells of that layout, laid out by its own engine, resolved,
validated, reacting and loading as every layout already is. A layout
inside a layout, by the one mechanism that renders layouts.

An earlier draft of this design stored a card's layout as a page template
of its own (`pages["overview-card-1"]`). The product owner asked how a
screen with several cards would then be SHARED — a view exports one
layout, a user's own view copies one layout — and the answer was that it
would not: the cards would ship without their content. Inside the card's
template, the content goes wherever the card's template goes.

## Sharing a page with cards

- **A view** (doc/page-views-design.md) is the screen's layout: it names
  the card cell and the card's model path, as it names every cell's. The
  card's template — content included — is the page's configuration,
  which every user of the application has. Share and Import need nothing
  new.
- **A user's own view** copies the screen's layout: the user moves or
  removes the card. Inside a card the user overlay works per cell as it
  does today (settings only), with the inner cell's key under the card's:
  `cells["card-1/button-start"]`. The card's CONTENT is a setting of the
  card, so a user's own layout inside it is that setting in their overlay
  (`cells["card-1"].settings.default.content`, the whole `tabs` list for a
  tab's) — built on 3 November 2026, when the product owner asked for it
  (see "Built").
- **A bundle** — a layout plus every widget template it references,
  recursively, for moving a page to another installation — is not built
  today for any page; when it is, a card's content travels because it is
  a field of a template, and the inner cells' templates are references
  like any other. Nothing in this design is in its way.

## The tiger team's positions

- **Morgan (product):** the asks are "a card with a title holding a table
  and its filter", "tabs", "a panel that folds", "a form that opens over
  the page". D answers all four with one thing to learn: a container holds
  a small layout of its own, edited where layouts are edited — and a page
  with three cards is still one page, shared as one. Ship the Card first,
  with "Wrap in a card" on an existing widget so nobody rebuilds a page to
  get a title around a table.
- **Ren (contrarian):** containers are where page builders die — nesting
  without end, drag between containers, who resolves first. D dodges the
  worst of it by refusing in-place nested editing: a card's content is
  edited as a layout, one session at a time. With the content INLINE a
  cycle cannot even be written (a tree is finite), so the one guard left
  is depth: refuse a layout nested deeper than four at boot and at render,
  for the builder's sake more than the engine's. Count the events: a
  nested layout fires its own `page · load`, so an overview with three
  cards fires four — say it in CLAUDE.md before a scenario counts log
  entries. And B is not dead: if someone wants regions dragged as a whole,
  B is the answer, not more of D.
- **Alexei (architecture):** D adds nothing to the core. The cell stays a
  cell, the engine stays the owner of its template, `resolveTemplate` and
  `resolveCells` are called for the inner layout as they are for the
  screen's. The one new seam is `PageContext` in the adapter: `PageView`
  provides what it was given, `NestedLayout` consumes it — a widget still
  imports only the adapter. Inner cell ids are unique within their layout,
  and a path into a layout is the chain of ids (`card-1/button-start`),
  the same way a template name is one segment of a path.
- **Dmitri (readability):** no nested edit sessions. In edit mode a card
  shows its own chrome: Edit (its settings, as any widget) and "Edit
  content", which opens the builder ON that layout — the same palette, the
  same form, the same Add, the same session, on a layout that happens to
  sit inside a card — with a breadcrumb back to the screen. The builder
  today edits `pages.<page>.<view>`; it learns to edit a template AT A
  PATH (`widgets.overview.card1.default.content`) and nothing else
  changes. "Wrap in a card" is one op: a card cell where the cell was, the
  cell moved into the card's new content.
- **Katya (team lead):** three phases, each shippable: the mechanism with
  the Card, the builder's part, then Tabs and Collapse on the same
  mechanism and the drawer the actions design wants. No frame concept: a
  card with one widget IS the frame.
- **Sasha (QA):** nested layouts are `data-testid="page"` inside a page:
  the live-page locator (`support/page.ts`) must take the OUTERMOST, and a
  `the card "<id>" shows the cells "<ids>"` step reads the inner one; `the
page has N cells` counts the outer page's own cells. Scenarios: a fixture
  card on the overview holding the counter and its echo (the existing
  counter scenarios keep passing inside it, proving reactions and the
  store work nested); the builder adds a card, follows "Edit content", adds
  a widget inside, comes back; "Wrap in a card"; a view shared with a card
  in it imports whole; a card nested five deep shows the problem and the
  page stands. A story per container.
- **Vlad (fluency):** `NestedLayout` is `useContext` and a `PageView`
  spread; the card component is two lines; the depth check is one number
  in the context.

Decision: D, with the content inline. Rejected: A (every package for one
widget). Deferred: B (regions for designers, if asked). Folded: C (a
builder action on D).

## The design, in detail

### Contracts and widgets

- `layoutSchema` in `@wirework/schema`: `pageViewModelSchema` under another
  name — `{ engine, ...the engine's shape }` — for a setting that holds a
  layout. A contract marks such settings with `contains: "layout"`
  (`defineContract({ …, contains: ["content"] })`: the setting names that
  hold layouts), read by the builder, the validator and the chrome. One
  field on the contract, no new contract type.
- `card` (`title`, `content`, `size`), `tabs` (`tabs: [{ key, label,
content }]`), `collapse` (`panels: [{ key, label, content, open? }]`) in
  `@wirework/widget-contracts`; antd implementations one component each
  around `NestedLayout`:

```ts
function AntdCard({ viewModel }: ContractProps<typeof cardContract>) {
  return (
    <Card title={viewModel.title} size={viewModel.size}>
      <NestedLayout at="content" template={viewModel.content} />
    </Card>
  );
}
```

- The drawer/modal: the `dialog/open-page` action the actions design names
  becomes `dialog/open { content }` with a layout, rendered by the host in
  a `Drawer` through the same `NestedLayout`.

### Adapter (`@wirework/react`)

- `PageContext` — provided by `PageView` with what it was given: the
  trees, `registry`, `layoutEngines`, `actions`, `predicates`, `store`,
  `bus`, `editable`, `onEditCell`, `onRemoveCell`, `onError`, `reloadKey`,
  plus the PATH of the layout being rendered (`[]` for the screen,
  `["card-1"]` inside it) and its depth. `PageReloadContext` already exists
  for the reload signal; this generalises it.
- `NestedLayout({ at, template })` — resolves `template` with the context's
  registries (`resolveTemplate` + `resolveCells`, the same pipeline) and
  renders it through the engine's renderer with the same `renderCell`,
  the same store and bus (its reactions bind on the same bus; its cells'
  `load` fire as they do on a screen), its own overlay entries under the
  chain key, `editable: false` always (Dmitri's rule), `reloadKey` passed
  through. Depth over four renders a problem placeholder, never recurses.
  Exposed as `data-testid="page"` with `data-nested="<depth>"` and
  `data-at="card-1"`.
- `CellChrome` gains "Edit content" when the cell's contract `contains` a
  layout and the host passed `onEditLayout(path)`.

### Engine and validation

- `validateViewModels` validates every widget template with the widget's
  own schema already; for a definition whose contract `contains` layouts,
  it goes on into each: `resolveTemplate` with the engine registry,
  `validateCells` on its cells (the single pipeline), problems located
  under the cell (`… cell[1] (#card-1) content cell[0] (#button-start)`),
  depth over four an error. Nothing changes in `resolvePage`: the screen
  resolves as it does, each inner layout when its container renders.

### Builder

- The builder edits a template AT A LOCATION: today `pages.<page>.<view>`;
  the location becomes a value — a page view, or a widget template's
  setting (`widgets.overview.card1.default.content`) — carried by
  `useBuilder`, `usePageEditing` and the toolbar. The ops (`appendCell`,
  `removeCell`, `applyChange`) are unchanged: they take a template and
  give one back; only where it is read and written moves.
- Adding a container: the form shows nothing for a `contains` setting; Add
  writes the container's template with the setting set to the current
  engine's `empty()` — a card starts empty, on the same kind of grid as
  the screen.
- Editing the content: "Edit content" → `onEditLayout(["card-1"])`; the
  playground routes to `/builder/card-1` (the chain in the address) and
  the toolbar shows the breadcrumb "builder › card-1". Everything else is
  as it is: one layout at a time.
- "Wrap in a card" in a cell's chrome (edit mode, base target only): one
  op — a card cell where the cell was, with the same placement, its
  content the engine's `empty()` with the cell appended.
- Removing a container cell removes its template as any builder-owned
  template, content and all; the inner cells' templates go when nothing
  else references them (`isModelReferenced`, walking inner layouts too).

### Playground and scenarios

- Overview: the counter and its echo move into a fixture card "Counter";
  `layout.feature`'s cell counts of the overview change by one (two cells
  become one card), noted where they are asserted. Events: `page · load`
  counts gain one per card on the page — CLAUDE.md's load-events note is
  updated with it.
- `containers.feature`: the fixture card shows its cells and the counter
  counts inside it; the builder adds a card, follows "Edit content", adds
  a label inside, comes back and sees it in the card; "Wrap in a card" on a
  placed widget; a view with a card is shared and imported whole; a card
  five deep shows the problem and the page stands; the user overlay hides
  a card like any cell.
- Stories: `antd-card` with a layout in its template; `NestedLayout` jsdom
  tests for the depth limit and the overlay chain key.

## Phases

| Phase | Work                                                                                                                                                                                                                                                     | Estimate |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1     | `layoutSchema`, `contains` on contracts, `PageContext`, `NestedLayout` with the depth guard and the overlay chain key, the `card` contract and antd widget, boot validation into inner layouts, the fixture card, tests                                  | 1 day    |
| 2     | Builder: a template location (page view or template setting), the container's content started empty on Add, "Edit content" chrome → `onEditLayout`, the builder on a route with a breadcrumb, "Wrap in a card", removal walking inner layouts, scenarios | 1.5 days |
| 3     | `tabs` and `collapse` on the same mechanism; `dialog/open { content }` rendered through `NestedLayout`; stories and scenarios                                                                                                                            | 1 day    |

## Built

What stands, where it differs from the design above, and why.

- **The contract field.** `contains: ["content"]` on a contract and its
  definitions (`WidgetContractInput.contains`, copied by
  `implementContract`); no `layoutSchema` alias — a layout setting is
  `pageViewModelSchema.optional()`, which `settingFields` already leaves
  out of the form (an object is never a primitive setting), so the form
  shows nothing for it and an Edit → Save keeps it. The registry refuses a
  `contains` that names a setting the widget does not have.
- **Layouts held in lists.** `layoutsOf(definition, viewModel)` lists the
  layouts a view model holds: a setting that is one, or a list of items
  (tabs, panels) each with a `content`. A layout is named by its PATH in
  the view model — `content`, `tabs.0.content` — and that path is part of
  the chain when it is not `content`: `tabs-1/tabs.0.content/button`.
- **The notation.** One chain notation everywhere (`innerCellKey`,
  `chainSteps`): the overlay key of an inner cell (`card-1/button`), the
  nested page name its cells emit and react under (`overview/card-1`), the
  builder's location (`at: "card-1"`), the breadcrumb.
- **The adapter.** `PageContext` carries what `PageView` was given plus the
  depth; `CellKeyContext` tells a container which cell it is in;
  `NestedLayout({ template, path })` resolves with `resolveTemplate` +
  `resolveCells`, binds the cells' reactions on the page's bus
  (`bindCellReactions`) and renders through the engine's renderer with
  `editable: false`. It does NOT fire a `page · load` of its own: a nested
  layout is not a page opening, and the load counts in CLAUDE.md stand.
  Outside a page (a palette preview, a story without `inside`) it shows
  only how many widgets it holds. Its element is `data-testid="layout"`
  (with `data-page` and `data-nested`), not `"page"`: the suite's live-page
  locator keeps meaning the outermost page.
- **Validation** walks into every held layout with the same `validateCells`,
  problems located under the cell (`… (#card-1) content cell[0] (#inner)`),
  the overlay narrowed with `innerOverlay`, depth over four an error — and
  `NestedLayout` refuses the same depth at render with a problem
  placeholder.
- **The builder's location** is `at`, a chain under the page, on
  `usePageEditing` and `useBuilder`; `layoutPathAt` turns it into the dot
  path of the layout in the view models (`widgets.custom.custom-1.default.content`).
  The layout is shown AS the page under its nested name, and every op is
  the same op writing where the location says. A session is ONE layout's:
  the playground saves the page (as Save page does) before it follows
  "Edit content" or a breadcrumb — left open, the session locked Add on
  every layout until someone found Save or Cancel, which the first user did
  not. "Edit content" then opens the layout inside with a session of ITS
  OWN (the button is pressed in edit mode, to edit: the cells inside have
  their handles at once — the second user saw "lines" and nothing to drag
  while the layout waited in view mode); a breadcrumb and a container just
  placed open in view mode, Add available. The engine of a layout inside a
  container is chosen in the toolbar while the layout is empty, as a page's
  is (`useBuilder` with `at`; `withEmptyLayouts` only starts it on the
  parent's engine), and locked once a widget is placed: a card may hold a
  gridstack grid on a react-grid-layout page. With the overlay ON the
  layout shown `at` the chain is the one the USER sees — the base one under
  their settings for the container (`locateLayoutAt`) — and every op
  writes their own copy of it as the container's setting
  (`updateUserLayoutAt`: `cells["card-1"].settings.default.content`, the
  whole `tabs` list for a tab's content), the cells inside customised and
  removed under their chain keys (`cells["card-1/button"]`), their overlay
  entries shown through `innerOverlayAt`; the container's own form in the
  user's view keeps that copy. Add stays the shared page's: a user's copy
  takes no new widget. It is visit STATE, not an address: in the playground a
  new address opens a new visit, and the builder's starts from nothing —
  so "Edit content" would have lost the card it was pressed on. The
  toolbar shows the breadcrumb (`usePageToolbar` `crumbs`/`goTo`, antd
  `Breadcrumb`): `builder › custom-1`.
- **Adding a container** starts its layouts empty on the engine of the
  layout it is placed in (`withEmptyLayouts` in use-builder.ts): a card's
  `content`, a `content` for each default item of tabs and panels. Its cell
  is appended TALL (`appendCell`'s `CellSize` hint; the grid engines give
  twice their rows — two rows showed a card's title and nothing else), and
  `onAdded` names what was placed (`PlacedWidget`: the id, the widget, the
  paths of the layouts it holds), so the playground OPENS a placed container
  at once — its first layout shown as the page, the breadcrumb leading back
  — and the next widgets go inside it with no trip through Edit page and
  "Edit content" (a trip the first user did not find). "Wrap in a card"
  appends its card tall too.
- **Tabs and panels are named and added in the form.** The schema's
  `settingFields` reports an array of entries with a `key` and a `label` as
  a setting of kind `items` (with each entry's other primitive fields — a
  panel's `open` — as `itemFields`); the form (`useWidgetForm`: `addItem`,
  `removeItem`, `setItemLabel`, `setItemValue`) shows one row per entry
  starting from the contract's default, the user types the labels, and an
  entry's KEY is made from its label (`Run history` → `run-history`,
  numbered when taken) or kept as saved — the user never types a key. An
  entry's layout stays behind its row (`ItemDraft.original`), so an edit
  that renames a tab keeps what is inside it; an entry an edit ADDED gets
  an empty layout when the widget is saved (`withEmptyLayouts`, the same
  as on Add), and the cells inside an entry an edit REMOVED lose their
  builder-owned templates (as with a removed cell). The ids:
  `setting-tabs-label`, `setting-tabs-2-label`, `setting-panels-open`,
  `setting-tabs-remove`, `setting-tabs-add` (`itemFieldId`).
- **"Wrap in a card"** (`wrapCell(cellId, widget)`, base target only) is one
  op: a new container cell APPENDED (an engine's `appendCell` has no
  position — the design's "where it was" is where the layout puts a new
  cell, which on a grid is the first free place), its first layout the
  engine's empty one with the cell inside, the cell gone from the layout
  it was in. The host names the container and the button
  (`PageView.wrapCell: { label, onWrap }`).
- **Removal** of a container drops its builder-owned template and the
  templates of the cells inside it that nothing references any more
  (`cellsWithin` walks the layouts inside containers; `isModelReferenced`
  uses it).
- **The fixture card** is on the SETTINGS page (`card-preferences`,
  `widgets.settings.preferences.default.content`, holding the name input,
  the page-size select and the auto-refresh checkbox), not the overview:
  the overview's cell counts are asserted in three feature files and its
  counter scenarios are the suite's oldest; the settings controls prove
  the same thing — controlled widgets written back by their default
  reactions, inside a card exactly as on the page.
- **Phase 3** built `tabs` and `collapse` on the same mechanism
  (`useLayoutItems` renders a `NestedLayout` per item at its own path;
  antd mounts a pane when first shown and keeps it). The drawer
  (`dialog/open { content }`) stays with the actions design, not built.
- **Tests:** `nesting.test.ts` (layoutsOf, innerOverlay, the registry
  check, validation into layouts and the depth refusal),
  `NestedLayout.test.tsx` (live store inside, preview outside, the depth
  placeholder), the builder's `use-page-editing.test.tsx` and
  `use-builder.test.tsx` (the location, wrap, removal walking inside), the
  `antd-card` / `antd-tabs` / `antd-collapse` stories with their
  conformance sets (`inside()` lends them a list engine), and
  `containers.feature`.

## Open to the product owner

- Whether a card's content should be editable IN PLACE some day (a nested
  session, Ren's warning) or stays "a layout edited as a layout".
- Whether regions dragged as a whole (approach B) are wanted for
  dashboards — a layout engine of its own, independent of D.
- Whether a BUNDLE export (a layout with every template it references) is
  wanted now that cards make pages worth moving whole.
- ~~The user overlay REACHES the cells inside a container, but nothing lets
  a user edit them.~~ Answered 3 November 2026: the product owner wants a
  user to lay out the widgets inside a card in their own view. "Edit
  content" works with the overlay on; the user's layout is the card's
  `content` setting in their overlay, the widgets inside are customised
  under their chain keys (`containers.feature`, "With the user overlay
  on…").
- Leaving a layout SAVES its session without asking ("Edit content", a
  breadcrumb). Whether the builder should ask first, or offer to discard.
