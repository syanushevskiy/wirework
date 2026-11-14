# ADR-0013: CSS grid — a page laid out by template areas, every widget an area of its own

- **Status:** Accepted — built
- **Date:** 2026-11-07
- **Deciders:** the tiger team (doc/team_tiger.md) and the product owner

Designed 7 November 2026 with the tiger team (doc/team_tiger.md), at the
product owner's ask; amended the same day after the owner's question
whether the picture can be DRAWN by drag and drop, with sizes typed (it
can — "Drag and drop" below). Status: BUILT the same day as designed
("Built" at the end; story WW-32 in doc/product-stories.md).

## The ask

A new layout engine, `engine-css-grid`, built on CSS grid's TEMPLATE AREAS:
the page is a grid of named areas, every widget inside has an id of its
own, and the builder offers a TYPED form to fill the template's areas with
the widgets — no class strings, no drag; a form whose fields can only hold
what exists.

## What there is

- **Four engines** (doc/ADR/0003-layout-engines.md): two grids that drag and
  resize (react-grid-layout, gridstack), a docking layout (FlexLayout) and
  `flex-rows`, which lays cells out in rows of a flexbox each and takes
  Tailwind's layout class names (doc/ADR/0010-flex-rows.md) — including
  `grid grid-cols-3` on a row and `col-span-2` on a cell, so a ROW can be
  a grid today. What none of them has is a whole-page skeleton: an area
  that spans several rows and columns at once (a sidebar beside three rows
  of content), said once, as a picture.
- **The plugin contract** (`contracts/layout-engine.ts`): a template
  schema the engine owns, `empty`, `cells`, `appendCell`, `removeCell`, a
  CHANGE payload the core validates before `applyChange` (pure, replayed by
  the edit session), `validate` for the engine's own problems (warnings
  above the page, errors at boot) and a renderer given the resolved cells,
  `renderCell`, `renderChrome` and `editable`. Adding an engine is a
  package, no core change — flex-rows did exactly that, with its edit-mode
  UI (the bars, the arrows, the classes fields) inside its renderer.
- **The builder** picks the engine while the page is empty (toolbar select),
  appends cells through `appendCell`, replays the renderer's changes as
  ops, and routes them to the shared page, the user's view or a role's
  (doc/ADR/0012-roles.md). Every cell has a stable `id` whatever the engine
  (`CellBase`); the builder names them `custom-1`, `custom-2`, …
- **Nested layouts** (doc/ADR/0009-containers.md): a card's content is a
  template of any engine, rendered by `NestedLayout`, edited as the page
  with a breadcrumb — a new engine works inside a card for free.
- **Typed forms**: the widget form is generated from a widget's zod schema
  (`settingFields`: text, number, boolean, select, items). An engine has no
  form of its own; its edit-mode UI is whatever its renderer draws.

## The question, and five answers

How does a page say "this widget here, spanning that", in a form a page
builder fills rather than a string they type?

**A. Named areas and a mapping.** The template names areas (`header`,
`sidebar`, `main`) in `grid-template-areas` and every cell carries an
`area` field naming one; the builder's form is a select per cell. The
textbook shape, and it lets a skeleton exist before its widgets. Rejected:
two names for one thing. A cell already has an id; the area name would be
a second one to invent, keep unique, keep in step with the first, and
mistype — and a skeleton without widgets is a page VIEW's job
(doc/ADR/0006-page-views.md), not a layout's. Kept as a fallback (see
"Later") if a host ever wants skeletons shared between pages.

**B. The cell's id IS its area.** `areas` is CSS's own
`grid-template-areas`, one string per row, its tokens the ids of the
page's cells and `.` for an empty slot: `["title title title", "counter
echo echo", "reset . ."]`. Every widget inside has its own id, and that id
is what the picture says. The typed form is the picture itself: a table of
SLOTS, one select per slot listing the page's cells (and "empty"); adjacent
slots with the same id are one area. Nothing to map, nothing to mistype, a
JSON a reader sees as the page. **Chosen.**

