# ADR-0003: Layout engines — plugins, one page session, edits routed to a target

- **Status:** Accepted — built
- **Date:** 2026-09-15
- **Deciders:** the product owner

## Description

A dashboard needs free placement (drag, resize) and the layout library is a
choice, not a constant: react-grid-layout today, gridstack or FlexLayout
tomorrow. This record says where a page's layout lives, how a layout
library is plugged in, and how a page is edited and where its edits are
written.

## Options considered

The record keeps two alternatives, both turned down:

- **A layout the core knows** — one library as a constant of the core and
  the adapter. It is refused by the requirement itself: the library is a
  choice, so the template's shape and the renderer cannot belong to the
  core.
- **Conversion between engines** — one page moved from one engine's
  template to another's. It existed and was removed by decision: a
  different engine is a different template.

And the one chosen:

- **Engines as plugins.** A page template names its engine; a registered
  plugin owns the template's shape, its operations and its renderer. It
  costs a contract every engine implements and a package per library;
  gridstack and FlexLayout were then written against it with no core,
  schema or adapter change.

## Decision

The core knows NO layout: a page template declares its engine by name and
a registered plugin owns everything else. There is no conversion between
engines — a different engine is a different template, and a page's engine
is a free choice only until its first widget is placed. A page is edited
in ONE session of pure ops replayed over the store's trees, nothing
written until Save, and every op is routed by an edit target: the user's
overlay or the base view models.

## Plugin contract (`@wirework/schema`, `contracts/layout-engine.ts`)

```ts
interface LayoutEngine<T extends PageViewModel, C, TRenderer> {
  name: string; // page templates: { engine: "<name>", ... }
  template: Validator<T>; // the engine OWNS the template shape
  cells(template: T): CellBase[]; // identity + widget binding, stable order
  appendCell(template: T, cell: CellBase, size?: CellSize): T; // "tall": twice the room, for a container
  removeCell(template: T, cellId: string): T;
  applyChange(template: T, change: C): T; // renderer-reported change, PURE
  empty(): T; // what a builder starts from
  validate?(template: T): string[]; // e.g. "cell exceeds the grid"
  renderer: TRenderer; // opaque to the core
}
```

`C` is the engine's own change payload: placements by id for a grid, a
whole model document for a docking layout. The core never looks inside a
template. `PageViewModel` in the core is only `{ engine: string }` plus
whatever the engine validates. `appendCell`'s `size` is a HINT: the
builder asks for a `"tall"` cell when the widget holds a layout of its own
(doc/ADR/0009-containers.md); the grid engines give it twice their rows, an
engine whose cells size to content ignores it.

The React adapter narrows the renderer slot (`ReactLayoutEngine`,
`defineLayoutEngine`) to a component receiving `LayoutRendererProps`:

```ts
{ template: T; cells: ResolvedCell[]; cellById; editable: boolean;
  onChange?(change: C): void;
  renderCell(cell): ReactNode;            // widget in its boundary, cell-scoped emit, read-only store
  renderChrome?(cell): ReactNode }        // edit-mode Edit/Remove actions — the engine PLACES them
```

The engine registry (`createLayoutEngines`) is as strict as the widget one.
`resolveTemplate(engines, raw)` validates the core shape, finds the plugin,
validates the template with it, lists its `cells` (a plugin that throws
there is a problem, not a crash) and runs the plugin's `validate` — shared
by resolve, validation and editors, so they cannot disagree and no caller
talks to a third-party plugin unguarded. A page whose
engine is unknown or whose template the engine rejects renders a page
problem; `validate` findings are errors at boot and WARNINGS on the render
plan (`plan.warnings`, shown above the page). A renderer that throws is
caught by a page-level boundary, so the host and its tools stay usable.

`layoutEngineProblems(engine)` (`@wirework/engine`) checks what the
operations DO — `empty()` valid and cell-less, `appendCell` keeps identity
and order, `removeCell` removes exactly one and ignores unknown ids, no
operation mutates its input. Every engine package's unit tests run it.

## Engines shipped

