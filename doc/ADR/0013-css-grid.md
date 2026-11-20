# ADR-0013: CSS grid — a page laid out by template areas, every widget an area of its own

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

- A layout engine, `@wirework/engine-css-grid`: `areas` is CSS's own
  `grid-template-areas`, its tokens the cells' ids and `.` an empty slot —
  the cell's id IS its area. `columns` / `rows` / `gap` are the tracks.
- The picture is drawn by drag and drop on the rendered grid. The slot
  table is the second way in; the typed track fields are the only way to
  size.
- No drop is refused: a move swaps, a resize takes slots, and a widget
  left without a slot waits in a tray under the grid.
- Built (story WW-32), the run page as the demo. Not built: responsive
  areas, named areas with a mapping, a generic engine form, conversion.

## 2. Problem

The ask: a layout engine on CSS grid's TEMPLATE AREAS. The page is a grid
of areas, every widget has an id of its own, and the builder fills the
areas with widgets in a form whose fields can hold only what exists. The
owner then asked whether the picture can be DRAWN by drag and drop, with
the sizes typed. It can.

What there was:

- **Four engines** (doc/ADR/0003-layout-engines.md): two grids that drag
  and resize, a docking layout, and `flex-rows`
  (doc/ADR/0010-flex-rows.md), where a ROW can be a grid. None has a
  whole-page skeleton: an area spanning several rows and columns at once,
  said once, as a picture.
- **The plugin contract**: an engine owns its template schema, `empty`,
  `cells`, `appendCell`, `removeCell`, a CHANGE payload that `applyChange`
  replays, `validate`, and a renderer whose edit mode is its own. Adding
  an engine is a package, no core change.
- **Every cell has a stable `id`** whatever the engine (`CellBase`); the
  builder names them `custom-1`, `custom-2`, …
- **A card's content** is a template of any engine
  (doc/ADR/0009-containers.md), so a new engine works inside a card for
  free.

## 3. Details

`@wirework/engine-css-grid`, with no change to the core, the schema, the
adapter or the builder. Pick it for a skeleton; pick flex-rows for rows
that wrap and grow.

### The template

```ts
// @wirework/engine-css-grid, schema.ts
export const cssGridPageSchema = z.object({
  engine: z.literal("css-grid"),
  /** grid-template-areas, one string per row; tokens are cell ids or "." for an empty slot. */
  areas: z.array(z.string()),
  /** One track size per column ("1fr", "200px", "minmax(10rem, 1fr)"); 1fr each when absent. */
  columns: z.array(z.string()).optional(),
  /** One track size per row; auto when absent. */
  rows: z.array(z.string()).optional(),
  /** The gap between slots, a CSS length ("0.5rem"); the stylesheet's when absent. */
  gap: z.string().optional(),
  cells: z.array(cellBaseSchema),
});
```

```ts
{
  engine: "css-grid",
  columns: ["1fr", "1fr", "12rem"],
  areas: ["title title title", "counter echo echo", "reset . ."],
  cells: [{ id: "title", widget: "antd-label", model: "widgets.demo.title", template: "default" }, …],
}
```

- A cell carries ONLY `CellBase`. Its placement is where its id appears
  in `areas`.
- A token is a cell id or `.`. An id must be a CSS custom identifier;
  `validate` reports one that is not (a leading digit, a space).
- `columns` says both the count and the sizes. Absent, the count is the
  longest row's and every column is `1fr`. Absent `rows` are `auto`.
- A cell whose id appears nowhere has NO SLOT. In view mode CSS
  auto-places it after the grid; in edit mode it waits in the tray.
- A cell hidden by its condition keeps its slot, as on every engine
  (doc/ADR/0008-conditions.md).

### The operations

Pure, in `operations.ts`, over the picture's arithmetic in `areas.ts`.

- `empty()` is `{ engine: "css-grid", areas: [], cells: [] }`.
- `cells(template)` is `template.cells`, in order.
- `appendCell(template, cell, size)` appends the cell and gives it a ROW
  of its own across every column — two rows for `"tall"` (a card). An
  empty grid starts one column wide. So adding widgets builds a stack,
  which the author then rearranges.