**C. Tailwind's grid classes on flex-rows.** `grid grid-cols-3` on a row,
`col-span-2 row-span-2` on a cell: the words exist and the engine is
built. Ren's "do we need this?" — and the honest answer is that a row-grid
cannot span ACROSS rows: a sidebar beside three rows of content needs the
rows to be one grid, which is exactly what template areas say and
flex-rows cannot. And the ask is a form, not a class string. Not rejected:
the two engines keep their jobs — flex-rows for rows that wrap and grow,
css-grid for a skeleton.

**D. Drag and drop.** Draw the picture with the mouse. Weighed twice. A
separate CANVAS of slots (a painter beside the page) is rejected:
react-grid-layout and gridstack already drag on a canvas, and what is
drawn there is not what the page shows once columns differ in size. Drag
ON THE RENDERED GRID is **chosen** as the way to draw: a placement is a
rectangle of slots and so is an area — the two are the same information,
`x, y, w, h` per cell both ways, which is why the react-grid-layout engine
could carry a page for two years — so a widget moved or resized over the
grid's real tracks produces the picture, always rectangles, and never
anything the picture cannot say. What drag cannot say is a track's SIZE;
that is the typed form's half (see "The typed form"). The slot table stays
as the second way to the same change: the keyboard's, the tester's, the
reader's.

**E. A form generated from the engine's template schema.** Run
`settingFields` over the engine's zod schema (`columns`, `rows`, `gap`,
`areas`) and render it with the widget form's machinery. Attractive, and
right for the three track fields — but `areas` is a list of strings whose
VALUES are the page's cell ids, which no schema knows; it would come out as
a JSON field, the opposite of typed. Rejected for this engine; noted under
"Later" as a `LayoutEngine.form` slot should a third engine want a form.

## The design

### The template

```ts
// @wirework/engine-css-grid, schema.ts
export const cssGridPageSchema = z.object({
  engine: z.literal("css-grid"),
  /** grid-template-areas, one string per row; tokens are cell ids or "." for an empty slot. */
  areas: z.array(z.string()),
  /** grid-template-columns as one track size per column ("1fr", "200px", "minmax(10rem, 1fr)"); 1fr each when absent. */
  columns: z.array(z.string()).optional(),
  /** grid-template-rows as one track size per row; auto when absent. */
  rows: z.array(z.string()).optional(),
  /** The gap between slots, a CSS length ("0.5rem"); the stylesheet's when absent. */
  gap: z.string().optional(),
  cells: z.array(cellBaseSchema),
});
```

```ts
// the run page as a skeleton: the name over two columns, the back button beside it, the status row, the error row with the retry tag
{
  engine: "css-grid",
  columns: ["1fr", "1fr", "12rem"],
  areas: [
    "label-run-name label-run-name button-back",
    "status-run tag-run-reference label-run-message",
    "label-run-error label-run-error tag-run-retry",
    "echo-route echo-route echo-route",
  ],
  cells: [{ id: "label-run-name", widget: "antd-label", model: "widgets.run.name", template: "default" }, …],
}
```

- A cell carries ONLY `CellBase`: its placement is where its id appears in
  `areas`. A cell whose id appears nowhere is UNPLACED: CSS auto-places it
  after the areas (grid auto-flow), and `validate` says so.
- A token is a cell id or `.`. An id is a CSS custom identifier already
  (the builder's `custom-1`, the demo's `label-run-name`); `validate`
  reports one that is not (a leading digit, a space).
- `columns` says both the count and the sizes; absent, the count is the
  longest row's and every column is `1fr`. `rows` sizes rows that need it
  (a `minmax(8rem, auto)` for a table); absent, rows are `auto`.

### The operations (`operations.ts`), pure

- `empty()` is `{ engine: "css-grid", areas: [], cells: [] }`.
- `cells(template)` is `template.cells`, in order.
- `appendCell(template, cell, size)` appends the cell and gives it a ROW
  of its own spanning every column — `"custom-3 custom-3 custom-3"` — two
  rows for `"tall"` (a card). An empty grid starts one column wide. So
  adding widgets in the builder builds a stack, as flex-rows does, and the
  form then rearranges it.
