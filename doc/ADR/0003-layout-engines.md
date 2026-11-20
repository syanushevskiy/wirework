# ADR-0003: Layout engines — plugins, one page session, edits routed to a target

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

The core knows no layout. A page template names its engine, and a registered
plugin owns the template's shape, its operations and its renderer. Five
engines are shipped: react-grid-layout, flex rows, CSS grid, gridstack,
FlexLayout. There is no conversion between engines. A page is edited in one
session of pure ops, nothing written until Save, and every op is routed to an
edit target. Built and tested; three limitations wait for decisions.

## 2. Problem

A dashboard needs free placement (drag, resize), and the layout library is a
choice, not a constant: react-grid-layout today, gridstack or FlexLayout
tomorrow. This record says where a page's layout lives, how a layout library
is plugged in, how a page is edited, and where its edits are written.

## 3. Details

### Plugin contract (`@wirework/schema`, `contracts/layout-engine.ts`)

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

- `C` is the engine's own change payload: placements by id for a grid, a whole
  model document for a docking layout.
- The core never looks inside a template. `PageViewModel` in the core is only
  `{ engine: string }` plus whatever the engine validates.
- `appendCell`'s `size` is a HINT: the builder asks for a `"tall"` cell when
  the widget holds a layout of its own (doc/ADR/0009-containers.md). The grid
  engines give it twice their rows; an engine whose cells size to content
  ignores it.

The React adapter narrows the renderer slot (`ReactLayoutEngine`,
`defineLayoutEngine`) to a component receiving `LayoutRendererProps`:

```ts
{ template: T; cells: ResolvedCell[]; cellById; editable: boolean;
  onChange?(change: C): void;
  renderCell(cell): ReactNode;            // widget in its boundary, cell-scoped emit, read-only store
  renderChrome?(cell): ReactNode }        // edit-mode Edit/Remove actions — the engine PLACES them
```

### Registry and checks

- The engine registry (`createLayoutEngines`) is as strict as the widget one.
- `resolveTemplate(engines, raw)` validates the core shape, finds the plugin,
  validates the template with it, lists its `cells` (a plugin that throws
  there is a problem, not a crash) and runs the plugin's `validate`. Resolve,
  validation and editors share it, so they cannot disagree.
- A page whose engine is unknown, or whose template the engine rejects,
  renders a page problem.
- `validate` findings are errors at boot and WARNINGS on the render plan
  (`plan.warnings`, shown above the page).
- A renderer that throws is caught by a page-level boundary: the host and its
  tools stay usable.
- `layoutEngineProblems(engine)` (`@wirework/engine`) checks what the
  operations DO: `empty()` valid and cell-less, `appendCell` keeps identity
  and order, `removeCell` removes exactly one and ignores unknown ids, no
  operation mutates its input. Every engine package's unit tests run it.

### Engines shipped

| Package                              | Template                                                                              | Change payload                                                              | `validate`                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `@wirework/engine-react-grid-layout` | `{ engine, cols?, rowHeight?, cells: [{ id, widget, model, template, x, y, w, h }] }` | placements by id                                                            | cells fit the column count                                                            |
| `@wirework/engine-flex-rows`         | `{ engine, rows: [{ classes?, cells: [{ ..., classes? }] }] }`                        | a cell's or a row's classes, or a cell moved to a row and index             | names unknown classes                                                                 |
| `@wirework/engine-css-grid`          | `{ engine, areas, columns?, rows?, gap?, cells }`                                     | the whole picture (with the tracks when the grid grew or shrank), or tracks | a non-rectangle, a token that is no cell, a cell with no slot, a size that is not CSS |
| `@wirework/engine-gridstack`         | `{ engine, cols?, cellHeight?, cells: [{ ..., x, y, w, h }] }`                        | the `change` event's nodes                                                  | —                                                                                     |
| `@wirework/engine-flexlayout`        | `{ engine, cells, model }`                                                            | the library's whole model document (`onModelChange` → `toJson()`)           | tabs and cells match                                                                  |

- **react-grid-layout.** Edit-mode chrome sits in the drag-handle bar; the
  buttons are excluded from the drag through the library's `cancel` selector.
- **Flex rows** (doc/ADR/0010-flex-rows.md). Each row is a flexbox. A row's
  and a cell's `classes` are Tailwind's layout class names, turned into style
  by the engine's own table. Edit mode: a bar per row and a handle per cell,
  each with a field for the classes; chrome sits in the handle. A cell is
  moved by DRAG: dropped on another cell the two swap, on its side it goes
  beside it, on the strip between rows it takes a row of its own. Sizes stay
  classes.
- **CSS grid** (doc/ADR/0013-css-grid.md). A grid of SLOTS. `areas` is CSS's
  own `grid-template-areas`, one string per row, its tokens the cells' ids and
  `.` an empty slot — the cell's id IS its area. CSS silently drops a picture
  with a non-rectangle, so the renderer leaves it unset. Edit mode: a ghost
  per slot as the drop target (the trailing "+" ones grow the grid), a handle
  bar to drag and resize edges per item; a drop on a slot another widget
  holds SWAPS the two — nothing is refused. Above the grid a TYPED form: a
  select per slot, row and column buttons, a number-and-unit field per track.
  Chrome sits in the handle.
- **gridstack.** The library OWNS the item DOM: each cell's content (chrome +
  widget) is portalled into the content element gridstack creates (static
  `renderCB`), and `load()` syncs items by id. Written against the contract
  with no core, schema or adapter change.
- **FlexLayout.** A TREE layout (docking tabsets), every cell a tab whose id
  is the cell id. No coordinates. `cells()` is the cell list kept beside the
  model; the chrome goes into each tab header through `onRenderTab`.

