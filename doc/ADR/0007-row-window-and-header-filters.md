# ADR-0007: Row window and shared header filters — the infinite table as a virtual list, the header filters on every table

- **Status:** Accepted — built
- **Date:** 2026-10-24
- **Deciders:** the product owner

## Description

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

Designed 2026-10-24. Status: **built** (see "Tested").

## Options considered

For the row window:

- **antd's own `virtual` Table.** The first candidate. It OWNS the scroll
  box, so the sticky header, the end line and the `more` observer — all of
  which worked already — would be rewritten around it; it needs
  `scroll.x` / `scroll.y` and fixed column widths; and its overscan is not
  ours to set.
- **A window of our own over the existing table.** About forty lines of
  arithmetic over scrollTop, the box's height and the row height, with
  spacer rows above and below the rendered ones to keep the scrollbar
  honest — no transforms, no absolute positioning. Its cost: the row
  height has to be measured, and rows of different heights make the
  spacers a few pixels off (see "Consequences").
- **How large the window is: a count of rows, or a part of the box.**
  react-window's overscan counts rows. A window measured in box heights
  works for any row height; its cost is that a fast scroll shows blank
  space beyond one box height.

For the header filters:

- **Leave them in the infinite table.** A paged table then filters only
  through a filter bar beside it — the state this record starts from.
- **One hook both tables call**, with the ports and events declared once
  and shared by both contracts.
- **How a table says it offers its headers: a setting, or deduced from
  which ports are bound.** A setting says it in the table's template and
  lets each kind have its own default; a flag deduced from the bindings
  was refused, and so was a new widget kind.

## Decision

Both asks are built as one story.

- **The window is our own**, not antd's `virtual` prop: a PURE function —
  `rowWindow({ scrollTop, boxHeight, rowHeight, count })` → `{ start, end,
above, below }` — in its own file with its own tests; `useRowWindow` only
  measures and listens. The window is twice the box's height, measured in
  box heights, not in rows. The row height is measured, never assumed.
  Spacer rows above and below the rendered ones stand in for the rest.
- **The header filters are ONE hook both tables call** (`useTableHeaders`).
  The contracts share the ports and events (`tableHeaderPorts`,
  `tableHeaderEvents`) instead of the infinite table owning them, and the
  search box's class is the tables', not the infinite table's.
- **Whether a table offers its headers is a SETTING**, `headerFilters`, on
  both kinds — off for the table (every page built so far keeps its look),
  on for the infinite table (that is what it is for). It is not deduced
  from the bound ports, and there is no new widget kind. The runs page
  turns it on, so the demo shows the bar and the headers writing one
  `filterIn`.

Nothing the user sees changes: the list still scrolls, grows at its end
and filters from its headers — it only stays smooth at thousands of rows.
On the runs page, filtering from a header behaves exactly as from the bar:
one choice, shown in both.

## Consequences

- **Rows of different heights.** The window uses the AVERAGE height of the
  rendered rows, so a wrapped cell makes the spacers a few pixels off and
  the scroll drifts by that much. Accepted: the tables are `size="small"`
  single-line lists, and the drift corrects itself as the rows it measured
  scroll into the window.
- **A fast scroll shows blanks** beyond one box height: the price of a
  window that is twice the box. Accepted.
- **`more` still fires as before.** The end line stays AFTER the bottom
  spacer, so the end comes into view exactly when it did.
- **Two controls for one filter on the runs page** — the bar and the
  header. They stay consistent because both are CONTROLLED from
  `runs.filterIn`. The bar stays for the Suite filter, whose values are
  the page's own (a header shows those same values as a list, since the
  page overrides them).
- **A rendered-row count is now a PIXEL fact**, so the scenarios stop
  asserting it where the window is smaller than the list: "the list holds
  N rows" reads `data-held`, "the infinite table renders only a window of
  its rows" asserts fewer rows in the DOM than held, and "I scroll the
  infinite table to its top" brings the first row back before "the first
  table row is …". The runs page reuses the header steps unchanged. A
  story seeds two hundred rows and asserts the window moves with the
  scroll; the pure function has unit tests for the edges (fewer rows than
  the window, the end, an empty list).

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

### Amended: the next batch is fetched ahead of time (12 November 2026)

The owner, reading the above: "I was meaning … doing fetch only [when the]
user scroll[s] to 75% of [the] rows [held]. … every fetch is by 200 … when
user see row 150 — it will do next batch 200–400 so there is no lag in
scrolling." Replacing the slice only once the window had LEFT it meant
blank rows on every plain scroll; and "appending both ways and trimming the
far end", left above, is what was meant. Built:

- The widget asks AHEAD OF TIME (`sliceRequest`, pure, `row-window.ts`).
  The `window` event carries `{ offset, edge }`: `after` once the window
  passed three quarters of the rows held and the list goes on (offset:
  where the next batch begins), `before` once it is within the first
  quarter and rows lie before the slice (offset: the first row held),
  `around` when the window is not wholly inside the slice — a jump along
  the scale, a scroll faster than the server (offset: the first row
  wanted). The rows in view are still held when `after` or `before` goes
  out, so the user scrolls into rows that are already there.
- The reaction stores the WHOLE payload — `{ set: "<into>.wanted" }` — and
  `table-view/load` with `window: true` reads it (`slicePlan`,
  `joinedSlice`): `after` asks for `pageSize` rows from there and APPENDS
  them, `before` asks for the batch that ends at the first row held and
  puts it in front, `around` asks for the slice with the wanted row in its
  middle (the last full slice near the end) and REPLACES the rows. A batch
  asked for at an edge the slice no longer has (a filter came between) is a
  slice of its own. A bare number at `wanted` is still "the slice that
  begins there".
- At most THREE batches are kept (`KEEP_BATCHES`): a fourth joining drops
  the one farthest from it, and `<into>.offset` moves. Three, not two: with
  two, the row that asked for the next batch would stand in the first
  quarter of the trimmed slice and ask for the dropped one back — for ever.
  So 2 000 rows on the server are at most 600 in the store.
- What did not change: the DOM window (twice the box's height, a few dozen
  rows — not a fixed hundred), the scrollbar over the whole list, never
  asking while loading, once per set of rows and request. A slice around
  the same row is not asked for twice in a row.