- `removeCell(template, id)` drops the cell, turns its tokens into `.`,
  and drops the rows that are now all `.`; partial holes stay — they are
  the author's picture.
- The CHANGE payload, two kinds:
  - `{ kind: "areas", areas: string[] }` — the whole picture after a slot
    was filled, emptied, or a row or column added or removed. The form
    computes it; `applyChange` only replaces it. One change per pick.
  - `{ kind: "tracks", columns?, rows?, gap? }` — the three sizing fields,
    each one change when committed.
- `validate(template)` names, as warnings: an area that is not a rectangle
  (`area "custom-1" is not a rectangle: rows 1–2, columns 1–2 and row 3
column 1` — CSS ignores the whole `grid-template-areas` then, and the
  page auto-flows), a token that is no cell of the template (`slot row 2
column 3 names "ghost", which is not a cell`), a cell placed nowhere
  (`cell "custom-4" has no slot and is placed after the grid`), rows of
  unequal length, a `columns` list whose length is not the row length, and
  a track size that is not CSS (`columns[1] "wide" is not a track size`).
  Pure data, tested in node.

### The renderer (`CssGridView`), view mode

One `div.ww-css-grid` with `display: grid`, `gridTemplateAreas` from the
rows (each quoted), `gridTemplateColumns` from `columns` (or `repeat(n, 1fr)`),
`gridTemplateRows` from `rows`, `gap` from `gap`; every cell a
`div.ww-css-grid-item` with `gridArea: <id>` when its id has a slot, none
otherwise (auto-placed). Inline style only for what the template says —
the guidelines' rule for values that come from data; the rest in
`styles.css` under `.ww-css-grid`. When `validate` finds an area that is
no rectangle the view does not set `gridTemplateAreas` at all (CSS would
drop it anyway) and the page's warning says why — the page stands, as it
does for an unknown class on flex-rows. Attributes for the suite:
`data-testid="css-grid"`, `data-columns`, `data-rows`; per item
`data-cell` and `data-area` (the slot span as `r1-r2/c1-c2`, or absent).

### Drag and drop (edit mode)

The drag surface is the grid itself, not a canvas: what is dragged is what
the page shows, on the real track sizes.

- **The ghost slots.** In edit mode the view draws one empty element per
  slot (`css-grid-ghost`, `data-row`, `data-column`), placed with
  `gridRow` / `gridColumn` under the items. A drop target is a hit test on
  them — no geometry of the engine's own, the browser laid the slots out.