- `@wirework/engine-react-grid-layout` — `{ engine, cols?, rowHeight?,
cells: [{ id, widget, model, template, x, y, w, h }] }`; change payload =
  placements by id; validates that cells fit the column count. Edit-mode
  chrome sits in the drag-handle bar; the buttons are excluded from the
  drag via the library's `cancel` selector.
- `@wirework/engine-flex-rows` — `{ engine, rows: [{ classes?, cells: [{
..., classes? }] }] }`: each row a flexbox, a row's and a cell's `classes`
  Tailwind's flex class names, turned into style by the engine's own
  table (doc/ADR/0010-flex-rows.md); change payload = a cell's or a row's
  classes, or a cell moved to a row and index; `validate` names unknown
  classes. Edit mode: a bar per row and a handle per cell with four arrows
  and a field for the classes; chrome sits in the handle.
- `@wirework/engine-css-grid` — `{ engine, areas, columns?, rows?, gap?,
cells }`: a CSS grid of SLOTS whose `areas` is CSS's own
  `grid-template-areas`, one string per row, its tokens the cells' ids and
  `.` an empty slot — the cell's id IS its area (doc/ADR/0013-css-grid.md);
  change payload = the whole picture (with the tracks when the grid grew
  or shrank) or the tracks; `validate` names a non-rectangle (which CSS
  would silently drop, so the renderer leaves the picture unset), a token
  that is no cell, a cell with no slot, a size that is not CSS. Edit mode:
  a ghost per slot as the drop target (the trailing "+" ones grow the
  grid), a handle bar to drag and a resize corner per item, a drop on held slots
  refused, and a TYPED form above the grid — a select per slot, row and
  column buttons, a number-and-unit field per track. Chrome sits in the
  handle. The demo's run page, and the third card of the cards page.
- `@wirework/engine-gridstack` — `{ engine, cols?, cellHeight?, cells: [{
..., x, y, w, h }] }`; the library OWNS the item DOM, so each cell's
  content (chrome + widget) is portalled into the content element gridstack
  creates (static `renderCB`), `load()` syncs items by id, and the `change`
  event's nodes are the change payload. Written against the contract with
  no core, schema or adapter change — the proof that engines are plugins.
- `@wirework/engine-flexlayout` — `{ engine, cells, model }`: a TREE layout
  (docking tabsets), every cell a tab whose id is the cell id. No
  coordinates: the change payload is the library's whole model document
  (`onModelChange` → `toJson()`), `cells()` is the cell list kept beside
  the model, `validate` checks tabs and cells match, and the chrome goes
  into each tab header through `onRenderTab`. The convincing proof.

Each engine package ships its own stylesheet; hosts import the adapter's
plus one per engine. `@wirework/react` depends on no layout library.

## Adding an engine

A new package: define the template schema, implement the operations
(`empty`, `cells`, `appendCell`, `removeCell`, `applyChange`, optional
`validate`), write the renderer against `LayoutRendererProps`, scope the
stylesheet under the renderer's own root class (engines share item class
names), add a unit test asserting `layoutEngineProblems(engine)` is empty,
register the plugin in the host and import its stylesheet there. No core,
schema or adapter change — gridstack and FlexLayout above did exactly this.

## Renderer gotchas (learned from gridstack and FlexLayout)

- Rebuild a library's own model object only when the template CONTENT
  changes (compare the document, not the reference): the library's own
  change round-trips to the same JSON, and rebuilding on every change
  replaces DOM under a press in flight — the click on a chrome button is
  then lost.
- The adapter's chrome buttons stop `pointerdown`/`mousedown` propagation
  so a library never starts a drag or a pointer capture from a press on
  them; grid libraries additionally get a `cancel` selector.
- A library that reports its whole document (FlexLayout) may report from
  an instance that predates the last template edit: `applyChange` must
  reconcile the document with the cell list, the source of truth.
- DOM-owning libraries (gridstack) get React content through portals into
  the elements they create; lazily mounting libraries (FlexLayout tabs)
  render only what has been shown — tests must not count DOM cells as
  "cells in the template".

## Choosing an engine (playground)

The builder page's engine is a FREE CHOICE until the first widget is
placed: the toolbar select replaces the empty builder template with the
chosen engine's `empty()`. Once a cell exists the engine is locked (a
read-only badge) — there is no conversion between engines by decision.

