# Row window and shared header filters — the infinite table as a virtual list, the header filters on every table

## Motivation

The infinite table (WW-21) appends rows as the user scrolls and KEEPS them
all in the DOM: a list that grew to a few thousand rows renders a few
thousand `tr`s, and every header filter, sort or `more` re-renders them.
And its header filters — a list of values to tick, a search icon for text,
sorting on a header click — were written into that one widget, so a paged
table (the runs page) could offer filtering only through a filter bar
beside it.

Two asks: (1) render only a WINDOW of rows twice the box's height, so the
infinite table works as a virtual list however many rows it holds; (2) move
the header filters where the paged table can use them too.

Designed 2026-10-24 with the tiger team. Status: **built** (see "Tested").

## The tiger team's positions

- **Morgan (product):** nothing the user sees changes — the list still
  scrolls, grows at its end and filters from its headers — it only stays
  smooth at thousands of rows. On the runs page, filtering from a header
  must behave exactly as from the bar: one choice, shown in both. Ship
  both as one story.
- **Dmitri (readability):** antd's own `virtual` Table was the first
  candidate and is rejected: it OWNS the scroll box, so the sticky header,
  the end line and the `more` observer — all of which work today — would
  be rewritten around it; it needs `scroll.x`/`scroll.y` and fixed column
  widths; its overscan is not ours. A window is forty lines of arithmetic
  over scrollTop, box height and row height. Spacer rows above and below
  the rendered ones keep the scrollbar honest — no transforms, no absolute
  positioning. Measure the row height, never assume it.
- **Alexei (architecture):** the window is a PURE function —
  `rowWindow({ scrollTop, boxHeight, rowHeight, count })` → `{ start, end,
above, below }` — in its own file with its own tests; `useRowWindow`
  only measures and listens. The header filters become ONE hook both
  tables call (`useTableHeaders`), the contracts share the ports and
  events (`tableHeaderPorts`, `tableHeaderEvents`) instead of the infinite
  table owning them, and the search box's class is the tables', not the
  infinite table's.
- **Katya (team lead):** whether a table offers its headers is a SETTING,
  `headerFilters`, on both kinds — off for the table (every page built so
  far keeps its look), on for the infinite table (that is what it is for).
  The runs page turns it on, so the demo shows the bar and the headers
  writing one `filterIn`. No new widget kind, no flag deduced from which
  ports are bound.
- **Sasha (QA):** a rendered-row count is now a PIXEL fact, so the
  scenarios stop asserting it where the window is smaller than the list:
  "the list holds N rows" reads `data-held`, "the infinite table renders
  only a window of its rows" asserts fewer rows in the DOM than held, "I
  scroll the infinite table to its top" brings the first row back before
  "the first table row is …". The runs page reuses the header steps
  unchanged. A story seeds two hundred rows and asserts the window moves
  with the scroll; the pure function has unit tests for the edges (fewer
  rows than the window, the end, an empty list).
- **Ren (contrarian):** four challenges. (1) Rows of different heights —
  the window uses the AVERAGE height of the rendered rows, so a wrapped
  cell makes the spacers a few pixels off and the scroll drifts by that
  much; accepted: the tables are `size="small"` single-line lists, and the
  drift corrects itself as the rows it measured scroll into the window.
  (2) "Twice the box" means a fast scroll shows blanks beyond one box
  height; accepted — react-window's overscan counts rows, ours counts a
  fraction of the box, which works for any row height. (3) Does `more`
  still fire? The end line stays AFTER the bottom spacer, so the end comes
  into view exactly when it did before — nothing changes. (4) Two controls
  for one filter on the runs page — the bar and the header; kept
  consistent because both are CONTROLLED from `runs.filterIn`, and the bar
  stays for the Suite filter whose values are the page's own (a header
  shows those same values as a list, since the page overrides them).
- **Vlad (fluency):** the window is one expression per number; the antd
  props of a header one function of the column and what is chosen; the
  spacer rows one `components.body.wrapper`.

Decision: build the above. Rejected: antd's `virtual` prop (see Dmitri);
a window measured in rows rather than box heights; deducing `headerFilters`
from the bound ports.

## The window

```
visible = max(1, ceil(boxHeight / rowHeight))        rows that fit the box
first   = floor(scrollTop / rowHeight)               the row at the top
start   = max(0, first - floor(visible / 2))         half a box above
end     = min(count, start + 2 * visible)            twice the box in all
start   = max(0, end - 2 * visible)                  the end fills backwards
above   = start * rowHeight,  below = (count - end) * rowHeight
```

`useRowWindow(scrollRef, count, height)` starts from the `height` setting
as the box height and the antd small row height as a guess, then measures
both after every render — the box's `clientHeight`, the rendered rows'
average height — and listens to the box's `scroll` and a `ResizeObserver`
on it. The window is state; it changes only when `start` or `end` do, so a
scroll of a few pixels re-renders nothing. The infinite table renders
`rows.slice(start, end)` and two spacer rows through antd's
`components.body.wrapper`; the end line, the status "held of total", the
`more` observer and the sticky header are as they were.

