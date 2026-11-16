# ADR-0021: Table height — a cap, a fixed height, or the room down to the bottom of the screen

- **Status:** Accepted — phases 1 and 2 built
- **Date:** 2026-11-16
- **Deciders:** the product owner

## Description

The owner asked how to give a table "a fixed height, or a height based on
the screen so it goes to the bottom but never more". The host is an Ant
Design Pro layout whose content area is exactly one screen tall: the table
should end where the screen ends and scroll inside itself, so the page
never grows a second scrollbar.

## What there is (read from the code, 16 November 2026)

- **The infinite table has one number.** `height` (pixels, default 400,
  minimum 100) is written as `max-height` on the box the rows scroll in
  (`infinite-table-scroll`). It is a CAP: with few rows the box is
  shorter. Nothing makes it exactly that tall, and nothing ties it to the
  screen — the contract takes an integer only.
- **The plain table has no height.** It is as tall as its rows; the page
  scrolls.
- **The box already follows its own size.** `useRowWindow` reads the box's
  `clientHeight` and looks again through a `ResizeObserver`, so a box that
  becomes taller renders more rows without new code. The end of the list
  is watched by an `IntersectionObserver` rooted in the box, so a box that
  grows until the end is in view asks for `more` by itself.
- **One thing does not follow.** `position-changed` (the rows in view,
  for the list-position widget) is reported on a scroll and when the row
  count changes — not when the box is resized.
- **The bar is outside the box.** The title, the table's own filters and
  the tools stand above the scroll box and add their own height; the
  filters wrap onto a second line in a narrow box, which moves the box's
  top.
- **Layout cells differ.** A gridstack, react-grid-layout or FlexLayout
  cell has a height the LAYOUT decides — a table taller than it overflows
  it. A flex-rows cell and a css-grid cell in a content-sized row are as
  tall as their content — nothing above them has a height to fill. A page
  itself has no height: the document scrolls.

## Options considered

- **A. Leave it to the host's CSS.** `min-height` on
  `.ww-infinite-table__scroll` makes the cap a fixed height today, and a
  host can write `calc(100vh - …)` there. No code. But it is not
  configuration: a page author in the builder cannot do it, it is one
  rule per table by a selector on its path, and the number after `100vh`
  is everything above and below the table, counted by hand and wrong the
  day a filter wraps.
- **B. `height` takes CSS text** (`"calc(100vh - 220px)"`). One setting,
  any unit. The same hand-counted number as A, now stored in every page;
  and free CSS text in a stored template is a thing ADR-0019 asks us not
  to add without a reason.
- **C. Fill to the bottom of the window, measured.** The table measures
  where its box starts and gives it the room from there to the bottom of
  the window, less a gap the page states. Nothing is counted by hand,
  the layout engine does not matter, and it is what was asked for. Cost:
  a measurement to keep fresh (the window resized, the bar wrapped,
  something above changed height).
- **D. Fill the layout cell.** The widget becomes a column — the bar,
  then the box taking what is left — and is as tall as its cell. Pure
  CSS, no measurement, and the right answer where the LAYOUT owns the
  height (a dashboard grid, a FlexLayout pane). But it only works where
  the cell HAS a height: in flex rows and content-sized grid rows it
  collapses to nothing, and "one screen tall" must then be built by the
  host, the page and the engine together, each passing the height down.
- **E. A fixed height only.** The smallest change: the cap becomes exact.
  It answers the first half of the ask and not the second.

## Decision

**One setting, `heightMode`, on the infinite table — and C for the
screen.** It says what `height` means:

| `heightMode` | The rows box is                                                    | `height` is         |
| ------------ | ------------------------------------------------------------------ | ------------------- |
| `max`        | as tall as its rows, at most `height` — today's behaviour, default | the cap             |
| `fixed`      | exactly `height`, whatever it holds                                | the height          |
| `fill`       | from where it starts to the bottom of the window, never more       | the least it may be |
| `fill-cell`  | what its layout cell leaves under the bar (phase 2)                | the least it may be |

Why this shape: the four are answers to one question — who decides the
height: the rows, the page author, the screen, or the layout — so they
are one setting with four values, not three booleans that can contradict
each other. `max` stays the default, so nothing stored changes meaning
and no migration step is needed (ADR-0017: an optional setting with a
default is additive). A and B are refused for the hand-counted number; D
is kept, as a second phase, for the pages where the layout owns the
height; E is the `fixed` value.

## The design

### `fixed`

`height` is written as `height` instead of `max-height`. Under the last
row of a short list the box is blank down to its end; the status line
("3 of 3") stays directly under the rows, where it is today.

### `fill`

