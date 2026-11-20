# ADR-0021: Table height — a cap, a fixed height, or the room down to the bottom of the screen

- **Status:** Accepted — phases 1 and 2 built
- **Deciders:** the product owner

## 1. Decision

One setting on the infinite table, `heightMode`, says what `height` means:
`max` (the default, a cap), `fixed` (exactly `height`), `fill` (down to
the bottom of the window less `bottomGap`, measured) and `fill-cell` (as
tall as its layout cell, by CSS alone). All four are built for the
infinite table. Not built: the plain table, a css-grid page passing its
height to `fr` rows, a `fill-cell` list inside a container.

## 2. Problem

The owner asked how to give a table "a fixed height, or a height based on
the screen so it goes to the bottom but never more". The host is an Ant
Design Pro layout whose content area is exactly one screen tall: the table
should end where the screen ends and scroll inside itself, so the page
never grows a second scrollbar.

What the decision rests on:

- The infinite table had one number: `height` (pixels, default 400,
  minimum 100), a `max-height` on the box the rows scroll in
  (`infinite-table-scroll`). A cap, tied to nothing on the screen.
- The plain table has no height: it is as tall as its rows and the page
  scrolls.
- The box already follows its own size. `useRowWindow` reads the box's
  `clientHeight` through a `ResizeObserver`, so a taller box renders more
  rows; the end of the list is watched by an `IntersectionObserver` rooted
  in the box, so a box that grows until the end is in view asks for `more`.
- The bar (title, filters, tools) stands above the scroll box and adds its
  own height; the filters wrap in a narrow box, which moves the box's top.
- Layout cells differ. A gridstack, react-grid-layout or FlexLayout cell
  has a height the layout decides. A flex-rows cell and a css-grid cell in
  a content-sized row are as tall as their content. A page itself has no
  height: the document scrolls.

## 3. Details

### One setting, four values

`heightMode` (`HEIGHT_MODES`) on the `infinite-table` contract answers one
question — who decides the height: the rows, the page author, the screen
or the layout.

| `heightMode` | The rows box is                                                   | `height` is         |
| ------------ | ----------------------------------------------------------------- | ------------------- |
| `max`        | as tall as its rows, at most `height` — the default               | the cap             |
| `fixed`      | exactly `height`, whatever it holds                               | the height          |
| `fill`       | from where it starts to the bottom of the window less `bottomGap` | the least it may be |
| `fill-cell`  | what its layout cell leaves under the bar                         | the least it may be |

`max` is the default, so nothing stored changes meaning and no migration
step is needed (ADR-0017). The widget says `data-height-mode`.

### `fixed`

`height` is written as `height` instead of `max-height`. Under the last
row of a short list the box is blank down to its end; the status line
stays directly under the rows.

### `fill`

- **The height** is `window.innerHeight − top − bottomGap`, never less
  than `height`: on a very short window the table keeps a usable size and
  the page scrolls instead. Pure functions `fillHeight` and `scrolledAbove`
  (`fill-height.ts`); the hook `useFillHeight` holds the measured height;
  `useInfiniteTable` gives `boxStyle`; the component stays render-only.
- **`top`** is the box's top in the page AT REST — its top in the viewport
  plus how far every ancestor is scrolled — so the height is the same
  wherever the page stands when it is measured.
- **`bottomGap`** (pixels, default 16) is the room to leave under the box:
  the content area's padding and whatever the page puts under the table.
  It is stated by the page, not guessed: what stands under a widget
  depends on the layout engine.
- **Exactly that tall, not "at most".** A short list still reaches the
  bottom, so what is under the table stays where it is when a filter
  leaves three rows.
- **Kept fresh.** Measured a frame after the mount, and again — once per
  animation frame at most — when the window is resized or the widget's
  root or the document's body changes size.
- **Before it is measured** (the first render, a test without a browser)
  the box is `height` tall.
- **`position-changed` is reported after a resize too**: the scroll box is
  watched for its size, so the list-position widget's "rows in view" is
  right in a taller box.

### `fill-cell`

- **The widget.** Its root is a flex column of `height: 100%`: the bar,
  then the scroll box with `flex: 1 1 0px` and `min-height: <height>`. CSS
  only (`styles.css`); the hook writes the least height and nothing else. A
  bar that wraps makes the box shorter by itself, and nothing states a gap.
  Where the cell has no height, the `100%` is of nothing and the box is
  `height` tall.