- `removeCell(template, id)` drops the cell, turns its tokens into `.`
  and drops the rows that are now all `.`. Partial holes stay: they are
  the author's picture.
- The CHANGE payload has two kinds:
  - `{ kind: "areas", areas: string[] }` — the whole picture after a
    drop, a pick, or a row or column added or removed. It carries the
    tracks when the grid's size changed with it (`columns` padded with
    `1fr`, `rows` with `auto`, only when the template has them; a removed
    row or column drops its size), so one drop is one change.
    `applyChange` only replaces.
  - `{ kind: "tracks", columns?, rows?, gap? }` — the sizing fields, one
    change each when committed.

### Validation

`validate(template)` names, as warnings:

- an area that is not a rectangle (`area "custom-1" is not a rectangle:
rows 1–2, columns 1–2 and row 3 column 1`);
- a token that is no cell (`slot row 2 column 3 names "ghost", which is
not a cell`);
- a cell placed nowhere (`cell "custom-4" has no slot and is placed after
the grid`);
- rows of unequal length, and a `columns` list whose length is not the
  row length;
- a track size that is not CSS (`columns[1] "wide" is not a track size`).

An area is a rectangle when every row between the first and the last that
names the id has the same column range, and no other row names it.

**An invalid picture is silent in CSS**: the browser ignores the whole
`grid-template-areas`. So the rule is kept in two places. `validate` says
it, and the view sets `gridTemplateAreas` only while the whole picture is
drawable and gives an item `gridArea` only while its own area is a
rectangle. A broken picture auto-flows with the page's warning above it
instead of disappearing.

### The renderer

`CssGridView` is render-only. One `div.ww-css-grid` with `display: grid`
and the template's areas, columns (or `repeat(n, 1fr)`), rows and gap;
every cell a `div.ww-css-grid-item` with `gridArea: <id>` when it has a
slot. Inline style only for what the template says; the rest in
`styles.css`.

What tests read: `data-testid="css-grid"` with `data-columns`,
`data-rows`, `data-column-sizes`, `data-row-sizes`; per item `data-cell`
and `data-area` (the span as rowStart-colStart/rowEnd-colEnd, `1-1/1-2`,
or absent). Rows and columns count from 0 in the DOM.

Outside edit mode nothing below renders, and the template gets no extra
track. A layout inside a card is the same engine, edited as the page
through "Edit content".

### Drag and drop

The drag surface is the grid itself, on its real track sizes. Nothing is
refused; the drag shows the whole outcome BEFORE the drop, and only the
widgets named in it move.

- **Ghost slots.** Edit mode draws one empty element per slot
  (`css-grid-ghost`, `data-row`, `data-column`) under the items, plus one
  more row and one more column of "+" slots (`data-new="row" | "column"`,
  a 2rem track each). The ghosts are measured once at pointer-down; every
  move is a hit test on those rectangles. The engine has no geometry of
  its own.