Each engine package ships its own stylesheet; a host imports the adapter's
plus one per engine. `@wirework/react` depends on no layout library.

### Adding an engine

A new package:

1. define the template schema;
2. implement the operations (`empty`, `cells`, `appendCell`, `removeCell`,
   `applyChange`, optional `validate`);
3. write the renderer against `LayoutRendererProps`;
4. scope the stylesheet under the renderer's own root class (engines share
   item class names);
5. add a unit test asserting `layoutEngineProblems(engine)` is empty;
6. register the plugin in the host and import its stylesheet there.

No core, schema or adapter change.

### Renderer gotchas

- Rebuild a library's own model object only when the template CONTENT changes
  (compare the document, not the reference). The library's own change
  round-trips to the same JSON; rebuilding on every change replaces DOM under
  a press in flight, and the click on a chrome button is lost.
- The adapter's chrome buttons stop `pointerdown` / `mousedown` propagation,
  so a library never starts a drag or a pointer capture from a press on them.
  Grid libraries also get a `cancel` selector.
- A library that reports its whole document (FlexLayout) may report from an
  instance that predates the last template edit: `applyChange` must reconcile
  the document with the cell list, the source of truth.
- DOM-owning libraries (gridstack) get React content through portals into the
  elements they create. Lazily mounting libraries (FlexLayout tabs) render
  only what has been shown — tests must not count DOM cells as "cells in the
  template".

### Choosing an engine

A layout's engine is a FREE CHOICE until its first widget is placed: the
toolbar select replaces the empty template with the chosen engine's `empty()`.
Once a cell exists the engine is locked (a read-only badge). There is no
conversion between engines: a different engine is a different template.

### Editing: one session, replayed ops

`PageView` takes `editable`, `onLayoutChange(change)`, `onEditCell(id)` and
`onRemoveCell(id)`. In edit mode the engine's interactive editing is on and
every cell shows the adapter's chrome (Edit, Remove) where the engine puts it.

The host runs ONE session:

- "Edit page" starts it;
- each drop or resize, widget save and removal becomes a pure op;
- the page renders the store's current trees with the ops replayed on top (an
  inspector edit made meanwhile shows through);
- "Save page" commits the replayed result; "Cancel" drops the ops.

Nothing is written until Save. A widget edit opens the shared widget form in a
maskless drawer, prefilled from the cell's resolved view model.

### Where edits go

Every op is routed by an EDIT TARGET.

**user** — the user overlay is on.

- Page-template ops edit what the user SEES: one of the user's OWN templates
  (`userViewModels.pages.<page>.templates.<name>`) in place while it is the
  page `view`; otherwise a fresh copy of the shown prebuilt template named
  "my-own" ("my-own-2", … when taken), selected as the view
  (doc/ADR/0006-page-views.md).
- Widget edits become per-cell SETTINGS overlays
  (`...cells[<cellId>].settings[<template>]`).
- A layout INSIDE a container (doc/ADR/0009-containers.md) is a setting of the
  container: "Edit content" writes the user's own copy of it there
  (`cells["card-1"].settings.default.content`), and the widgets inside are
  customised under their chain keys (`cells["card-1/button"]`).
- The overlay never carries `inputs` or `on` — the schema rejects them. The
  editor shows ports and reactions read-only there.
- The base view models never change. Turning the overlay off shows the
  original page and ends any session.
- An overlay that fails its schema is ignored as a whole, and the page says so
  (`plan.overlayProblem`).

**base** — the overlay is off.

- Ops rewrite the base view models: the page template and the widget template
  at `cell.model`.
- Removing a builder-owned cell also drops its template when nothing else
  references it (a user's own template counts).

A third target, a ROLE's layer, is doc/ADR/0012-roles.md.

On the builder page:

- the overlay is UNAVAILABLE until the shared page holds a widget, and a visit
  starts with it off;
- ADDING a widget always changes the shared page, so Add waits while the
  overlay is on — the overlay carries settings, view and layout only;
- a user's view is a COPY of the layout, so a widget added to the shared page
  afterwards does not show in it.

`pageTemplates(viewModels, userViewModels, page)` layers user templates over
base ones (same name → user wins). Resolve and boot validation both use it, so
a user template is validated exactly like a base one. Widget customisation is
keyed by CELL id, so two cells of one widget stay independent.

### Known limitations (decisions pending)

- Saving materialises defaulted settings (the form is prefilled from the
  resolved view model), so "blank means default" holds for the builder only;
  an overlay becomes a full copy rather than a diff.
- On the user target settings are deep-merged, so a blanked setting cannot
  UNSET a base value.
- Flex rows know no responsive variants (`md:`) — doc/ADR/0010-flex-rows.md.

On the builder page "Add widget" waits for an open page edit to end (Save or
Cancel first).

### How it is tested

`e2e/features/layout.feature`, `overlay.feature`, `builder.feature`,
`flex-rows.feature` and `css-grid.feature`; `layoutEngineProblems` in every
engine package's unit tests.

## 4. Options weighed

| Option                     | Verdict                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A layout the core knows    | Dropped. One library as a constant of the core and the adapter is refused by the requirement itself: the library is a choice, so the template's shape and the renderer cannot belong to the core.                                     |
| Conversion between engines | Dropped. Moving one page from one engine's template to another's is not offered: a different engine is a different template.                                                                                                          |
| Engines as plugins         | Chosen. A template names its engine; a plugin owns the shape, the operations and the renderer. Costs a contract every engine implements and a package per library; gridstack and FlexLayout needed no core, schema or adapter change. |