- **Where a cell has a height.** In every engine the item around a cell is
  a flex column and the cell takes it (`flex: 1 1 auto`), so a cell has a
  height wherever its ITEM has one: always in react-grid-layout and
  gridstack, in a css-grid row with a size of its own, and in flex rows
  under the next rule.
- **Flex rows pass a page's height down.** The engine's root takes the
  page's height (`flex: 1 1 auto; min-height: 0`), and a ROW whose classes
  make it grow (`flex-1`, `flex-auto`, `grow` — `growsTall` in
  `classes.ts`, `data-grows` on its rowset) takes what the other rows
  leave. Its cells are held to the row's height (`max-height: 100%`),
  because a wrapping row's line would otherwise be as tall as its tallest
  cell. On a page as tall as its content none of this shows.
- **The host's part** is one thing: give the page element (`.ww-page`) a
  height — in an application shell, `height: 100%` of a content area one
  screen tall. Then a page of flex rows with `"classes": "flex-1"` on the
  table's row and `heightMode: "fill-cell"` on the table ends where the
  screen does, with whatever rows the page puts above and below, and no
  `bottomGap`.

### Which one to use

- `fill-cell` where the layout owns the height: a dashboard grid, or a
  host that makes its pages one screen tall.
- `fill` where nothing above the table has a height and the table alone
  should reach the bottom of the window.

### Limits

- `fill` assumes the table is the LAST tall thing on the page. Two such
  tables one under the other both reach for the same bottom; the second is
  pushed below the screen. Nothing enforces it.
- `fill` measures against the window. A page inside a host element that
  scrolls and is shorter than the window fills too far. The ProLayout
  content area ends at the window's bottom, so the ask is covered; a
  `fill` against the nearest scrolling ancestor is the extension if a host
  needs it.

### The demo and how it is tested

The Infinite List page runs on flex rows — the title, the table, the
scale, the error line — and its table has `heightMode: "fill"` with
`bottomGap: 96`, the room the scale takes. In a window too short for more
the list is its least height.

Proven by `table-height.feature` (both `fill` and `fill-cell`), the
stories `FixedHeight` and `FillsTheWindow`, `fill-height.test.ts` and
`classes.test.ts` (`growsTall`). `fill-cell` has no story: the stories'
harness has no cell of a set height. Not covered by a scenario: the bar
wrapping onto a second line.

### Not built

- **The plain table** (phase 3, if asked for). It has no scroll box:
  giving it one means the infinite table's sticky header and box, or
  antd's `scroll.y`, which needs the header's height subtracted by hand. It
  would get the same setting, built on the same box.
- **A css-grid page passing its height to `fr` rows**: the grid's root
  does not take the page's height.
- **A `fill-cell` list inside a container** (a card, a tab): not tried.

### For the owner to decide

1. A short list in `fill`: the box still reaches the bottom (as it is
   now), or shrinks to its rows and only never passes the bottom.
2. `bottomGap` stated by the page (as it is now), or measured from what
   stands under the table — less to configure, wrong in a grid layout.

## 4. Options weighed

| Option                                               | Verdict                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Leave it to the host's CSS (`calc(100vh - …)`)    | Refused. No code, but not configuration: a page author cannot do it in the builder, it is one rule per table by a selector, and the number after `100vh` is counted by hand and wrong the day a filter wraps.                                      |
| B. `height` takes CSS text (`"calc(100vh - 220px)"`) | Refused. The same hand-counted number, now stored in every page; and free CSS text in a stored template is what ADR-0019 asks not to add without a reason.                                                                                         |
| C. Fill to the bottom of the window, measured        | CHOSEN as `fill`. Nothing is counted by hand and the layout engine does not matter. Cost: a measurement to keep fresh (the window resized, the bar wrapped, something above changed height).                                                       |
| D. Fill the layout cell                              | CHOSEN as `fill-cell`. Pure CSS, no measurement — AG Grid's example page fills the screen this way. It works only where the cell HAS a height; "one screen tall" is then built by the host, the page and the engine, each passing the height down. |
| E. A fixed height only                               | Kept as `fixed`. It answers the first half of the ask and not the second.                                                                                                                                                                          |

The four values are one setting, not three booleans that could contradict
each other. Every path that resizes the box already goes through the same
`ResizeObserver`, so `fill` is one more source of a resize, not a new
mechanism.