- **The handle bar.** Every item has a bar (`css-grid-handle`: a grip,
  the cell's id, the chrome buttons). The WHOLE bar drags
  (`user-select: none`); the chrome buttons stop their press, so Edit and
  Remove never start a drag.
- **A move onto a free slot.** The widget keeps its size where it was
  grabbed when those slots are free, else with its corner at the slot,
  else it takes the one slot (`dropped`).
- **A move onto a held slot SWAPS.** The two widgets exchange rectangles,
  whatever their sizes (`swapped`: the tokens trade, so both stay
  rectangles).
- **Growing.** A drop on a "+" slot adds a row of `.` or a column of `.`
  with `1fr`, in the same change. A widget is never pushed past the edge
  otherwise. Rows and columns left empty are not dropped by drag; the
  form's "−" drops them.
- **A resize TAKES.** Every placed widget has four edges and a corner to
  pull (`css-grid-resize` with `data-edge` `n`, `e`, `s`, `w`, `se`). The
  widget fills the rectangle its edge is pulled to (`resizedSpan`),
  whoever held those slots (`claimed`). A neighbour with a rectangle left
  SHRINKS; one left with an L or with nothing has NO SLOT. Example: a row
  of three, the left widget over two thirds, the right in the last — the
  left's right edge pulled over the last third leaves the right one off
  the grid. An edge pulled back frees the slots it leaves.
- **The tray.** In edit mode a widget with no slot waits in the TRAY
  under the grid (`css-grid-tray`, `data-count`), whole, under a warning
  that names it (`css-grid-unassigned`, `role="alert"`), beside the
  page's own warning from `validate`. It is dragged from there like any
  widget: onto a free slot it takes that slot; onto a widget it takes
  that widget's rectangle and the other goes to the tray. A widget
  dropped ON the tray leaves the grid (`cleared`).
- **The outcome shows first.** While a drag lasts the widget stays where
  it is, faded (`data-dragging`). An outline marks the slots it would
  fill (`css-grid-drop`, `data-area`). The widget it would swap with says
  "swaps places", one that would lose its slot "loses its slot"
  (`data-drop="swap" | "out"`, `css-grid-fate`). A pointer in a gap or
  just outside the grid means the nearest slot; a move let go elsewhere
  changes nothing.
- **One source of truth.** A rectangle moved or resized is a rectangle:
  drag cannot make the picture invalid. Drag and the slot table report
  the same `areas` change, so the operations, validation, the edit
  session and hosts know nothing of pointers. `useCssGridDrag` only
  measures, hit-tests and reports — pointer events, no library.

### The typed form

Edit mode also draws a FORM above the grid (`css-grid-form`): the
keyboard's way, the tester's, and the only way to SIZE anything.

- **The slot table.** One SELECT per slot (`css-grid-slot`, `data-row`,
  `data-column`), its options "empty" and every cell of the template by
  id — a slot can hold only a widget that exists. A pick is one `areas`
  change. Neighbouring slots with the same id are one area, shaded alike.
  A slot that is part of a non-rectangle is `aria-invalid` with the
  reason in its title; the table is the one way a non-rectangle can be
  made.
- **Rows and columns.** "+ row" appends a row of `.`; "+ column" appends
  `.` to every row and `1fr` to `columns`. "−" removes one. It is
  DISABLED, with the reason in its title, while a widget there has no
  other slot (`withoutRow` / `withoutColumn` return undefined then).
- **The tracks.** A size field per column (`css-grid-column`), per row
  (`css-grid-row-size`) and one for the gap (`css-grid-gap`): a NUMBER
  and a UNIT select (`-number` / `-unit` inside) — `fr`, `px`, `rem`, `%`
  — or a keyword in the same select: `auto`, `min-content`,
  `max-content`. A size the browser cannot read cannot be typed. Each
  field commits one `tracks` change on Enter or blur. A new column starts
  at `1fr`, a new row at `auto`.
- **`minmax()` and `repeat()`** stay out of the form. A JSON author may
  write them; the field shows them as text with a title saying so, and
  `validate` reads them.
- The form's words (units, keywords, labels) are kept in one place, for
  translation.

### The package

- `schema.ts` — the template, the two change kinds, `Span`, the units and
  keywords the form offers.
- `areas.ts` — the picture's arithmetic, pure: `tokensOf`, `spanOf`,
  `isRectangle`, `placed`, `unplaced`, `withSlot`, `grownTo`,
  `withoutRow`, `withoutColumn`, `holderIn`, `pictureProblems`,
  `isTrackSize`, `trackParts`, and the drag's `swapped`, `dropped`,
  `claimed`, `resizedSpan`, `cleared`.
- `operations.ts`, `engine.ts`, `CssGridView.tsx`, `useCssGridView.ts`
  (every payload edit mode reports), `useCssGridDrag.ts`,
  `TrackInput.tsx` + `useTrackInput.ts`, `styles.css`.

Tests: the `layoutEngineProblems` conformance test; unit tests of every
validation sentence, of the rectangle rule on an L, a T, two islands and
a hole, and of the drag's arithmetic (a swap of unequal sizes, a size
that does not fit, the row of three, a bite that leaves an L).
`css-grid.feature` proves it in the browser, its steps in
`layout.steps.ts`; every drag has its slot-table twin.

