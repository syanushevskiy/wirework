# ADR-0007: Row window and shared header filters — the infinite table as a virtual list, the header filters on every table

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

The infinite table renders a WINDOW of rows twice its box's height — our own
pure `rowWindow` with spacer rows, not antd's `virtual` table. Header filters
and sorting are ONE hook both tables call. On top of these: a WINDOWED list
that holds a slice of the server's list, `list-position`, a list whose end
is not known (`hasMore`), the column menu, periods, the toolbar, a title and
bar filters, sideways scroll, cell copy and CSV. All built. Not built: a row
height per row.

## 2. Problem

The infinite table appends rows as the user scrolls. Kept all in the DOM, a
list of a few thousand rows is a few thousand `tr`s, and every filter, sort
or `more` renders them again. Its header filters — values to tick, a search
for text, a sort on a header click — were its own, so a paged table could
filter only through a filter bar beside it.

Two asks started this record: render only a window of rows, so the list
works however many rows it holds; and put the header filters where the paged
table can use them too.

The rest followed from using the tables on long server lists: the STORE must
not grow with the list either, the user wants to see and set where the list
stands, a server may not count its rows, and the tables need what Ant
Design's ProTable offers around a table — a column menu, a toolbar, a title,
filters — without becoming ProTable.

## 3. Details

### The row window

`rowWindow({ scrollTop, boxHeight, rowHeight, count })` → `{ start, end,
above, below }` is a PURE function in `row-window.ts`. The window is twice
the box's height, measured in box heights, not rows.

```
visible = max(1, ceil(boxHeight / rowHeight))        rows that fit the box
first   = floor(scrollTop / rowHeight)               the row at the top
start   = max(0, first - floor(visible / 2))         half a box above
end     = min(count, start + 2 * visible)            twice the box in all
start   = max(0, end - 2 * visible)                  the end fills backwards
above   = start * rowHeight,  below = (count - end) * rowHeight
```

- `useRowWindow(scrollRef, count, height)` only measures and listens. It
  starts from the `height` setting and antd's small row height as a guess,
  then measures the box's `clientHeight` and the rendered rows' average
  height after every render. It listens to the box's `scroll` and a
  `ResizeObserver`.
- A window STAYS while it serves (`windowServes`: the rows in view are
  inside it with a row to spare). When it is made again it keeps its spare
  rows AHEAD of the view (`heading`): one row behind when going down, the
  mirror going up, half a box above when the way is not known (a jump). So
  the table renders about once per box of scrolling, not once per row.
- The table renders `rows.slice(start, end)` and two spacer rows through
  antd's `components.body.wrapper`. The end line stays AFTER the bottom
  spacer, so `more` fires when the end comes into view. The scroll box is
  focusable and scrolls by keyboard.
- The widget says how many rows it holds as `data-held`; the DOM holds
  fewer.

### The header filters

- `tableHeaderPorts` (`filterIn`, `filterLike`, `filterBetween`, `orderBy`)
  and `tableHeaderEvents` (`filter-changed`, `sort-changed`) are declared
  once in `table.ts` and spread into BOTH contracts.
- `headerFilters` is a SETTING on both kinds: `false` by default for
  `table`, `true` for `infinite-table`. It is not deduced from the bound
  ports, and there is no new widget kind.
- `useTableHeaders(store, emit, paths, ports, columns, cells, offered)`
  returns the antd columns — with filter and sorter props when offered — and
  antd's `onChange`, which emits the whole choice in the request's own
  groups. `useTable` and `useInfiniteTable` both call it.
- A header speaks only for the columns it shows a filter of. The choice
  starts from what is chosen and replaces only those columns' entries, so a
  filter on a hidden column, a filter bar's own filter or a `date-range`
  widget on the same path is kept.
- A column's filter has a kind: `values`, `text` (a search icon) or `dates`.
- Where a bar and a header filter the same property, both are CONTROLLED
  from the one `filterIn`: one choice, shown in both.

### A column's values are a Select that filters as it is picked

A `values` filter opens `HeaderValues` (`useHeaderValues`): a Select in
`multiple` mode — `allowClear`, searched by label, no tag limit in a box
16 rem wide so the chosen values wrap — over Reset and Done.

- EVERY PICK FILTERS AT ONCE: each pick, each removed tag and the clear
  button emit `filter-changed` with the box left open — one request each on
  a page that loads on it.
