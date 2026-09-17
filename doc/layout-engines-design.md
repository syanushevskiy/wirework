# Layout engines — plugins, one page session, edits routed to a target

## Motivation

A dashboard needs free placement (drag, resize) and the layout library is a
choice, not a constant: react-grid-layout today, gridstack or FlexLayout
tomorrow. So the core knows NO layout: a page template declares its engine
by name and a registered plugin owns everything else. There is no
conversion between engines (removed by decision) — a different engine is a
different template.

## Plugin contract (`@wirework/schema`, `contracts/layout-engine.ts`)

```ts
interface LayoutEngine<T extends PageViewModel, C, TRenderer> {
  name: string;                            // page templates: { engine: "<name>", ... }
  template: Validator<T>;                  // the engine OWNS the template shape
  cells(template: T): CellBase[];          // identity + widget binding, stable order
  appendCell(template: T, cell: CellBase): T;
  removeCell(template: T, cellId: string): T;
  applyChange(template: T, change: C): T;  // renderer-reported change, PURE
  empty(): T;                              // what a builder starts from
  validate?(template: T): string[];        // e.g. "cell exceeds the grid"
  renderer: TRenderer;                     // opaque to the core
}
```

`C` is the engine's own change payload: placements by id for a grid, a
whole model document for a docking layout. The core never looks inside a
template. `PageViewModel` in the core is only `{ engine: string }` plus
whatever the engine validates.

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
validates the template with it and runs the plugin's `validate` — shared by
resolve, validation and editors, so they cannot disagree. A page whose
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
- `@wirework/engine-flex-rows` — `{ engine, rows: [[{ ..., width?, height?
  }]] }`; no interactive change; chrome sits above each cell.
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

- **user** (the demo page with the user overlay on): page-template ops
  edit what the user SEES — the user's OWN template
  (`userViewModels.pages.<page>.templates["my-own"]`, the sketch's "my own"
  pill) while it is the page `view`, otherwise a fresh copy of the shown
  template, selected as the view. Widget edits become per-cell SETTINGS
  overlays (`...cells[<cellId>].settings[<template>]`). The overlay never
  carries `inputs` or `on` — the schema rejects them — so a user's view
  cannot rebind a widget, call an action or write a data path the page
  never declared; the editor shows ports and reactions read-only there.
  The base view models never change; turning the overlay off shows the
  original page and ends any session. An overlay that fails its schema is
  ignored as a whole, and the page says so (`plan.overlayProblem`).
- **base** (everywhere else, e.g. the builder): ops rewrite the base view
  models — the page template and the widget template at `cell.model`.
  Removing a builder-owned cell also drops its template when nothing else
  references it.

`pageTemplates(viewModels, userViewModels, page)` layers user templates over
base ones (same name → user wins), and both resolve and boot validation use
it, so a user template is validated exactly like a base one. Widget
customisation is keyed by CELL id, so two cells of one widget stay
independent.

## Known limitations (decisions pending)

- The widget editor EDITS one reaction per event (the first). The rest of
  the chain is kept and listed ("then 2 more reactions"), and the first
  reaction keeps its `with` / `value` while its target is unchanged — a
  save never shortens a chain. Editing the others is a UI decision.
- Saving materialises defaulted settings (the form is prefilled from the
  resolved view model), so "blank means default" holds for the builder
  only; an overlay becomes a full copy rather than a diff.
- On the user target settings are deep-merged, so a blanked setting cannot
  UNSET a base value.
- "Add widget" is disabled while a page edit is open (Save or Cancel first).
- flex-rows has no interactive editing and no e2e page in the playground.

## Tested (e2e/features/layout.feature, overlay.feature, builder.feature)

Grid rendering with placements, no handles or chrome outside edit mode,
drag + save, drag + cancel, resize + save; on the demo page: widget edit,
removal and layout edit in one session saved in the user overlay and gone
when the overlay is off, cancel dropping everything, the overlay toggle
ending a session; on the builder page: modify, remove and layout save
written to the base view models.