Tested by `row-window.test.ts` (`sliceRequest`), `table-view.test.ts`
("a batch after or before the rows held joins them"), the `Windowed` story
and `list-position.feature` ("The next two hundred rows are fetched ahead
of time").

## The column menu (12 November 2026)

The owner asked for the column settings menu antd's ProTable has, on both
tables. ProTable itself was declined: its menu reads ProTable's own state,
so taking it means rendering ProTable — with its own request, pagination
and toolbar — in place of tables that read ports and emit events, and the
row window would have to be rebuilt on it. Built on plain antd instead:

- `columnMenu` (a setting of both tables, ON by default — the owner's word
  the same day; a page turns it off with `"columnMenu": false`): a settings
  button above the table, "Column settings", opens a popover with every
  column as a checkbox (shown or hidden), a drag handle to reorder (antd's
  Tree, a drop between two lines, never into one), a "Columns" checkbox for
  all of them and Reset.
- The COLUMN STATE is `{ order, hidden }`, by property; both empty is "as
  configured", the one shape Reset writes. It only shows and orders what
  the table has: a column it does not name stands after the ones it does, a
  property the table lost is skipped.
- WHERE IT LIVES is configuration (the owner's word: "based on
  configuration but by default in local storage"): with the `columnState`
  port bound, the store — the host keeps it where it keeps anything, and
  `columns-changed` writes it back by default —; unbound, the browser's
  local storage under `columnStateKey`, or `wirework:columns:<rows path>`
  when that is empty. Local storage is read when the table mounts and
  written on every change; a state that changes nothing removes the key; a
  browser that refuses storage keeps the state for the visit.
- Without the menu, what local storage holds is NOT applied — nobody could
  bring a hidden column back.
- Not built: pinning a column left or right (ProTable's third control) —
  the tables do not scroll sideways, so there is nothing to pin against.

Pure functions in `column-state.ts`, the hook `useColumnState`, the
render-only `ColumnMenu`. The demo: the runs table and the history list
(their keys differ: `runs.data`, `history.data`); the archive page turns
it off. Tested by
`column-state.test.ts`, the `antd-table` stories `ColumnMenu`,
`ColumnStateKept` and `ColumnStateInTheStore`, and `table-columns.feature`.

### Amended: the button's label, required columns, pinning (15 November 2026)

The owner: "Settings icon to configure column state should have label
Columns also there should show and have functionality of required columns
so you cannot hide them and also ability to pin columns to right or left
and menu should show it accordingly."

- **The button reads "Columns"** beside its settings icon, and that is its
  accessible name ("Column settings" before): what is seen is what it is
  called.
- **A REQUIRED column** is a fact of the COLUMN (`required: true`; with the
  table-view loader the page's `columns.<id>.required`), not of the user's
  state: the menu lists it with its checkbox checked and locked and a lock
  icon; "Columns" above the list hides every column but the required ones;
  and `shownColumns` shows it whatever the state says — a state kept before
  the column became required, or written by hand, cannot hide it. It is
  moved and pinned like any other.
- **PINNING** — the "not built" above, now that the tables scroll sideways.
  The state gains `pinned`, `{ <property>: "left" | "right" }`, OPTIONAL
  and absent while nothing is pinned: a state kept before pinning existed
  parses and compares as it did, so nothing stored changes and no
  migration is needed (ADR-0017: additive). A pinned column is antd's
  `fixed` column, and — since antd lays fixed columns out sensibly only at
  the table's edges — pinned columns STAND at their edge: the ones pinned
  left first, the ones pinned right last, each group in the state's order.
  `orderedColumns` does it once, so the table, the menu, the cell selection
  and the export agree.
- **The menu shows it**: the list is in the table's order, a rule between
  the three groups, and every line ends in two toggles — to the left, to
  the right — the pressed one saying where the column stands; pressing it
  again lets the column go. A column DRAGGED beside a pinned one is pinned
  with it, and one dragged out of the pinned is let go (`droppedColumn`):
  otherwise a drop would not stay where it was made.
- Weighed and left out: a pin a PAGE configures (`pin` on the column) —
  the user's own pin would then need a third value, "not pinned", to undo
  it; nobody asked for it. Captions over the groups ("Pinned left") inside
  antd's Tree, where a caption would be a node that can be dropped on.

**Amended again the same day**, on the owner's word after seeing it: "if
it is required column in menu should have tag like label 'always' with
icon in the tag. Also instead of icons for pinning I want three dots as
actions for every column with menu on hover with menu items Pin Left and
Pin right. If columns that are pinned they should be visually split with
other columns. So there be three sections in Columns Menu. PINNED LEFT,
COLUMNS and PINNED RIGHT. PINNED LEFT AND RIGHT should appear only if
there are pinned columns" — and: "when column is pinned it should have
following action: Unpin and Pin with other direction."

- The lock icon is a TAG, "Always", with the lock in it.
- The two toggles are THREE DOTS at the end of every line, opening the
  column's actions on hover (and on a press, where nothing hovers): "Pin
  left" and "Pin right" for a column that is not pinned; for a pinned one
  "Unpin" and the pin to the OTHER edge. The menu a choice was made in does
  not stay open over the line as it moves to its new place.
- The SECTIONS and their captions are built after all — "weighed and left
  out" below no longer holds for them: a caption is a line of antd's Tree
  that cannot be dragged, and a drop UNDER it is the head of its section
  (antd names the place above a section's first column "after the line
  before it", which is the caption — refusing it made the top of the list
  unreachable, as the first e2e run showed); a drop above a caption is no
  place. COLUMNS is always there; the pinned sections only while they hold
  a column.

The archive's `#` is required. The archive has the menu since the owner
turned it on (`"columnMenu": true`), so the two scenarios that asserted it
has none were stale and are replaced: `table-columns.feature` gains the
required and pinning scenarios there, `table-toolbar.feature`'s last one
asserts only that the archive lists no tools; a table with the setting off
is the `NoToolbar` story. Tested by `column-state.test.ts` (four more),
the story `RequiredAndPinnedColumns`, and three scenarios.

## A date column is filtered by a period (12 November 2026)

The owner: "date columns by default should support in header filter
period" — a start and an end date behind the header's filter icon.

- A third column filter kind, `{ kind: "dates" }`, beside `values` and
  `text`. Its header shows a CALENDAR icon; the dropdown (`HeaderPeriod`)
  holds two date fields, "Start date" and "End date", with Filter and
  Reset. Two fields, not antd's RangePicker: a RangePicker does not hand
  over a period with one end empty until it is left, and a click on Filter
  came first — either end may stay open here.
- The period is `[from, to]` as the date widgets' text (`YYYY-MM-DD`, ""
  for an open end) at a new header port, `filterBetween`
  (`{ <property>: [from, to] }`), and travels in the same `filter-changed`
  beside `filterIn` and `filterLike` — the request's own three groups. A
  page stores it like the other two (`{ set: "<into>.filterBetween", from:
"filterBetween" }`); the table-view loader already sent
  `<into>.filterBetween`.
- BY DEFAULT: the table-view loader gives the filter to every column whose
  server `type` is a date (`date…` or `timestamp…`, `isDateType`) — the
  server need not call it filterable, only not say `isFilterable: false`;
  `enableFilter: false` and the page's `filters: { <id>: false }` drop it,
  and the page's own `values` make it a list instead. The server's
  `filterValues` do not: a list of every timestamp is no filter.
- The filter row shows a date column's period too, as the same two fields
  side by side (a group named "Filter <title>"); each applies as it is
  picked.
- A period needs somewhere to live: while the table's `filterBetween` port
  is NOT bound, a date column has no filter in its header or in the filter
  row — the loader's default would otherwise put a calendar on every date
  column of a page that never stores the choice.

The demo: the archive page shows the server's hidden "Started" column and
stores the period. Tested by `table-periods.feature`, the `antd-table`
story `HeaderPeriod`, `table-view.test.ts` ("filters a date column by a
period by default").

## The toolbar, its items registered by name (12 November 2026)

The owner asked for ProTable's toolbar on both tables, "but elements
registered as widgets. Same as custom cell rendering registration but for
toolbar" — with Reset filters and a refresher in it, the refresher
replaceable by a host's own.

- `toolbar` (a setting of both tables, empty by default): a list of
  `{ name, params? }`, shown in that order above the table, at its right
  edge, before the column menu's button — one row (`TableToolbar`, a
  `role="toolbar"` named "Table tools"). With no items and the column menu
  off there is no row.
- An item is a COMPONENT REGISTERED BY NAME, as a custom cell's renderer
  is: `createAntdTable({ toolbar })`, `createAntdInfiniteTable({ toolbar })`
  or `createAntdWidgets({ tableToolbar })`. Unlike a cell it acts, so it is
  handed what a table's tool may show and do (`TableToolbarItemProps`):
  `params`, `loading`, `filtered`, `refresh()` and `resetFilters()`. It gets
  no store and no emit — every effect is still an event of the table and a
  reaction of the page.
- Two items are STANDARD (`STANDARD_TOOLBAR`): `reset-filters` — a button
  that emits `filter-changed` with nothing chosen, disabled while nothing
  is filtered by (whichever wrote the choice: a header, the filter row, a
  filter bar on the same path) — and `refresh` — a button, "Reload", that
  emits the table's new event `refresh` and spins while the rows load. The
  page's reaction asks for the rows: `{ call: "table-view/load", with:
{ into } }`.
- The host's items are laid OVER the standard ones by name: one registered
  as `refresh` replaces the standard refresher on every table, a new name
  adds a tool. A name nothing is registered under is left out, with one
  console warning — the list is read at runtime, like a column's cell.
- Not a widget of the page's registry: a toolbar item has no template, no
  ports and no cell of its own — it is a part of the table, configured in
  the table's template. Weighed: a toolbar as a container layout (any
  widget inside, the page's refresher too) — heavier, and its widgets could
  not reach the table's own state (`filtered`) without ports for it.
- `refresh` does nothing without a reaction, which is why the list is
  empty by default: a button that does nothing is worse than none.

The demo: the history list has both items, the runs table "Reset filters"
(it has the refresher widget). Tested by the `antd-table` stories
`Toolbar`, `NoToolbar` and `CustomToolbarItems`, and `table-toolbar.feature`.

## Sideways scroll from the columns' widths (12 November 2026)

The owner: "automatic horizontal scroll … shown when minimum table width
scroll.x is wider than the table card. Otherwise the table stretches to
fill the card. Formula is sum of width of every column. By default every
column is 110 until it is overridden in configuration. Id like columns 88"
— eight plain columns give 880 px, and the scrollbar appears in a card
narrower than that.

- A column has a WIDTH in pixels: its own `width` (a new optional field of
  a column; the table-view loader takes it from the page's
  `columns.<id>.width`), else 88 for an ID column, else 110
  (`COLUMN_WIDTH`, `columnWidth`).
- An ID column (`isIdColumn`) is the rows' key (`rowKey`) or a property
  named like an identity: `id`, `run.id`, `user_id`, `ownerId`.
- The least width the table needs is the SUM over the columns it shows
  (`tableWidth`; a column hidden in the column menu does not count). Both
  antd tables hand it to antd as `scroll.x` and each column its width: in a
  narrower box the table keeps that width and scrolls sideways, in a wider
  one it fills the box, the columns sharing what is left. The widget says
  the sum as `data-min-width`.
- The rule lives in the contracts package, pure, so another implementation
  of the `table` contract scrolls at the same width.

Tested by `table-width.test.ts`, the `antd-table` stories `SidewaysScroll`,
`FillsAWiderBox` and `ColumnWidths`, and the `antd-infinite-table` story
`SidewaysScroll`.

## A column's values are a Select that filters as it is picked (12 November 2026)

The owner: "for enumeration filter I want to use antd Select in multiple
mode with a clear button and search by label. It should have no tag limit
so tags wrap onto more lines. It should have Reset and Done button. Done
should just close filter. Should invoke change on change so no need Apply
button."

- A column whose filter is a list of VALUES no longer opens antd's own
  list of checkboxes with OK and Reset, but `HeaderValues`
  (`useHeaderValues`): a Select in `multiple` mode — `allowClear`, searched
  by label, no tag limit in a box 16 rem wide so the chosen values wrap —
  over Reset and Done. The header's filter icon is antd's own, as before.
- EVERY PICK FILTERS AT ONCE: the keys are set and confirmed with the box
  left open, so each pick, each removed tag and the clear button emit
  `filter-changed` — one request each on a page that loads on it. Reset
  filters by nothing and leaves the box open; Done only closes it.
- For tests the box is `data-testid="header-values"`, a group named
  "Values of <title>", with the labels on offer as `data-options` and what
  is chosen as `data-values`.
- The filter ROW's control for values is unchanged (a Select already, one
  line of tags that fits the column).

Tested by the `antd-table` story `HeaderFilters` (search by label, two
tags, Reset, Done) and the scenarios that use the header steps
(`infinite-table.feature`, `table-view.feature`, `table-toolbar.feature`).

## Review of the above (12 November 2026)

A review of the column menu, the period filter, the toolbar, the
ahead-of-time window and the sideways scroll before they were committed.
What it found and what was changed:

- **A batch fetched ahead of time is not "loading".** The loader raised
  `<into>.loading` for every call, and a table lays its spinner over the
  rows while it is true — a blink every hundred rows. A batch that JOINS
  the slice no longer raises it; a slice that replaces the rows still does.
- **A header speaks only for the columns it shows a filter of.** antd
  reports the filters of the shown columns, and the whole choice was
  rebuilt from that: a filter on a column hidden in the column menu, a
  filter bar's own filter or a date-range widget on the same path was
  dropped by the next header choice. The choice now starts from what is
  chosen and replaces only those columns' entries.
- **Too few rows for the window never fetch ahead** (`AHEAD_WINDOWS`): with
  fewer rows held than six windows — a small batch in a tall box — the
  "after" and "before" marks are both passed, each answer allows the next
  request, and the list would fetch for ever. Such a list waits until its
  window leaves the rows held, as before the amendment.
- **Nothing is fetched ahead for rows a list only passes** on its way to a
  position it was told to stand at (before its rows are measured).
- **A period needs its port** (above), and the filter row's period is two
  fields: antd's range picker loses a period with one end.
- **Looked at in a browser:** the sideways scroll on the runs and history
  pages at 440 px — the infinite list's sticky header moves with its rows
  (every header cell stands over its column), a sticky scrollbar shows at
  the box's bottom. At the least width a 110 px Name column WRAPS ("E2E Run
  # / 98765"), so those rows are taller; wider, nothing wraps.
- Cleaned: the redundant `"columnMenu": true` in the demo, the hooks'
  unused default arguments, the guideline's console rule (it now names the
  two runtime-name warnings), the dropdown's class name.
- Accepted as it is: a slice that failed to load is not asked for again
  until the view moves (a failing server is not hammered; the page shows
  `<into>.error`); "id-like" by name (`isIdColumn`) — the owner's call.

Tested by `table-view.test.ts` (no `loading` for a joining batch),
`row-window.test.ts` (the regression), the stories
`FiltersOfHiddenColumnsStay`, `PeriodNeedsItsPort` and `FilterRowPeriod`,
and `table-width.feature`.

## A list whose end is not known yet (12 November 2026, designed — built 14 November 2026)

The owner: "I need [the list position] also work when total is unknown and
work with only how many rows were fetched. So if the end was found, it
should work regular; but if end is still not found user should be able to
scroll ahead and back and scroll position should be updated dynamically
based on how many rows we know exist."

Today everything hangs on `total`: the infinite table asks for `more` only
while `rows.length < total`, a windowed list spans its scrollbar over
`total`, and `list-position` draws its scale over `0 … total − visible`. A
server that does not count (counting ten million rows costs more than
reading two hundred) leaves all three with nothing: no `more`, no scrollbar
beyond the first batch, a scale of zero length.

### The answers weighed

- **A. The loader invents a total** — writes the rows fetched so far as
  `<into>.total`. No contract changes. But the list then says "200 of 200",
  the percent reaches 100 and falls back, and the table — told it holds
  everything — never asks for more. A lie every reader must be taught.
- **B. A second number** — `known` beside `total`: `list-position` and the
  table read `known` while `total` is absent. Honest names, but two ports
  that mean "how long is the list" on three widgets, and every binding
  (`pagination` too) has to choose.
- **C. One number and one flag** — `total` stays "how many rows the list is
  known to have", and a new optional boolean port, `hasMore`, says the list
  GOES ON past it. False or unbound: `total` is the whole list, as today.
- **D. Estimate the total** from the batches so far (double it, or a
  server's guess). The scale would look finished; the handle would jump
  when the guess is corrected, and a jump to "80%" could land past the end.
- **E. No scale until the end is found** — show "425 rows so far" only.
  Simple, and it refuses exactly what was asked: scrolling back and ahead
  along what is known.

### Decision: C — `total` is the rows known, `hasMore` says the list goes on

Why C. A total that is "at least" is still one fact with a qualifier, not
two facts. B was weighed against it for the worry that a total which is
not a total will be misread; C was kept because every reader of `total`
already treats it as an upper edge of what it can show, which is exactly
what it still is — the one consumer that must not trust it, the "ask for
more" test, is the one being changed. C is also the least code: no new
widget, no new event, no estimate to correct. The list-position hook gains
one port read and one flag; the table one condition in `sliceRequest` and
one in `more` ("more to ask for" was `held < total`, it becomes `held <
total || hasMore`).

The rules the design rests on:

- **The user is never told a number that is not true.** "401–425 of 800+"
  is true; "of 800" is not, and neither is "53%". While the end is unknown
  the widget shows the rows in view and the count so far with a plus, and
  NO percent — a percent that goes backwards as the list grows reads as a
  bug. `listPercent` stays as it is and is simply not shown while
  `hasMore`. The moment the end is found the list is the one it always
  was.
- **`hasMore` is the server's knowledge, so the LOADER writes it**, beside
  `total`. No widget deduces it from which ports are bound or from a batch
  size it does not know.
- **Nothing changes for a page that binds no `hasMore`.** One new port on
  two contracts, one new place under `<into>`, no new setting. The view
  declaration says whether to count at all (`countRows: false` sends the
  request's `totalRecords: false`); a server that sends no `totalRecords`
  anyway gets the same treatment without it.
- **The handle may move by itself.** The user drags to the end, more rows
  arrive, the handle slides back to 75% — accepted and intended: it is how
  they scroll ahead. But a drag IN PROGRESS must not be yanked: the
  scale's length is held while the handle is down.
- **"Known" does not shrink.** A windowed list drops far batches; the
  loader keeps the high-water mark, so the user scrolls back over rows
  that are no longer held and they are fetched again (`before` / `around`,
  as before).
- **The facts go on the DOM so the scenarios read them:** `data-total` and
  `data-open` on the position widget and the table. The steps:
  `the list stands at row 1 of at least 200`, `the list's end is not
known`, `the list's end is known`. The fake archive server gets an
  uncounted address with a length that is an exact multiple of the batch —
  the hard case: a full last batch, so the end is found only by the empty
  one after it.

**The loader** (`table-view/load`), when the answer carries no
`totalRecords` (the server does not count, or the view said
`countRows: false`):

- `<into>.total` = the HIGH-WATER MARK of rows known to exist: `offset +
rows.length` of this answer, or the mark already there if that is larger.
  A load that replaces from the start (the first one, a filter, a sort, a
  refresh) starts the mark over; `more` and `window` only raise it.
- `<into>.hasMore` = `true` while the last batch at the END of what is
  known came back full (`rows.length === limit`); `false` once a batch
  there comes back short or empty — THE END IS FOUND, and `total` is exact
  from then on. A full last batch is found out by the empty one after it:
  the rows held stay the very same array, only `hasMore` flips.
- With a `totalRecords` in the answer nothing changes and `hasMore` is
  written `false`.

**`infinite-table`** — a new optional input port `hasMore` (boolean,
default false), bound to `<into>.hasMore`:

- Not windowed: `more` is emitted at the end while `held < total ||
hasMore` (still once per set of rows, never while loading). The status
  line reads "200 rows, more to load" instead of "200 of 200".
- Windowed: the scrollbar spans `total` — the rows known — and grows as
  batches arrive; `sliceRequest` asks for the batch `after` while `end <
total || hasMore`. The user cannot scroll past what is known; reaching
  three quarters of it fetches the next batch, which lengthens the list
  under them. Scrolling back is unchanged.
- `position-changed` is unchanged: a position is a row number, true
  whatever the total.

**`list-position`** — the same optional port `hasMore`:

- The scale runs over `0 … total − visible` as today; `total` is now the
  rows known, so the handle is where the view stands AMONG THE ROWS KNOWN
  and moves by itself when more become known. While the handle is held
  down the scale keeps the length it had (a drag in progress is not
  yanked).
- The range reads "401–425 of 800+" while `hasMore`; the percent is not
  shown (`showPercent` is ignored until the end is found). Exposed as
  `data-open="true"`; the slider's `aria-valuetext` says "row 401 of at
  least 800".
- Letting the handle go at the end of the scale writes the last known
  position; the list scrolls there, asks for the next batch, the scale
  grows and the handle settles back — "scroll ahead". No new event.
- With `hasMore` false or unbound: exactly today's widget.

**Not changed:** `pagination` (a paged table without a count is another
story — it needs "next" without page numbers), the filter and sort events,
the three-batch limit of a windowed list.

### Phases

1. The contracts (`hasMore` on `infinite-table` and `list-position`), the
   loader's mark and flag with `countRows`, the two widgets, unit tests
   (the loader: full, short, empty and exactly-full last batches, the mark
   surviving a dropped batch, a filter starting it over; `sliceRequest`
   with `hasMore`), stories (`EndUnknown` on both widgets: the scale grows,
   the end is found, a drag in progress keeps its length).
2. The demo: an uncounted address on the fake archive server and a page
   (or a switch on the archive page — the owner's call) that uses it;
   `list-position.feature` scenarios for scrolling ahead until the end is
   found, scrolling back over dropped rows, and a filter starting over.

### Built (14 November 2026)

Both phases, on the owner's word: "make for archive page. Amount of rows
unknown until it reaches 2000". The ARCHIVE page itself is the uncounted
list — its declaration says `countRows: false`, the request goes out with
`totalRecords: false`, and the fake server, which always honoured that
flag, answers with rows only; no second address and no switch. Two
thousand is ten full batches, the hard case named above: the end is found
by the eleventh, empty one.

What the build does differently from the text above:

- **The mark starts over by the FILTERS, not only by the kind of load.**
  The design said "a load that is not `more` or `window` starts the mark
  over" — but the archive's own filter and sort reactions ARE `window`
  loads (they ask for the slice at row 0), and so is a jump to the top. The
  loader therefore remembers, per store and view, the filters the list was
  being learned under: other filters are another list and start over; the
  same filters keep the mark and a found end, whatever the load. A plain
  load (the first one, a refresh) still starts over, as designed. A sort
  does not: it does not change how many rows there are.
- **Once the end is found it stays found** under those filters: a later
  full batch from the middle of the list (a jump back) does not turn
  `hasMore` on again.
- **`hasMore: false` is written for a counted answer only where the store
  already holds a `hasMore`** — the runs and history pages' state gains no
  new key.
- **The status line of a WINDOWED list** (the design named only the plain
  one): "800+ rows" while the end is unknown, "2000 rows" after. The plain
  list reads "200 rows, more to load".
- **The scale's tooltip** says "row 401 of at least 800" while a percent
  would be a guess — the same words as the handle's `aria-valuetext`.

Steps: `the list stands at row <n> of at least <known>`, `the list's end
is not known` / `is known` (`data-open` on the table and the scale, and
the percent absent or present), `I scroll the infinite table until the
list's end is found`. Every archive scenario that read "2000 rows" on
opening reads "200+ rows" (`table-periods.feature`); the jump along the
scale is tested after the end is found, and a click at the scale's end
before that is the "scroll ahead" scenario.

Not built: the plain (not windowed) list's `more` with `hasMore` has unit
coverage in the loader and the one changed condition in the hook, but no
demo page and no scenario; `pagination` is unchanged, as decided.

## Cells are selected and copied (13 November 2026)

The owner asked whether several cells could be selected and
their values copied, then chose: a rectangle of cells as AG Grid selects
them — a click selects a cell, shown selected with a small square at its
bottom-right corner "so you know it's draggable" —, and a right-click menu
with Copy, Copy with Headers and Export current data as CSV; a tag copies
its text, a link cell its link.

**What was found.** antd's Table selects whole rows only, so the
rectangle is our own code — pointer events and numbers, as the layout
engines' drag is. The browser's own text selection cannot take a column
rectangle, copies a custom cell's button text with its value, and loses the
rows a virtual list takes out of the DOM. Every cell already has a text
(`cellText`) and a link cell an address (`cellHref`), so what is copied
comes from the DATA, never from the screen. A third-party grid was not
considered further: range selection is a paid tier of the ones known, and
it would replace both tables.

**What was built**, on both tables, behind `cellSelection` (ON by default;
`exportName` names the file):

- **The range is numbers.** `{ anchor, focus }` — the cell it started at
  and the cell it reaches, rows counted through the WHOLE list (a windowed
  list's `offset` added), columns through the ones shown. Rows leaving the
  DOM with the row window, or a slice moving on, take nothing with them.
  `cell-range.ts` is the arithmetic, pure: `rectOf`, `edgesOf`,
  `withinColumns` (a column hidden in the column menu cuts the rectangle),
  `copyValue`, `rangeText`, `csvText`, `exportFile`.
- **One handler on the root.** Every body cell says where it is
  (`data-at-row`, `data-at-column`, through antd's `onCell`), so the
  table's root hears the press, reads the cell under the pointer
  (`elementFromPoint` while dragging) and sets the range
  (`use-cell-selection.ts`). A press selects a cell, a drag the rectangle,
  Shift+click reaches from where the selection started, a press within ten
  pixels of the last cell's bottom-right corner drags that corner (the
  opposite corner stays). A link or a button inside a cell keeps its
  press. A row click still emits `row-selected`.
- **What shows.** A selected cell carries `data-selected`, the sides of
  the rectangle it lies on (`data-edge="top left"` — each cell draws its
  part of the outline as inset shadows), `data-anchor` on the cell it
  started at (left clear, as a spreadsheet's active cell) and
  `data-handle` on the last one — the small square, a pseudo-element of
  the stylesheet. The root says the rectangle as `data-selected="1-2/2-5"`
  (rowStart-columnStart/rowEnd-columnEnd, from 1). Text in body cells is
  not selectable while the setting is on.
- **The menu** (`cell-menu.tsx`): a right click on a body cell opens an
  antd Dropdown at the pointer — hung on a one-pixel mark portalled to the
  body, because a grid engine's transformed cell would make "fixed" mean
  "within that cell". A right click outside the selection selects that
  cell first. Closing it gives the focus back to the row it was opened on,
  so the table hears the keys again. Outside body cells — the headers, the
  toolbar — a right click is the browser's.
- **Copy** puts the rectangle on the clipboard as a line per row, the
  cells tab-separated — what a spreadsheet pastes as cells; a tab or a
  line break inside a value becomes a space — with the columns' titles
  first for "Copy with headers", and emits `cells-copied` `{ text, rows,
columns, headers }`. Ctrl/Cmd+C does the same (unless the user selected
  text by hand, or is typing in a field); Escape lets the selection go. A
  link cell copies its WHOLE address (the page's origin before an
  application path); a link that leads nowhere, its text.
- **Export as CSV** saves EVERY row the table HOLDS — "current data": not
  the selection, and not rows the server has and the table does not —, in
  the columns shown, titles first, RFC 4180 quoting, a UTF-8 mark first so
  a spreadsheet reads it right, as `<exportName>.csv` (or a name made from
  the rows path: `history.data` → `history-data.csv`), and emits
  `rows-exported` `{ file, rows, columns }`.
- **The browser's part** is in `browser-io.ts`: the async clipboard, with
  the old field-and-`execCommand` way where it is absent (a page not on
  https), and the file through a Blob link.

**Known limits.** A windowed list copies only the rows it holds: a
rectangle that reaches past the slice copies the part held. Dragging does
not scroll the list by itself — Shift+click after scrolling reaches far.
No arrow keys, no several rectangles at once, no fill. The export does not
guard against a spreadsheet reading a value that begins with `=` as a
formula.

**Tested:** `cell-range.test.ts`; the `CellSelection` and
`CellSelectionOff` stories; `table-copy.feature` (a click, a real drag, the
menu and Copy with headers, Shift+click, the corner dragged, Ctrl/Cmd+C,
Escape, the CSV file downloaded and read, the plain table). The scenarios
read what THEIR page wrote to the clipboard (`the table copied …`), not the
clipboard itself: it is the machine's, one for every worker of a run, and a
scenario read back what another had copied.

**The menu does not close on a scroll.** antd's context-menu trigger closes
its popup on any scroll of the window; a page that settles under the
pointer took the menu away before a choice was made. The dropdown uses the
click trigger — all it adds is closing on a press elsewhere.

## Scrolling a long list, measured (13 November 2026)

The owner reported the windowed list scrolling badly — "little stops, every
50–100 rows" — after the cell selection was built. Measured in Edge with a
real mouse wheel on the Archive page (CPU profile, long animation frames,
the browser's own script / layout / style totals), the selection was not
the cause: with it off the numbers were the same. Three things were, and
each was fixed:

- **The playground's State panel** (the demo's, not a package). The list
  writes where it stands on every frame of a scroll; the panel printed the
  store — every row the list holds, up to 600 since batches join — into a
  textarea on each of those writes, and the browser laid that text out
  inside the scroll's frames. Throttled to four prints a second it became
  exactly the reported symptom: a stop every quarter of a second. The
  panel now prints at once after a change when the store was quiet and not
  again until the store has been quiet for 250 ms (`usePrintedSnapshot`;
  `data-behind` on the editor while a change waits, which the e2e edit
  step waits out). Layout time over a 250-tick scroll: 580 ms → 62 ms.
- **The table rendered again for its own position.** It read the
  `position` port as state, so the number it had just emitted rendered the
  whole table once more per row scrolled. The port is now LISTENED to
  (`store.subscribe` in an effect): only a position written by something
  else scrolls the box, and nothing renders.
- **The window moved at every row.** `rowWindow` gave a new window for
  each row scrolled past, and antd's table renders every row when its data
  shifts. A window now STAYS while it serves (`windowServes`: the rows in
  view inside it with a row to spare) and, when it is made again, keeps
  its spare rows AHEAD of the view (`heading`: one row behind going down,
  the rest below; the mirror going up; half a box above when the way is
  not known — a jump). Same size, twice the box; the table renders about
  every box of scrolling instead of every row.

Script time for the same scroll: 4.4 s → 2.7 s on the dev server, 1.75 s →
under 1 s in a production build (before the State panel's last change,
which a production host does not have). What is left in development is
React's own development-mode cost of rendering antd's table, twice under
StrictMode.

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