## Editing: one session, replayed ops

`PageView` takes `editable`, `onLayoutChange(change)`, `onEditCell(id)` and
`onRemoveCell(id)`. In edit mode the engine's interactive editing is on and
every cell shows the adapter's chrome (Edit, Remove) where the engine puts
it. The host (playground) runs ONE session: "Edit page" starts it; each
drop/resize, widget save and removal becomes a pure op; the page renders
the store's current trees with the ops replayed on top (an inspector edit
made meanwhile shows through — live rebase); "Save page" commits the
replayed result; "Cancel" drops the ops. Nothing is written until Save.

Widget edits open the shared widget form in a maskless drawer, prefilled
from the cell's resolved view model.

## Where edits go

The playground routes every op by an EDIT TARGET:

- **user** (a page with the user overlay on — the demo as it opens; the
  builder once it holds a widget and the visitor turns the overlay on):
  page-template ops edit what the user SEES — one of the user's OWN
  templates (`userViewModels.pages.<page>.templates.<name>`) in place while
  it is the page `view`, otherwise a fresh copy of the shown prebuilt
  template named "my-own" (the sketch's "my own" pill; "my-own-2", … when
  taken), selected as the view (doc/ADR/0006-page-views.md: the views list,
  Save as, Rename, Delete, Share, Import). Widget edits become per-cell SETTINGS
  overlays (`...cells[<cellId>].settings[<template>]`). A layout INSIDE a
  container (doc/ADR/0009-containers.md) is a setting of the container, so
  "Edit content" with the overlay on writes the user's own copy of it
  there (`cells["card-1"].settings.default.content`), and the widgets
  inside are customised under their chain keys (`cells["card-1/button"]`). The overlay never
  carries `inputs` or `on` — the schema rejects them — so a user's view
  cannot rebind a widget, call an action or write a data path the page
  never declared; the editor shows ports and reactions read-only there.
  The base view models never change; turning the overlay off shows the
  original page and ends any session. An overlay that fails its schema is
  ignored as a whole, and the page says so (`plan.overlayProblem`).
- **base** (the overlay is off — how the builder opens): ops rewrite the
  base view models — the page template and the widget template at
  `cell.model`. Removing a builder-owned cell also drops its template when
  nothing else references it (a user's own template counts).

On the builder the overlay is UNAVAILABLE until the shared page holds a
widget (an empty page has nothing to personalise), and a visit starts with
it off: building is work on the shared page. ADDING a widget always changes
the shared page, so Add waits while the overlay is on — the overlay carries
settings, view and layout only. Known consequence: a user's view is a COPY
of the layout, so a widget added to the shared page afterwards does not
show in it ("personal views are copies").

`pageTemplates(viewModels, userViewModels, page)` layers user templates over
base ones (same name → user wins), and both resolve and boot validation use
it, so a user template is validated exactly like a base one. Widget
customisation is keyed by CELL id, so two cells of one widget stay
independent.

## Known limitations (decisions pending)

- Saving materialises defaulted settings (the form is prefilled from the
  resolved view model), so "blank means default" holds for the builder
  only; an overlay becomes a full copy rather than a diff.
- On the user target settings are deep-merged, so a blanked setting cannot
  UNSET a base value.
- "Add widget" is disabled while a page edit is open (Save or Cancel first).
- flex-rows moves cells by arrows, not by drag, and knows no responsive
  variants (`md:`) — doc/ADR/0010-flex-rows.md, "Later".

## Tested (e2e/features/layout.feature, overlay.feature, builder.feature, flex-rows.feature)

Grid rendering with placements, no handles or chrome outside edit mode,
drag + save, drag + cancel, resize + save; on a demo page: widget edit,
removal and layout edit in one session saved in the user overlay and gone
when the overlay is off, cancel dropping everything, the overlay toggle
ending a session; on the builder page: modify, remove and layout save
written to the base view models. Flex rows: the demo's cards page (a
FlexLayout of two cards side by side, a grid in one and flex rows in the
other — a row of three buttons of different sizes that wraps as the
window narrows), classes saved into the user's own view with the overlay on, cells
moved between rows and classed in the builder, an unknown class flagged
and reported, a card's flex content edited as the page.