- Reset filters by nothing and leaves the box open. Done only closes it.
- The box is `data-testid="header-values"`, a group named "Values of
  <title>", with `data-options` and `data-values`.
- The filter row's control for values is a Select of one line of tags.

### A date column is filtered by a period

- `{ kind: "dates" }`: the header shows a CALENDAR icon; the dropdown
  (`HeaderPeriod`) holds two fields, "Start date" and "End date", with
  Filter and Reset. Either end may stay open.
- The period is `{ <property>: [from, to] }` ("" = an open end) at the
  `filterBetween` port. It travels in `filter-changed` beside `filterIn` and
  `filterLike`; a page stores it like the other two
  (`{ set: "<into>.filterBetween", from: "filterBetween" }`) and the
  table-view loader sends `<into>.filterBetween`.
- EACH END IS A DATE AND A TIME by default: shown and typed as
  `YYYY-MM-DD HH:mm`, kept as ISO with the offset
  (`2026-11-03T23:59:00+01:00`). An end is typed WHOLE; a day alone is not
  taken. The end is the moment shown, so "to 2026-10-10 00:00" does not
  include that day's rows.
- `time: false` gives whole days kept as `YYYY-MM-DD`: on a column's
  `filter`, on a bar filter, and with the table-view loader as the page's
  `filters.<id>: { "time": false }`.
- The two shapes may meet in one `filterBetween` (a `date-range` widget
  writes days). What either means is the server's to decide.
- BY DEFAULT the table-view loader gives the filter to every column whose
  server `type` is a date (`date…` or `timestamp…`, `isDateType`).
  `isFilterable: false`, `enableFilter: false` and the page's
  `filters: { <id>: false }` drop it; the page's own `values` make it a
  list. The server's `filterValues` do not: a list of every timestamp is no
  filter.
- A period needs somewhere to live: while `filterBetween` is NOT bound, a
  date column has no filter in its header or in the filter row.
- The filter row shows the same two fields side by side (a group named
  "Filter <title>"); each applies as it is picked. In the header the Filter
  button applies.
- For a host's server: a date column that keeps the default sends moments,
  not days. No stored document changes shape, so there is no migration.

Proven by `table-periods.feature` and the `HeaderPeriod` story.

### A slice of the list, and where the list stands

**A windowed list** — `windowed: true` on `infinite-table`. The store holds
a SLICE, the DOM a window of it, the scrollbar spans the whole list.

- The rows at the `rows` port begin `offset` rows into the list (an optional
  port; the loader writes `<into>.offset` with every answer that replaces
  the rows). The row window runs over `total` rows; `sliceWindow` (pure)
  picks the slice's rows that fall into it, blank space stands in for the
  rest.
- The widget emits `window` with `{ offset, edge }` AHEAD OF TIME
  (`sliceRequest`, pure). `more` is never emitted.
  - `after` — the window passed three quarters of the rows held and the list
    goes on. Offset: where the next batch begins.
  - `before` — the window is within the first quarter and rows lie before
    the slice. Offset: the first row held.
  - `around` — the window is not wholly inside the slice (a jump, a scroll
    faster than the server). Offset: the first row wanted.
- It asks only when nothing is loading and the page has bound its reactions;
  once per set of rows and place; never for the slice already held, and not
  twice in a row for a slice around the same row. A slice that failed to
  load is not asked for again until the view moves. Nothing is fetched ahead
  for rows the list only passes on its way to a position it was told.
- Fewer rows held than six windows (`AHEAD_WINDOWS`) never fetch ahead: both
  marks would be passed at once and the list would fetch for ever. Such a
  list waits until its window leaves the rows held.
- A list that goes on asks for the batch `after` whenever its window reaches
  the last row KNOWN, before any rule about fetching ahead.

**The loader.** The reaction stores the whole payload —
`{ set: "<into>.wanted" }` — and calls `table-view/load` with `window: true`
(`slicePlan`, `joinedSlice`):

- `after` asks for `pageSize` rows from the offset and APPENDS them;
  `before` asks for the batch that ends at the first row held and puts it in
  front; `around` asks for the slice with the wanted row in its middle (the
  last full slice near the end) and REPLACES the rows.
- A batch asked for at an edge the slice no longer has is a slice of its
  own. A bare number at `wanted` is "the slice that begins there".