- **Move.** Every item has a HANDLE BAR (`css-grid-handle`: a grip glyph,
  the cell's id, the chrome buttons). Dragging the bar anywhere but on a
  button carries the rectangle whole; the slot under the pointer is where its
  top-left lands; the ghosts the rectangle would cover highlight as it
  moves. On release the view computes the new `areas` — the old tokens
  `.`, the new rectangle the id — and reports ONE `areas` change. A
  rectangle moved is a rectangle: nothing drag does can make the picture
  invalid.
- **Resize.** A RESIZE corner (`css-grid-resize`) extends or shrinks the
  rectangle's end slot; the same change kind, the same rule.
- **Overlap refuses.** A drop that would cover a slot another widget holds
  is refused: the covered ghosts turn red with the reason in their title
  and the picture does not change. Not swap, not push — pushing is how
  react-grid-layout's layouts drift under the user's hands, and the
  picture must only change where the user put something.
- **Growing.** Dragging past the last row or the last column adds one — a
  row of `.`, a column of `.` with `1fr` — in the same change, so the grid
  grows as the picture needs it. Rows and columns left empty are not
  dropped by drag (the author may want the room); "− row" / "− column" in
  the form drops them.
- **One source of truth.** Drag and the slot table report the same
  payload; the operations, the validation, the session and the suite know
  nothing of pointers. Pointer events, no library (`useCssGridDrag`, the
  view render-only).

### The typed form (edit mode)

Edit mode draws the picture as a FORM above the grid too, `css-grid-form`
— the keyboard's way, the tester's, and the only way to SIZE anything:

- **The slot table.** One row per grid row, one SELECT per slot
  (`css-grid-slot`, `data-row`, `data-column`), its options "empty" and
  every cell of the template by id — the select is typed by the page: a
  slot can hold only a widget that exists. Picking commits one `areas`
  change; the view re-renders at once, and adjacent slots with the same id
  read as one area (the table shades them alike). A slot that is part of a
  non-rectangle is `aria-invalid` with the reason in its title — the one
  way a non-rectangle can be made, since drag cannot.
- **Rows and columns.** "+ row" appends a row of `.`; "− row" (per row)
  removes it — refused, with the reason in the button's title, while a
  slot in it holds a widget that has no other slot (the widget would fall
  out of the picture). "+ column" appends `.` to every row and `1fr` to
  `columns`; "− column" likewise. Each is one `areas` change (and one
  `tracks` change when `columns` follows).
- **The tracks, TYPED.** A size field per column (`css-grid-column`,
  `data-column`), per row (`css-grid-row-size`, `data-row`) and one for the
  gap (`css-grid-gap`): a NUMBER and a UNIT select — `fr` (a fraction of
  the room left: `1fr`, `2fr`), `px`, `rem`, `%` — or one of the keywords
  `auto`, `min-content`, `max-content` in the same select. A size the
  browser cannot read cannot be typed; `minmax()` and `repeat()` stay out
  of the form (a JSON author may still write them, and `validate` reads
  them). A new column from drag or "+ column" starts at `1fr`, a new row
  at `auto`. Each field commits one `tracks` change on Enter or blur.
- **The cells.** Every item keeps a HANDLE with its id and the adapter's
  chrome (Edit, Remove, Edit content, Wrap in a card), as every engine's
  edit mode does; an unplaced cell's handle says "no slot — placed after
  the grid".

Outside edit mode nothing of this renders. A layout inside a card is the
same engine under `NestedLayout`, edited as the page through "Edit
content" — the form appears there with the breadcrumb, as flex-rows' bars
do.

### Builder usage (for the page builder)

1. In the builder, pick **css-grid** in the engine select while the page is
   empty (a card's content too).
2. Add widgets. Each takes a row of its own across the grid.
3. Press **Edit page**. DRAG a widget by its handle bar onto the slot
   where it should start — past the right edge to make a new column, past
   the bottom for a new row — and pull its corner to span more slots;
   slots another widget holds refuse, in red. Or fill the slot table
   instead: pick which widget each slot holds, the same widget in two
   neighbouring slots spans them, "empty" leaves a hole. Then SIZE the
   tracks: give column 3 `12` `rem`, column 1 `2` `fr` for twice the room
   of a `1fr` column, a row `min-content`; the page follows at once. A
   slot-table picture that is not rectangles is marked where it goes wrong
   and the page says so above (drag cannot make one).
4. **Save page.** As on every engine, the layout goes into your own view
   with the overlay on, into the role's when editing for one, into the
   shared page otherwise — the same ops, the engine only applies them.

### The demo

The RUN page (`/demo/runs/:runId`) moves to css-grid: eight cells it has
today, arranged as the skeleton above — the name over two columns with
the back button in the third, a status row of three, the error line over
two with the retry tag beside it, the route echo across the bottom. Every
scenario on the run page asserts what shows and what it reads, never a
grid position, so they stand; `layout.feature` gains the run page's
engine and one cell's slot. The user's overlay and a role's view work on
it unchanged, as they do on any engine: the page's own `load` fires once,
the cells' conditions hide and show.

### Scenarios (`css-grid.feature`)

As a non-technical QA reads them: the run page renders on the css-grid
engine with `label-run-name` spanning two columns and `button-back` in the
third (`the cell "label-run-name" fills the slots "1-1/1-2"`); in the
builder, css-grid picked while empty, two widgets added each take a row
(`the grid has 2 rows and 1 column`), DRAGGING the second past the right
edge (`I drag the cell "custom-2" to the slot row 1 column 2`) makes a
second column and puts them side by side, leaving row 2 empty, "− row"
drops it; dragging it onto a slot the first holds is refused (`the drop
is refused because the slot holds "custom-1"`) and the picture stands;
pulling its corner one slot down spans two rows (`the cell "custom-2"
fills the slots "1-2/2-2"`); the same by the slot table (`I put "custom-2"
into the slot row 1 column 2`); giving column 2 `12` `rem` is seen (`the
column 2 is 12rem wide`) and saved, and `2` `fr` on column 1 makes it
twice column 3's `1fr`; picking the same widget in an L in the slot table
warns `area "custom-1" is not a rectangle` and the slot is marked; a card
on css-grid is edited as the page with the drag, the form and the
breadcrumb; the layout saved with the overlay on goes to my own view and
is gone with it off.

## The tiger team's positions

- **Morgan (product):** a form a product owner can fill in a demo — "put
  the table here, the filters there, make this column narrow" — without a
  class vocabulary; the run page as the showcase, because it is the page
  people recognise as a layout. Asks that the slot table name widgets by
  something readable beside the id (the widget type: `custom-1 ·
antd-label`), and that "− row" says why it refuses.
- **Alexei (architecture):** B keeps one identity (`CellBase.id`) and
  puts the engine's knowledge in the engine: the picture is a template
  field the engine owns, the form and the drag are the renderer's edit
  mode as flex-rows' bars are, the ops are pure and replayed by the session
  untouched, `validate` is where the picture's rules live — no core,
  schema or builder change, which is what "adding an engine is a package"
  promised. Insists the renderer never computes a layout the template did
  not say: inline style only from `areas`, `columns`, `rows`, `gap`. On
  the drag: the drag hook computes a PICTURE and reports it, never a
  pixel; the operations stay what they were; placements and areas are one
  information, so no second model appears.
- **Dmitri (readability):** `areas` as CSS's own strings is the one
  representation a reader already knows; a nested array or an object per
  area would be a second grammar. The slot table over a text area because a
  select cannot be mistyped and a tester can fill it by name. Against a
  `.`-less shorthand or inferring spans from order: the picture must be the
  JSON. Two ways in (drag, the table) are fine exactly because they meet
  at one change payload; a third would not be.
- **Katya (team lead):** one package on the flex-rows pattern (schema,
  operations, view, hook, inputs, styles, unit tests, README), the
  `layoutEngineProblems` conformance test first; the demo page switched
  rather than a fifth demo page to maintain; estimate a day and a half,
  no builder work because the form is the engine's. Wants the track
  datalist and the slot-table words in one place for translation later.
- **Sasha (QA):** every fact a DOM fact: `data-area` on an item for the
  span, `data-row`/`data-column` on a slot, `aria-invalid` on a bad slot or
  track, the warning text above the page; the slot select driven by
  `chooseOption` like every antd select; the rectangle rule unit-tested on
  the shapes that bite (an L, a T, two islands of one id, a hole inside);
  the non-technical QAs can fill the slot table from a written picture.
  The drag is tested as the grid engines' is (Playwright's drag onto a
  ghost slot, the refusal's red ghost and title), and every drag scenario
  has its slot-table twin so a failing drag never hides a broken picture.
- **Ren (contrarian):** first, "do we need this?" — flex-rows' rows can
  be grids; the answer that holds is the cross-row span and the form, so
  the design should say in one line when to pick which (a skeleton →
  css-grid; rows that wrap and grow → flex-rows). Second, invalid
  `grid-template-areas` is silently ignored by browsers: without the
  rectangle check in `validate` AND the renderer refusing to set it, a
  builder would see a page auto-flow with no word why — keep both. Third,
  the empty slot `.` is a hole that renders as nothing; when a cell's
  condition hides it the slot stays, as everywhere (doc/ADR/0008-conditions.md),
  and the design should say so, because a grid makes a hole more visible
  than a row does. Fourth, responsive: a skeleton that is right on a desk
  is wrong on a phone; one `areas` cannot say both. Not now — but the
  template should leave the door open (a per-breakpoint `areas` later,
  the same tokens), and the design must not promise responsiveness it has
  not got. Fifth, on drag: refuse on overlap, never push — a layout that
  rearranges itself under the hand is the react-grid-layout complaint
  this engine exists to answer; and a drop onto a slot the user cannot see
  (a hidden widget's) must still refuse, so the ghosts know every token,
  not every visible cell.
- **Vlad (fluency):** the operations are a few chains over `areas` — split
  on whitespace, map a token, join; a rectangle check is "every row
  between the first and the last that names the id has the same column
  range, and no other does"; `appendCell` is `[...areas, Array(columns)
.fill(id).join(" ")]`. No class table to maintain this time.
- **External reviewer:** the minimum is one package with a four-field
  template, two change kinds and a validate; the form and the drag are the
  renderer's edit mode and nothing is added to the builder, the schema or
  the engine core. The drag is about 150 lines of pointer handling in one
  hook with no dependency — acceptable, because it removes the engine's
  one awkward failure (a non-rectangle) from the main path. The thing to
  watch is the slot table's size: rows × columns selects is fine for a page
  skeleton (a dozen slots), and a grid of forty slots is a sign the page
  wants a different engine.

## Decision

Build B with D: `@wirework/engine-css-grid` with `areas` as CSS's own
template strings whose tokens are the cells' ids, two change kinds,
`validate` as the picture's rules, drag and drop on the rendered grid to
draw the picture, the slot table as the second way to it and the typed
track fields (a number and a unit, or a keyword) to size it, the run page
as the demo. Not built: named areas with a mapping, a painter canvas, a
generic engine form, responsive areas, conversion from another engine.

## Phases

| Phase | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Estimate |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1     | The package: schema, operations (`empty`, `cells`, `appendCell`, `removeCell`, `applyChange`, `validate` with the rectangle rule), the view, the drag (ghost slots, move handle, resize corner, refusal, growing — `useCssGridDrag`), the edit-mode form (slot table, rows and columns, the typed track fields), styles, the conformance test and unit tests of every rule and of the drag's picture arithmetic; the host registers it and imports its stylesheet; the run page on it                         | 1½ days  |
| 2     | `css-grid.feature` and the steps (`the grid has N rows and M columns`, `I drag the cell "<id>" to the slot row R column C`, `I resize the cell "<id>" to the slot row R column C`, `the drop is refused because the slot holds "<id>"`, `I put "<id>" into the slot row R column C`, `I add a column`, `I remove row N`, `I set column N to <number> "<unit>"`, `the cell "<id>" fills the slots "<span>"`), `layout.feature`'s run-page line, docs (this file's "Built", CLAUDE.md, the README, story WW-32) | ½ day    |

## Later

- **Responsive areas**: `areas` per breakpoint (`areas`, `areasBelow:
{ "md": [...] }`) with the same tokens, rendered through media queries in
  the engine's stylesheet by a generated class per template — the one
  thing inline style cannot do. The template shape above leaves the key
  free.
- **Named areas with a mapping** (answer A) if a host wants skeletons
  shared between pages: `areas` tokens become area names and a cell gains
  `area`; `validate` gains "an area nobody fills". A superset of B.
- **A `LayoutEngine.form` slot** (answer E) if a third engine wants a
  typed form rendered by the builder rather than by its own renderer.
- **Slot selects naming the widget** (Morgan): `custom-1 · antd-label`,
  once the renderer is handed the resolved cells' widget types (it is:
  `cellById(id)?.widget`) — a label change, not a design change.
- **A picture from a react-grid-layout page.** Its placements (`x, y, w,
h` on twelve columns) ARE an areas picture, losslessly: twelve `1fr`
  columns, a row per grid row, the rectangles as tokens. The project
  decided against conversion between engines
  (doc/ADR/0003-layout-engines.md, "Choosing an engine"); this is the one
  pair where the mapping is exact and a one-off "Copy as css-grid" would
  cost twenty lines. Revisit when a page wants to move.

## Built (7 November 2026)

`@wirework/engine-css-grid`, as designed, with no change to the core, the
schema, the adapter or the builder. What the build settled that the design
left open:

- **The files.** `schema.ts` (the template, the two change kinds, `Span`,
  the units and keywords the form offers), `areas.ts` (the picture's
  arithmetic, pure: `tokensOf`, `spanOf`, `isRectangle`, `placed`,
  `withSlot`, `grownTo`, `withoutRow`, `withoutColumn`, `holderIn`,
  `pictureProblems`, `isTrackSize`, `trackParts`), `operations.ts` (the
  engine's five operations over it), `engine.ts`, `CssGridView.tsx`
  (render-only), `useCssGridView.ts` (every payload edit mode reports),
  `useCssGridDrag.ts` (the pointer logic, 120 lines, no dependency),
  `TrackInput.tsx` + `useTrackInput.ts` (the typed size field),
  `styles.css`. Unit tests: the conformance list, the operations, every
  validation sentence, the rectangle rule on an L, a T, two islands and a
  hole, a drop placed and refused, the grid grown and shrunk, the track
  sizes.
- **The "+" slots are ghosts.** Edit mode renders one more row and one
  more column of ghost slots (`data-new="row" | "column"`, a 2rem track
  each) as part of the grid, so "a drop past the edge" is a drop ON a
  slot, measurable and visible, and the drag never needs the grid's outer
  geometry. The ghosts are measured once at pointer-down (the browser laid
  them out on the real tracks); every move is a hit test on those
  rectangles. The template is untouched outside edit mode: no extra track.
- **The `areas` change carries the tracks** when the grid's size changed
  with it (`columns` padded with `1fr`, `rows` with `auto`, only when the
  template has them), so one drop is one change. A row or column removed
  drops its size the same way.
- **The slot table's "−" is disabled** with the reason in its title
  (Morgan's ask) rather than refusing on click; `withoutRow` /
  `withoutColumn` return undefined when a cell would lose its only slots,
  and the button reads that. The refusal of a drop is a `role="status"`
  line under the table (`css-grid-refusal`) plus the covered ghosts in red
  (`data-refused`), cleared by the next drag or pick.
- **The whole handle bar drags** (found the same day: built first as a
  small ✥ button, which a hand misses — a drag on the bar's label selected
  text across the page and moved nothing). The bar is the drag handle as
  react-grid-layout's is, `user-select: none`, the glyph a grip; the
  adapter's chrome buttons stop their press, so Edit and Remove never start
  a drag. An unplaced cell's bar is not draggable and says why in its title.
- **A non-rectangle is not placed.** The view sets `gridTemplateAreas`
  only while the whole picture is drawable, and gives an item `gridArea`
  only while its own area is a rectangle, so a broken picture auto-flows
  with the page's warning above it (Ren) instead of disappearing; the slot
  selects of that id are `aria-invalid` with the reason.
- **The typed field** is a number input and a unit select in one span
  (`css-grid-column`, `css-grid-row-size`, `css-grid-gap`; `-number` /
  `-unit` inside); the unit select holds the keywords too, so `auto` is a
  pick, not a type. A size the form does not edit (`minmax(...)`, written
  in JSON) shows as text with a title saying so; `validate` still reads it.
- **Row and column sizes on the root** (`data-column-sizes`,
  `data-row-sizes`) and the span on every item (`data-area`, `1-1/1-2`)
  are what the suite asserts; the slot table's selects carry `data-row` /
  `data-column` from 0 as flex-rows' bars do, the scenarios count from 1.
- **The demo.** The run page moved to css-grid as pictured (three
  columns, the third `12rem`; four rows); every scenario on it stood
  unchanged — none asserted a grid position. The cards page gained a third
  card below the two (`card-session`, the FlexLayout model nested one row
  deeper to stack it): the signed-in person as a skeleton — the name over
  two columns, the title tag in the third (`10rem`), the roles echoed
  across the row below — so the page shows four engines, and "Sign in as"
  changes all three cells. `css-grid.feature` (6
  scenarios) covers the skeleton, the drop that grows the grid, the
  refusal, the slot table with the L, the typed sizes, a card's content on
  css-grid edited as the page, the cards page's third card; the steps live
  in `layout.steps.ts` with the other engines'.
- **Not built, as decided:** responsive areas, named areas with a
  mapping, a generic engine form, conversion from another engine, the
  widget type beside the id in the slot select.

## Drag and drop, amended (12 November 2026): nothing is refused

The owner's word, after using it: a drag that refuses is a drag that "is
not implemented" — a hand that lets go over a widget expects the two to
change places, and a corner that stops at a neighbour is "hard to
understand". This section REPLACES "Overlap refuses" above, the refusal
line of "Built", and Ren's "refuse on overlap, never push" — his worry (a
layout that rearranges itself under the hand) is answered another way: the
drag shows the whole outcome BEFORE the drop, and only the widgets named in
it move.

- **A move swaps.** Let go over a slot another widget holds, the two
  exchange rectangles, whatever their sizes (`swapped`: the two tokens
  trade, so both stay rectangles). Over a free slot the widget keeps its
  size where it was grabbed when those slots are free, else with its corner
  at the slot, else it takes the one slot (`dropped`); it is never pushed
  past the grid's edge unless the pointer is on a "+" slot, which grows the
  grid as before.
- **A resize takes.** Every placed widget has FOUR EDGES and the corner to
  pull (`css-grid-resize` with `data-edge` `n`, `e`, `s`, `w`, `se`; a
  strip along each side that lights up under the pointer). The widget
  fills the rectangle its edge is pulled to (`resizedSpan`) whoever held
  those slots (`claimed`): a neighbour with a rectangle left SHRINKS; one
  left with an L or with nothing has NO SLOT. The owner's example — a row
  of three, the left widget over two thirds, the right in the last: the
  left's right edge pulled over the last third leaves the right one off
  the grid. An edge pulled back frees the slots it leaves.
- **The tray.** In edit mode a widget with no slot is not auto-placed
  after the grid: it waits in the TRAY under it (`css-grid-tray`,
  `data-count`), whole — its handle, its chrome, itself — under a warning
  that names it (`css-grid-unassigned`, `role="alert"`: "1 widget has no
  slot in the grid: custom-2. Drag it onto a slot…"), beside the page's
  own warning from `validate` (`cell "custom-2" has no slot and is placed
after the grid`). It is dragged from there like any widget: onto a free
  slot it takes that slot, onto a widget it takes that widget's rectangle
  and the other goes to the tray. A widget dropped ON the tray leaves the
  grid (`cleared`). Outside edit mode nothing changed: a cell with no slot
  flows after the grid.
- **The outcome shows first.** While a drag lasts the widget stays where
  it is, faded (`data-dragging`); an outline over the grid marks the slots
  it would fill (`css-grid-drop`, `data-area`); the widget it would swap
  with says "swaps places" and one that would lose its slot "loses its
  slot" (`data-drop="swap" | "out"`, `css-grid-fate`). A pointer in a gap
  or just outside the grid still means the nearest slot; a move let go
  elsewhere changes nothing.
- **The pure functions** are in `areas.ts` with the rest of the picture's
  arithmetic — `swapped`, `dropped`, `claimed`, `resizedSpan`, `cleared`,
  `unplaced` — each unit-tested on the shapes that bite (a swap of unequal
  sizes, a size that does not fit, the owner's row of three, a bite that
  leaves an L, a neighbour that is none of the resize's business).
  `useCssGridDrag` only measures, hit-tests and reports the picture; the
  change is still the one `areas` kind, so hosts replay it unchanged.
- **Gone:** `css-grid-refusal`, `data-refused`, `data-hover="blocked"`,
  the step `the drop is refused because the slot holds "<id>"`.
- **Steps:** `I drop the cell "<a>" onto the cell "<b>"` (a swap),
  `I pull the right|left|top|bottom edge of the cell "<id>" to the slot
row R column C`, `I drag the cell "<id>" off the grid`, `the cell "<id>"
waits off the grid`, `the grid says N widgets have no slot`, `every
widget of the grid has a slot`; `I drag the cell … to the slot …` works
  from the tray too, and `I resize the cell …` is the corner still.
  `css-grid.feature` has eight scenarios: the refusal's is now the swap,
  and the owner's row of three is the new one.