### The demo

The RUN page (`/demo/runs/:runId`) runs on css-grid: three columns, the
third `12rem`. The FlexLayout page's third card, `card-session`, holds a
css-grid inside. The user's overlay and a role's view work on it as on
any engine.

### Risks that stand

- **A hole shows more in a grid than in a row.** An empty slot renders as
  nothing, and a hidden cell keeps its slot.
- **Not responsive.** One `areas` cannot be right on a desk and on a
  phone. Nothing here promises it.
- **The slot table's size.** Rows × columns selects suit a skeleton of a
  dozen slots; forty slots mean the page wants another engine.

### Not built

- **Responsive areas**: `areas` per breakpoint (`areasBelow: { "md":
[...] }`) with the same tokens, through media queries in a generated
  class per template. The template leaves the key free.
- **Named areas with a mapping** (option A), if a host wants skeletons
  shared between pages: tokens become area names, a cell gains `area`,
  `validate` gains "an area nobody fills". A superset of this.
- **A `LayoutEngine.form` slot** (option E), if a third engine wants a
  typed form rendered by the builder.
- **The widget's type beside its id in the slot select**
  (`custom-1 · antd-label`): a label change.
- **"Copy as css-grid" from a react-grid-layout page.** Its `x, y, w, h`
  on twelve columns ARE an areas picture, losslessly. The project decided
  against conversion between engines (doc/ADR/0003-layout-engines.md,
  "Choosing an engine"); this is the one exact pair. Revisit when a page
  wants to move.

## 4. Options weighed

How does a page say "this widget here, spanning that", in a form a page
builder fills rather than a string they type?

| Option                                                                                            | Verdict                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Named areas and a mapping** — areas named `header`, `main`; each cell carries an `area`      | Dropped: two names for one thing. A cell already has an id; a second name must be invented, kept unique and kept in step. A skeleton without widgets is a page view's job (doc/ADR/0006-page-views.md). Kept as a possible superset. |
| **B. The cell's id IS its area** — `areas` as CSS's own strings, tokens the cells' ids            | Chosen. Nothing to map, nothing to mistype, a JSON a reader sees as the page.                                                                                                                                                        |
| **C. Tailwind's grid classes on flex-rows** — `grid grid-cols-3` on a row, `col-span-2` on a cell | Not a replacement: a row-grid cannot span ACROSS rows, and the ask is a form, not a class string. Both engines keep their jobs.                                                                                                      |
| **D. Drag and drop** — on a separate canvas of slots, or on the rendered grid                     | The canvas is dropped: what is drawn there is not what the page shows once columns differ in size. Drag ON THE RENDERED GRID is chosen: a placement is a rectangle of slots and so is an area. Drag cannot say a track's SIZE.       |
| **E. A form generated from the engine's schema** (`settingFields`)                                | Dropped for this engine: right for the track fields, but `areas` holds the page's cell ids, which no schema knows — it would come out as a JSON field.                                                                               |

What still explains the choice:

- **One identity.** B keeps `CellBase.id` as the only name and puts the
  engine's knowledge in the engine: the picture is a template field, the
  form and the drag are the renderer's edit mode, the ops are pure,
  `validate` holds the picture's rules.
- **CSS's own strings.** The one representation a reader already knows. A
  nested array, an object per area, a shorthand without `.` or spans
  inferred from order would be a second grammar: the picture must be the
  JSON.
- **Selects, not a text area.** A select cannot be mistyped, and a tester
  fills it by name from a written picture.
- **Two ways in, one payload.** Drag and the table meet at one change; a
  third way would not be worth it. The drag is one small hook with no
  dependency, and it keeps the engine's one awkward failure (a
  non-rectangle) off the main path.
- **Swap and take, not refuse and not push.** A hand that lets go over a
  widget expects the two to change places, and a corner that stops at a
  neighbour is hard to understand. Pushing is how a layout drifts under
  the hand; showing the outcome before the drop, with only the named
  widgets moving, answers that worry.