- **The height.** `window.innerHeight − top − bottomGap`, where `top` is
  the box's top edge in the DOCUMENT (its viewport top plus the page's
  scroll), so the height does not change while the page itself is
  scrolled. Never less than `height` — on a very short window the table
  keeps a usable size and the page scrolls instead.
- **`bottomGap`** (pixels, default 16): the room to leave under the box —
  the content area's padding, and whatever the page puts under the table
  (the archive's position scale: about 72). Stated by the page, not
  guessed: what stands under a widget depends on the layout engine, and a
  wrong guess is worse than a number.
- **Exactly that tall, not "at most".** A short list still reaches the
  bottom: what is under the table (a scale, a footer) stays where it is
  when a filter leaves three rows.
- **Kept fresh.** Measured after mount and again — once per animation
  frame at most — when the window is resized, when the widget's own root
  changes size (the bar wrapped), and when the page's root does
  (something above appeared or grew). The measured height is state of the
  hook `useFillHeight`; the component stays render-only.
- **What already follows.** The row window and `more` (see "What there
  is"). One addition: `position-changed` is reported after a resize too,
  so the list-position widget's "rows in view" is right in a taller box.
- **Before it is measured** — the first render, and where there is no
  layout (a test without a browser) — the box is `height` tall.

### `fill-cell` (phase 2)

The widget's root is a flex column of the cell's height; the scroll box
takes `flex: 1` with `min-height: height`. To be checked per engine
before it is built: that the cell's wrapper passes its height to the
widget, and what a container (a card, a tab) does with it. Where the cell
has no height of its own the box is `height` tall and the builder's form
says so beside the setting.

### Facts for tests

`data-height-mode` on the widget and the box's height in pixels as
`data-box-height`; steps `the browser window is <n> pixels tall`, `the
table ends at the bottom of the window` (the box's bottom edge is the
window's less the gap, within a pixel), `the table is <n> pixels tall`.

### The plain table

Not in phase 1. It has no scroll box: giving it one means the infinite
table's sticky header and box, or antd's `scroll.y`, which needs the
header's height subtracted by hand. If the plain table needs a height it
gets the same setting in phase 3, built on the same box.

## How it is tested

- **Stories:** `FixedHeight` (three rows, a 240 px box, blank under them);
  `FillsTheWindow` in a viewport the story sets — the box ends at the
  viewport's bottom less the gap, a taller viewport makes it taller and
  renders more rows, a viewport shorter than `height` leaves it `height`.
- **Scenarios** (`table-height.feature`, on the history page switched to
  `fill`): the table ends at the bottom of the window; the window
  made taller, it still does and holds more rows in view; the filters
  wrapped onto a second line (a narrow window), it still does; the list
  asks for more when the taller box brings its end into view.
- **Unit:** the pure function `fillHeight(windowHeight, top, gap, least)`.

## Consequences

- A fourth thing can now resize the box (after a cell drag, a window
  resize in a grid, the filter row): every path already goes through the
  same `ResizeObserver`, so the cost is one more source, not a new
  mechanism.
- `fill` assumes the table is the LAST tall thing on the page. Two
  such tables one under the other both reach for the same bottom; the
  second is pushed below the screen. The builder's form says it; nothing
  enforces it.
- A page inside a host element that scrolls (not the window) and is
  shorter than the window fills too far. The ProLayout content area ends
  at the window's bottom, so the ask is covered; a `fill` against the
  nearest scrolling ancestor is the extension if a host needs it.

## Phases

1. `heightMode` with `max`, `fixed` and `fill`, `bottomGap`,
   `useFillHeight`, the position reported after a resize, the stories and
   scenarios, the history page as the demo.
2. `fill-cell`, after the per-engine check.
3. The plain table, if asked for.

## For the owner to decide

1. A short list in `fill`: the box still reaches the bottom (this
   record), or shrinks to its rows and only never passes the bottom.
2. `bottomGap` stated by the page (this record), or measured from what
   stands under the table — less to configure, wrong in a grid layout.
3. Whether phase 2 (`fill-cell`) is wanted now: it matters for dashboards
   on gridstack or FlexLayout, not for a list page.
4. Which demo page shows it: the history page (this record), or the
   archive, where the position scale under the table needs the gap.

## Built (16 November 2026): phase 1

The owner asked for it to be built, with the ARCHIVE as the demo (point
4). Points 1 and 2 are built as this record says — a short list still
reaches the bottom, the gap is stated by the page — and stay open to a
different answer; point 3 (`fill-cell`) is not built.

- **The contract** (`infinite-table`): `heightMode` (`HEIGHT_MODES`:
  `max` — the default —, `fixed`, `fill`) and `bottomGap` (pixels,
  default 16). The value is named `fill`, not `fill-window`: it is the
  word the owner used; a cell's fill, when built, is `fill-cell`.
- **The code:** `fillHeight` and `scrolledAbove` (pure, `fill-height.ts`),
  the hook `useFillHeight`, `boxStyle` from `useInfiniteTable`, and
  `data-height-mode` on the widget. The box's top is taken in the page AT
  REST — its top in the viewport plus how far every ancestor is scrolled
  — so the height is the same wherever the page stands when it is
  measured. Measured a frame after the mount, and again when the window
  is resized or the widget's root or the document's body changes size.
- **`position-changed` after a resize:** the list's scroll box is watched
  for its size too, so the scale under a taller list says how many rows
  are in view.
- **The archive page runs on FLEX ROWS now** (it was react-grid-layout):
  a grid cell there has a fixed height, and a list taller than its cell
  would have covered the scale under it. Four rows — the title, the
  table, the scale, the error line — and the table's `heightMode:
"fill"` with `bottomGap: 96`, the room the scale takes. In a window
  too short for more (the suite's 720 pixels) the list is its 320 pixels
  as before, so the archive's other scenarios did not change.

Departures from the design: the stories do not set a viewport — the
`FillsTheWindow` story checks the box against the window it runs in —,
and the scenarios are on the archive: a short window keeps the least
height, a tall one reaches the bottom with the scale in view, the list
follows a resize both ways and reports more rows in view. Not covered by
a scenario: the bar wrapping onto a second line, and `more` asked for by
a box that grew.

Tested by `table-height.feature`, the stories `FixedHeight` and
`FillsTheWindow`, and `fill-height.test.ts`.

## Built (16 November 2026): phase 2, `fill-cell`

The owner asked for it after reading how AG Grid's example page fills
the screen. Its source (`ag-grid-demos`, the performance example) does it
with CSS alone, and no script measures anything: a wrapper is a flex
column of `height: 100vh`; the toolbar is as tall as its content; a
section under it has `flex: 1 1 auto; overflow: hidden`; the grid's own
`div` in it has `flex: 1 1 auto; height: 100%`, and the grid — in its
default layout — fills the `div` it is given. A toolbar that wraps makes
the grid shorter by itself, and nothing states a gap. That is option D of
this record.

- **The widget.** `heightMode: "fill-cell"`: the widget's root is a flex
  column of `height: 100%` — the bar, then the scroll box with `flex: 1 1
0px` and `min-height: <height>`. CSS only (`styles.css`); the hook
  writes the least height and nothing else. Where the cell has no height
  the `100%` is of nothing and the box is `height` tall.
- **The check of the engines** this record asked for, read from their
  stylesheets: in every engine the item around a cell is a flex column
  and the cell takes it (`flex: 1 1 auto`). So a cell has a height
  wherever its ITEM has one: always in react-grid-layout and gridstack
  (the grid sizes the item), in a css-grid row with a size of its own —
  and in flex rows never, until now.
- **Flex rows pass a page's height down.** A page is a flex column; the
  engine's root now takes the page's height (`flex: 1 1 auto;
min-height: 0`), and a ROW whose classes make it grow (`flex-1`,
  `flex-auto`, `grow` — `growsTall` in `classes.ts`, `data-grows` on its
  rowset) takes what the other rows leave, top to bottom. Its cells are
  held to the row's height (`max-height: 100%`): a row wraps, and a
  wrapping row's line would otherwise be as tall as its tallest cell,
  whatever the row's height. On a page as tall as its content none of
  this shows, so no existing page changed.
- **The host's part** is one thing: give the page element (`.ww-page`) a
  height — in an application shell, `height: 100%` of a content area
  that is one screen tall. Then a page of flex rows with `"classes":
"flex-1"` on the table's row and `heightMode: "fill-cell"` on the
  table ends where the screen does, with whatever rows the page puts
  above and below, and no `bottomGap`.
- **The demo.** The HISTORY list fills its cell (`heightMode:
"fill-cell"`, `height: 200` as the least): a react-grid-layout cell
  ten rows tall, which it used to leave part of unused. The archive stays
  on `fill`.

`fill` or `fill-cell`: `fill-cell` where the layout owns the height — a
dashboard grid, or a host that makes its pages one screen tall; `fill`
where nothing above the table has a height and the table alone should
reach the bottom of the window.

Tested by two more scenarios of `table-height.feature` — the history
list ends where its grid cell ends; on the archive, switched to
`fill-cell` with its table's row growing and the page given the height
the window leaves, the list ends where its cell ends, is taller than its
least height, scrolls inside itself and has the scale in view under it —
and `classes.test.ts` (`growsTall`). No story: the stories' harness has
no cell of a set height.

Not built: the plain table (phase 3); a css-grid page passing its height
to `fr` rows (the grid's root does not take the page's height yet); a
`fill-cell` list inside a container (a card, a tab), not tried.