- At most THREE batches are kept (`KEEP_BATCHES`): a fourth joining drops
  the farthest, and `<into>.offset` moves. With two, the row that asked for
  the next batch would stand in the first quarter of the trimmed slice and
  ask for the dropped one back, for ever.
- A batch that JOINS does not raise `<into>.loading` (no spinner over rows
  in view); a slice that replaces does.

**The page says when: `fetchAhead`** — a setting of the infinite table, a
number of ROWS, 0 by default (the rules above).

- Windowed: the batch after is asked for once no more than that many rows
  held are left beyond the rows rendered; the batch before the same way
  towards the start.
- The page's mark is asked for ON THE WAY THERE only: `after` while the list
  last moved down (or has not moved), `before` while it last moved up. The
  way is read from the box's scroll position (`headingOf`, pure), never from
  the row window; a box that did not move keeps its heading.
- A batch no larger than the mark and the rows rendered together is not
  fetched ahead. So the mark belongs well under the batch size.
- Not windowed: `more` goes out once the end of the list is no more than
  that many rows under the box (the observer's `rootMargin`).

**Where the list stands** — the optional `position` port: the first row in
view, 0-based in the whole list.

- Bound, the widget emits `position-changed` `{ position, visible }` a frame
  after a scroll (written back by default). Unbound, nothing is emitted.
- The port is LISTENED to (`store.subscribe`), not read as state: only a
  position written by something else scrolls the box, and the table's own
  position renders nothing.
- A position told before the rows were measured is kept: the box is put at
  the same ROW again once the row height is known, until the user scrolls.

**`list-position`** — a standard contract, the pagination's sibling for a
list that scrolls.

- In: `position`, `total`, optional `visible` and `hasMore`. Out: `changed`
  `{ position }` when the scale is let go, written back by default.
- It shows "401–425 of 2 000", a percent (how far the LAST row in view is
  into the list — `listPercent`, one rule for every implementation) and a
  scale over the positions 0 … total − visible.
- While the handle is dragged the words follow it and the list does not: a
  windowed list is asked for one place, not for every one passed.
- It knows no list. Bound to the same paths as a table's `position` and
  `total`, the two follow each other.

Proven by `list-position.feature`, `table-height.feature`,
`row-window.test.ts`, `table-view.test.ts` and the `Windowed`, `FetchAhead`
and `FetchAheadWindowed` stories.

### A list whose end is not known yet

`total` is the rows KNOWN to exist; the optional boolean port `hasMore`
(on `infinite-table` and `list-position`, default false) says the list GOES
ON past it. False or unbound, `total` is the whole list.

- The user is never told a number that is not true: "401–425 of 800+", and
  NO percent while the end is unknown.
- `hasMore` is the server's knowledge, so the LOADER writes it. No widget
  deduces it.
- The view declaration says whether to count: `countRows: false` sends the
  request's `totalRecords: false`. A server that sends no `totalRecords`
  anyway gets the same treatment.

**The loader**, when the answer carries no `totalRecords`:

- `<into>.total` is the HIGH-WATER MARK: `offset + rows.length` of this
  answer, or the mark already there if larger. It does not shrink when a
  windowed list drops far batches.
- `<into>.hasMore` is `true` while the last batch at the END of what is
  known came back full (`rows.length === limit`), `false` once one comes
  back short or empty: the end is found and `total` is exact. A full last
  batch is found out by the empty one after it.
- The loader remembers, per store and view, the FILTERS the list is being
  learned under. Other filters are another list and start the mark over; the
  same filters keep the mark and a found end, whatever the load. A plain
  load (the first one, a refresh) starts over. A sort does not.
- Once the end is found it stays found under those filters: a later full
  batch from the middle does not turn `hasMore` on again.
- With `totalRecords` in the answer, `hasMore: false` is written only where
  the store already holds a `hasMore`.

**`infinite-table`:**

- Not windowed: `more` is emitted while `held < total || hasMore`. The
  status line reads "200 rows, more to load".
- Windowed: the scrollbar spans the rows known and grows as batches arrive;
  `sliceRequest` asks `after` while `end < total || hasMore`. The status
  line reads "800+ rows", then "2000 rows" once the end is found.
- `position-changed` is unchanged: a position is a row number.

**`list-position`:**

- The scale runs over the rows known, so the handle moves by itself when
  more become known. While the handle is held down the scale keeps its
  length: a drag in progress is not yanked.
- No percent (`showPercent` is ignored until the end is found). The
  slider's `aria-valuetext` and tooltip say "row 401 of at least 800".
- Letting the handle go at the scale's end writes the last known position;
  the list scrolls there, asks for the next batch, the scale grows —
  "scroll ahead". No new event.

Both widgets say `data-total` and `data-open`. Not changed: `pagination` (a
paged table without a count needs "next" without page numbers — another
story). The plain list's `more` with `hasMore` has unit coverage only.
Proven by `list-position.feature` and the `EndUnknown` stories.

### The column menu

`columnMenu` is a setting of both tables, ON by default. Built on plain
antd, not ProTable.

- A button above the table — a settings icon with the word "Columns", its
  accessible name — opens a popover: a line per column with a checkbox
  (shown or hidden), a drag to reorder (antd's Tree), THREE DOTS at its end,
  a "Columns" checkbox for all of them, and Reset.
- The COLUMN STATE is `{ order, hidden, pinned? }`, by property. Empty is
  "as configured", the one shape Reset writes. `pinned` is
  `{ <property>: "left" | "right" }`, ABSENT while nothing is pinned, so a
  state kept without it parses and compares the same (additive, ADR-0017).
  A column the state does not name stands after the ones it does; a property
  the table lost is skipped.
- WHERE IT LIVES: with the `columnState` port bound, the store —
  `columns-changed` writes it back by default. Unbound, local storage under
  `columnStateKey`, or `wirework:columns:<rows path>` when that is empty.
  Local storage is read on mount and written on every change; a state that
  changes nothing removes the key; a browser that refuses storage keeps the
  state for the visit.
- With the menu off, what local storage holds is NOT applied: nobody could
  bring a hidden column back.
- A REQUIRED column is a fact of the COLUMN (`required: true`; with the
  table-view loader the page's `columns.<id>.required`). The menu lists it
  checked and locked with a TAG "Always" holding a lock icon. "Columns"
  hides every column but the required ones, and `shownColumns` shows it
  whatever the state says. It is moved and pinned like any other.
- A PINNED column is antd's `fixed` column and STANDS at its edge: pinned
  left first, pinned right last, each group in the state's order.
  `orderedColumns` does it once, so the table, the menu, the cell selection
  and the export agree.
- The three dots open the column's actions on hover or a press: "Pin left"
  and "Pin right" for a column that is not pinned; "Unpin" and the pin to
  the OTHER edge for a pinned one.
- The list is in SECTIONS under captions: "PINNED LEFT", "COLUMNS", "PINNED
  RIGHT". COLUMNS is always there, the pinned ones only while they hold a
  column. A caption cannot be dragged; a drop UNDER it is the head of its
  section, a drop above it is no place. A column DRAGGED beside a pinned one
  is pinned with it, one dragged out is let go (`droppedColumn`).

Pure functions in `column-state.ts`, the hook `useColumnState`, the
render-only `ColumnMenu`. Proven by `column-state.test.ts`,
`table-columns.feature` and the stories `ColumnMenu`, `ColumnStateKept`,
`ColumnStateInTheStore`, `RequiredAndPinnedColumns`.

### The toolbar, its items registered by name

`toolbar` is a setting of both tables, EMPTY by default: a list of
`{ name, params? }` shown in that order above the table, before the column
menu's button (`TableToolbar`, a `role="toolbar"` named "Table tools").

- An item is a COMPONENT REGISTERED BY NAME, as a custom cell's renderer is:
  `createAntdTable({ toolbar })`, `createAntdInfiniteTable({ toolbar })` or
  `createAntdWidgets({ tableToolbar })`.
- It is handed `TableToolbarItemProps`: `params`, `loading`, `filtered`,
  `refresh()`, `resetFilters()`. No store and no emit — every effect is an
  event of the table and a reaction of the page.
- Two are STANDARD (`STANDARD_TOOLBAR`). `reset-filters` emits
  `filter-changed` with nothing chosen and is disabled while nothing is
  filtered by, whoever wrote the choice. `refresh` ("Reload") emits the
  table's `refresh` event and spins while the rows load; the page's reaction
  asks for the rows (`{ call: "table-view/load", with: { into } }`).
- The host's items are laid OVER the standard ones by name: one registered
  as `refresh` replaces it on every table. A name nothing is registered
  under is left out, with one console warning.
- A toolbar item is not a widget: no template, no ports, no cell of its own.
- The list is empty by default because `refresh` does nothing without a
  reaction, and a button that does nothing is worse than none.

Proven by `table-toolbar.feature` and the stories `Toolbar`, `NoToolbar`,
`CustomToolbarItems`.

### A title and the table's own filters

Two settings on both tables, empty by default:

- `title` — text at the LEFT of the bar above the table (a heading).
- `filters` — `[{ id, label?, kind?, options? }]`: `id` is the row property
  filtered by — it may be one no column shows —, `kind` is `values` (the
  default, with `options`), `text` or `dates`. The shape is the filter bar's
  definition plus a kind. The optional `filters` PORT holds the same list in
  the store and wins over the setting, as the `columns` port does.

The filters stand at the bar's right, before the tools; `toolbarAlign:
"left"` (a setting of both tables, `right` by default) puts the filters and
the tools straight after the title instead (`data-align` on the bar; the
`ToolbarAtTheLeft` story). They are NOT a
second state: they read `filterIn` / `filterLike` / `filterBetween` and emit
`filter-changed` with the whole choice, as a header does. So a bar filter, a
header on the same property and "Reset Filters" show one choice. A `dates`
filter is offered only while `filterBetween` is bound. Values and periods
filter at once; a text on Enter or on leaving the field. When the bar has no
room the filters wrap onto a second line (ADR-0022 proposes a button).

Built as `use-toolbar-filters.ts` and `FilterControl` (shared with the
filter row) in `table-toolbar.tsx`. Proven by `table-bar.feature` and the
`TitleAndFilters` story.

### Sideways scroll from the columns' widths

- A column's WIDTH in pixels is its own `width` (an optional field; with the
  table-view loader the page's `columns.<id>.width`), else 88 for an ID
  column, else 110 (`COLUMN_WIDTH`, `columnWidth`).
- An ID column (`isIdColumn`) is the rows' key (`rowKey`) or a property
  named like an identity: `id`, `run.id`, `user_id`, `ownerId`.
- The least width the table needs is the SUM over the columns it shows
  (`tableWidth`). Both tables hand it to antd as `scroll.x`: in a narrower
  box the table scrolls sideways, in a wider one it fills the box and the
  columns share what is left. The widget says the sum as `data-min-width`.
- The rule is pure and lives in the contracts package, so another
  implementation of the `table` contract scrolls at the same width.

Proven by `table-width.test.ts`, `table-width.feature` and the stories
`SidewaysScroll`, `FillsAWiderBox`, `ColumnWidths`.

### Cells are selected and copied

On both tables, behind `cellSelection` (ON by default).

- **The range is numbers:** `{ anchor, focus }`, rows counted through the
  WHOLE list (a windowed list's `offset` added), columns through the ones
  shown. Rows leaving the DOM take nothing with them. `cell-range.ts` is the
  arithmetic, pure: `rectOf`, `edgesOf`, `withinColumns` (a hidden column
  cuts the rectangle), `copyValue`, `rangeText`, `csvText`, `exportFile`.
- **One handler on the root** (`use-cell-selection.ts`). Every body cell
  says where it is (`data-at-row`, `data-at-column`). A press selects a
  cell, a drag a rectangle, Shift+click reaches from where the selection
  started, a press within ten pixels of the last cell's bottom-right corner
  drags that corner. A link or a button inside a cell keeps its press. A row
  click still emits `row-selected`.
- **What shows:** `data-selected` on a selected cell, `data-edge` for the
  sides of the rectangle it lies on, `data-anchor` on the first cell,
  `data-handle` on the last (the small square). The root says the rectangle
  as `data-selected="1-2/2-5"` (rowStart-columnStart/rowEnd-columnEnd, from
  1). Body text is not selectable by the browser while the setting is on.
- **The menu** (`cell-menu.tsx`): a right click on a body cell opens Copy,
  Copy with headers and Export as CSV at the pointer, hung on a one-pixel
  mark portalled to the body. A right click outside the selection selects
  that cell first. The menu uses the click trigger, so a scroll of the
  window does not close it. Closing gives the focus back to the row.
- **Copy** writes a line per row, cells tab-separated (a tab or line break
  inside a value becomes a space), titles first for "Copy with headers", and
  emits `cells-copied` `{ text, rows, columns, headers }`. Ctrl/Cmd+C copies
  too; Escape lets go. The text comes from the DATA (`cellText`): a tag is
  its text, a link cell its WHOLE address (`cellHref`), a link that leads
  nowhere its text.
- **Export as CSV** saves EVERY row the table HOLDS — not the selection, not
  rows only the server has — in the columns shown, titles first, RFC 4180
  quoting, a UTF-8 mark first. The file is `<exportName>.csv`, or a name
  made from the rows path (`infinite-list.data` →
  `infinite-list-data.csv`). It emits `rows-exported`
  `{ file, rows, columns }`.
- **The browser's part** is `browser-io.ts`: the async clipboard, the old
  `execCommand` way where it is absent, the file through a Blob link.

Limits: a windowed list copies only the rows it holds. Dragging does not
scroll the list. No arrow keys, no several rectangles, no fill. The export
does not guard against a spreadsheet reading a value that begins with `=` as
a formula (ADR-0019).

Proven by `cell-range.test.ts`, `table-copy.feature` and the stories
`CellSelection`, `CellSelectionOff`.

### Packages

- `@wirework/widget-contracts`: the header ports and events,
  `searchValuesSchema`, `columnOrderSchema`, the table settings and the
  width rule in `table.ts`; `infinite-table.ts` spreads them;
  `list-position`.
- `@wirework/antd-widgets`: `row-window.ts`, `column-state.ts`,
  `cell-range.ts` (pure); the hooks `use-row-window`, `use-table-headers`,
  `useColumnState`, `use-cell-selection`, `use-toolbar-filters`; both table
  components.
- `@wirework/table-view`: `table-view/load` with `window`, `countRows`, the
  mark and `hasMore`.

The window and the headers themselves are proven by
`infinite-table.feature`, `table-view.feature`, `row-window.test.ts` and
the `Window` and `HeaderFilters` stories.

### Not built

- A row height per row (measured and remembered) for lists whose rows wrap.
- A pin a PAGE configures.
- The bar's filters behind a button, and a count of active filters
  (ADR-0022).

## 4. Options weighed

### The window and the headers

| Option                                              | Verdict                                                                                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| antd's `virtual` Table                              | Dropped. It owns the scroll box, so the sticky header, the end line and the `more` observer would be rewritten around it; it needs fixed widths; its overscan is not ours to set. |
| A window of our own over the existing table         | Chosen. About forty lines of arithmetic and two spacer rows; no transforms. The row height has to be measured.                                                                    |
| Window size as a count of rows                      | Dropped for a part of the box: box heights work for any row height. The cost is blank space beyond one box on a fast scroll.                                                      |
| Header filters left in the infinite table           | Dropped. A paged table then filters only through a bar beside it.                                                                                                                 |
| One hook, ports and events shared by both contracts | Chosen.                                                                                                                                                                           |
| Headers offered by which ports are bound            | Dropped for a setting: it is said in the template, and each kind has its own default. A new widget kind was refused too.                                                          |

Accepted with it:

- The window uses the AVERAGE row height, so a wrapped cell makes the
  spacers a few pixels off. The tables are single-line lists, and the drift
  corrects itself.
- A rendered-row count is a PIXEL fact: tests count the rows HELD
  (`data-held`), not the rows in the DOM.

### The slice

- **Replace the slice only when the window has left it.** Dropped: blank
  rows on every plain scroll. Batches join ahead of time instead.
- **A share of the rows held as the page's mark.** Dropped for rows: "100
  rows before the end" is the same distance whether one batch is held or
  three. And with three batches kept, a share under two thirds asks the
  dropped batch back for ever — hence the mark asked for on the way there
  only.
- **The scale inside the table widget.** Dropped: a page may want it in
  another cell, or not at all.

### A list whose end is not known

| Option                                          | Verdict                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. The loader invents a total                   | Dropped. "200 of 200", a percent that reaches 100 and falls back, and a table that never asks for more: a lie every reader must be taught.               |
| B. A second number, `known`, beside `total`     | Dropped. Honest names, but two ports that mean "how long is the list" on three widgets, and every binding has to choose.                                 |
| C. One number and one flag (`total`, `hasMore`) | Chosen. Every reader of `total` already treats it as the upper edge of what it can show; only the "ask for more" test must not trust it. The least code. |
| D. Estimate the total                           | Dropped. The handle would jump when the guess is corrected, and a jump to "80%" could land past the end.                                                 |
| E. No scale until the end is found              | Dropped. It refuses what was asked: scrolling back and ahead along what is known.                                                                        |

### The rest

- **ProTable for the column menu and the toolbar.** Declined: its menu reads
  ProTable's own state, so taking it means rendering ProTable — its own
  request, pagination and toolbar — in place of tables that read ports and
  emit events, and rebuilding the row window on it.
- **A pin a page configures** (`pin` on the column). Left out: the user's
  own pin would need a third value, "not pinned", to undo it.
- **antd's RangePicker for a period.** Dropped for two fields: it loses a
  period with one end empty.
- **Whole days as the period's default, `time: true` to opt in.** Dropped: a
  `timestamp` column is the common case, and days cannot tell the morning's
  runs from the evening's. Accepting a day alone as an end was tried: antd
  takes the day the moment it is complete and the time typed after is lost.
- **The toolbar as a container layout** (any widget inside). Dropped:
  heavier, and its widgets could not reach the table's own state
  (`filtered`) without ports for it.
- **Bar filters, four ways.** Teach the separate `filter-bar` text and dates
  (two more cells and their reactions per table); filters as toolbar items
  (every host writes its own control); ProTable's query form (a second way
  to apply, a form's height above every table); two settings on the table —
  chosen.
- **The browser's text selection for copying.** It cannot take a column
  rectangle, copies a custom cell's button text, and loses rows a virtual
  list takes out of the DOM. antd selects whole rows only, so the rectangle
  is our own code. A third-party grid would replace both tables, and range
  selection is a paid tier of the ones known.

### Scrolling a long list, measured

Measured in Edge with a real mouse wheel on the windowed demo list (CPU
profile, long animation frames). The cell selection costs nothing
measurable. Three things did, and explain three rules above:

- **The playground's State panel** printed every row held on every position
  write. It prints at once after a change when the store was quiet, then not
  again until the store has been quiet for 250 ms (`usePrintedSnapshot`,
  `data-behind`). Layout time over a 250-tick scroll: 580 ms → 62 ms.
- **The table rendered for its own position** when it read the port as
  state. Hence the port is listened to.
- **The window moved at every row**, and antd's table renders every row when
  its data shifts. Hence `windowServes` and `heading`.

Script time for the same scroll: 4.4 s → 2.7 s on the dev server, 1.75 s →
under 1 s in a production build. What is left in development is React's
development-mode cost of rendering antd's table, twice under StrictMode.

### Ten thousand rows, as a scenario

`performance.feature` (steps in `performance.steps.ts`): the fake servers
are told to hold 10 000 runs (`window.wireworkListSize`), a real mouse wheel
scrolls the list a notch a frame, and the time between animation frames is
measured. The scenarios cover the windowed list (by the wheel, by jumps).
Measured on the development server, alone / inside the full suite:

| What                                                  | Median | 95th    | Longest   | Heap    |
| ----------------------------------------------------- | ------ | ------- | --------- | ------- |
| Windowed, 400 notches (about 1 300 rows, six batches) | 17 ms  | 33 / 50 | 67 / 117  | 83 MB   |
| Windowed, jumps to 10 % and 90 % of the list          | 17 ms  | 17 / 33 | 33 / 50   | 75 MB   |
| Appended, 400 notches with 10 000 rows held           | 17 ms  | 33 / 33 | 67 / 67   | ~130 MB |
| Appended, end to end and back                         | 17 ms  | 33      | 33        |         |
| Appended, four arrivals of 2 500 rows                 | 17 ms  | 50 / 67 | 467 / 500 |         |

- A windowed list never holds more than 600 rows nor renders more than a few
  dozen, wherever it stands in the ten thousand.
- A list that appends holds all of them, still renders a few dozen and
  scrolls the same. What costs is an ARRIVAL: 2 500 rows joining thousands
  stop the page for about half a second (the fake server filtering on the
  page's thread, the rows port validating every row again and the State
  panel printing them, together).
- The scenarios assert BOUNDS several times the measured numbers (95 percent
  of the frames within 100 ms, none over 500 ms). They catch a list that
  renders what it holds or a store that grows with the list, not a
  regression of ten percent.
- Not measured: a production build, a slow machine, rows of many columns.