## The headers

`tableHeaderPorts` (`filterIn`, `filterLike`, `orderBy`) and
`tableHeaderEvents` (`filter-changed`, `sort-changed`) are declared once in
`table.ts` and spread into BOTH contracts; `tableSettings.headerFilters`
says whether a table offers them (`table`: false; `infinite-table`: true).
`useTableHeaders(store, emit, paths, ports, columns, cells, offered)`
returns the antd columns — with the filter and sorter props when offered —
and antd's `onChange`, which emits the whole choice in the request's own
groups. `useTable` and `useInfiniteTable` both call it.

## Packages

- `@wirework/widget-contracts`: `tableHeaderPorts`, `tableHeaderEvents`,
  `searchValuesSchema`, `columnOrderSchema` in `table.ts`; `headerFilters`
  in `tableSettings`; `infinite-table.ts` spreads them.
- `@wirework/antd-widgets`: `row-window.ts` (pure), `hooks/use-row-window.ts`,
  `hooks/use-table-headers.ts` (from the infinite table's hook), both table
  hooks and components, the search box's class, stories for the window and
  the table's headers.
- `@wirework/view-data-models-examples`: the runs table offers its headers
  and wires `filter-changed` / `sort-changed` like the bar.

## A slice of the list, and where the list stands (9 November 2026)

The product owner's ask: "a component like a pagination for an infinite
list, knowing the limit, updated as I scroll to show where I stand — 400
rows scrolled, where that is from 1 to 100% — that I can use to jump, say
to 40%. The list should not keep all the records but work in a sliced
window: fetching 200 rows, 25 in the DOM."

The window above bounds the DOM; the STORE still grew with every `more`,
and a jump to 40% of ten thousand rows would have meant loading four
thousand. Two additions, each usable alone:

- **A windowed list** — `windowed: true` on `infinite-table`. The widget
  holds a SLICE: the rows at the `rows` port begin `offset` rows into the
  list (a new optional port; the loader writes `<into>.offset`). The row
  window runs over the whole list (`total` rows, so the scrollbar is the
  whole list's), `sliceWindow` (pure, `row-window.ts`) picks the slice's
  rows that fall into it and makes the blank space stand in for everything
  else. When the window is not inside the slice — and nothing is loading,
  and the page has bound its reactions — the widget emits `window` with the
  offset of the slice that has the window in its MIDDLE (as many rows as it
  holds now); the reactions store it and call `table-view/load` with
  `window: true`, which asks for `pageSize` rows from `<into>.wanted` and
  REPLACES the rows (a slice asked for behind the end is the last one).
  `more` is never emitted. Asked once per set of rows and place, and never
  for the slice already held, so a server with fewer rows than it said is
  not asked in a loop. While a slice is on its way the rows in view are
  blank space; the list does not jump.
- **Where the list stands** — the `position` port (optional): the first row
  in view, 0-based in the whole list. With it bound the widget emits
  `position-changed` `{ position, visible }` a frame after a scroll
  (written back by default), and when something else writes the position
  it scrolls there. A position told before the rows were measured is kept:
  when the measured row height differs from the one it was scrolled by,
  the box is put at the same ROW again — until the user scrolls. Unbound,
  nothing is emitted: the history page's event log is as it was.
- **`list-position`** — the 32nd standard contract, the pagination's
  sibling for a list that scrolls: `position`, `total` and (optional)
  `visible` in; "401–425 of 2 000", a percent (how far the LAST row in view
  is into the list — `listPercent`, one rule for every implementation) and
  a scale over the positions 0 … total − visible out; `changed`
  `{ position }` when the scale is let go, written back by default. While
  the handle is dragged the words follow it and the list does not: a
  windowed list is asked for one place, not for every one passed. It knows
  no list — bound to the same paths as a table's `position` and `total` the
  two follow each other.

Weighed and left: appending both ways and trimming the far end (a growing
and shrinking array, two events, and a jump would still load everything
between); a page-sized cache of several slices (the same widget with a
loader that keeps more — later, if the blank frames while scrolling fast
are felt); the scale inside the table widget (a page may want it in
another cell, or not at all).

The demo: the ARCHIVE page — 2 000 runs, a slice of 200, the scale under
the list. `list-position.feature`, the `Windowed` story, the
`listPositionConformance` set, `row-window.test.ts` (`sliceWindow`,
`rowPosition`), `table-view.test.ts` ("with window").

## Follow-up (not built)

A row height per row (measured and remembered) for lists whose rows wrap.

## Tested

`e2e/features/infinite-table.feature` (the window: held vs rendered, back
to the top; the keyboard: the box is focusable, End asks for more and
reaches the end, Home goes back); `table-view.feature` ("A header filter on
the paged table");
`row-window.test.ts` (the pure function); the `antd-infinite-table` stories
(`Window`: two hundred rows, fewer rendered, the window follows the
scroll) and the `antd-table` stories (`HeaderFilters`).
