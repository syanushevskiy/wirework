# ADR-0016: In-table filters and rows as cards — a filter row under the headers, and a table that becomes cards on a narrow screen

- **Status:** Accepted — partly built (the filter row; the cards not)
- **Date:** 2026-11-09
- **Deciders:** the tiger team (doc/team_tiger.md) and the product owner

Written 9 November 2026 (story WW-35; phase 1, the filter row, built the
same day — "Built" at the end; the cards not built). The ask: "design
in-table filters with search icon for text filters, and also a switch for
small screens so every row becomes a card".

## What there is

Both tables (`table`, `infinite-table`) already filter and sort IN THEIR
HEADERS (doc/ADR/0007-row-window-and-header-filters.md, the `headerFilters` setting — off for the
paged table by default, on for the infinite one; the runs page turns it on):
a column whose filter is a list of values carries antd's filter icon with
a list to tick; a column the server calls filterable without values
carries a SEARCH icon opening a box to type in; a sortable column sorts on
a click of its title. What is chosen is read from the `filterIn` /
`filterLike` / `orderBy` ports and every change emits `filter-changed` or
`sort-changed` whole. The runs page also has the filter bar widget above
the table, fed by the server's description.

So the search icon for text filters EXISTS — in the header, behind an
icon. What a reader of the runs page cannot see is WHICH filters are on:
the chosen values sit in a closed dropdown, the typed text behind an icon
that changes colour. And on a phone, a six-column table in a 360-pixel
cell is a horizontal scroll nobody reads: the cells the page configured
(a tag, a link, a Copy button) are all there, but a row is no longer a
row.

Two asks, then:

1. **Filters you can see** — a FILTER ROW inside the table, under the
   headers: one control per filterable column, a text field with a search
   icon for a text filter, a list of values for a values filter, always
   visible, so the table says what it is showing.
2. **Rows as cards** — on a narrow screen (or on request) every row renders
   as a card of labelled fields, in the same cell kinds the columns name,
   and the table's behaviour (a row click selects, a link follows, more
   rows load at the end) stays.

## The question

Where do the filter row and the cards live — new widgets, new settings on
the two tables, or CSS — and how much of what exists do they reuse?

## The answers weighed

### Filters

**A. Leave the header dropdowns as they are.** They work and they are
tested. Rejected as the whole answer: the ask is visibility, and a closed
dropdown is invisible by design.

**B. A filter row under the headers, a setting on both tables.** Chosen.
`filterRow: boolean` next to `headerFilters`; the row renders one control
per column that has a `filter`: a values filter becomes a multi-select of
the column's values, a text filter a search field with the search icon
(antd `Input` with a `prefix`), applied on Enter and on blur, cleared with
the field's clear icon. The controls read and write the SAME ports
(`filterIn`, `filterLike`) and emit the SAME `filter-changed`, so a value
ticked in the filter row shows in the header dropdown and in the filter
bar, and the other way round — three views of one state, as the headers
and the bar are today. Nothing new in the contract but the setting.
Implementation: antd's Table has no floating-filter row, so the control
sits INSIDE the header cell under the title (a header cell is "title above
control", the control stops `click` propagation so a sort is not
triggered); the header is sticky in the infinite table, so the row stays
in view while the rows scroll.

**C. The filter bar widget alone.** Exists; it is a separate widget the
page places, and it offers values only (a text filter "has no place in a
bar", said the row-window design). Kept as it is: a page with a bar and a
filter row would show its filters twice, so a page picks one — the runs
page keeps its bar; the history page, which has no bar, is the one that
gains the filter row in the demo.

**D. The header title itself as the field.** Crowded, and the sort click
and the typing fight for the same pixels. Rejected.

### Cards

**A. CSS only.** The classic responsive trick: hide the `thead`, make
every cell `display: block` with its header as `::before` content from a
`data-label`. Cheap — and wrong here: antd's table DOM carries its own
classes and measurements, the infinite table's row window measures real
row heights and blank spacer rows, and a `::before` label cannot be a React
cell. Rejected.

**B. A second renderer in the same widget.** Chosen. The two table hooks
already produce everything a card needs: the rendered rows (`key`, `row`),
the columns, the cell renderer (`TableCell`), the row props that decide a
click. A CARDS renderer renders the same `renderedRows` as a list of
cards — each card one `DescriptionField` per visible column, the exact
component the `descriptions` widget shows (doc/ADR/0015-more-widgets.md), so
a status is the same tag and the reference the same Copy button — with the
row's `data-row-key`, the same `row-selected` on a click and
`link-clicked` on a link. The filter row's controls move to a bar ABOVE
the cards (no headers to sit in); sorting becomes a select of the sortable
columns in that bar. For the infinite table the row window stays: it
already measures the average height of the rendered rows, cards included —
the window gets taller rows and fewer of them, nothing else changes.

**C. A separate `card-list` widget.** A widget whose template is a card
layout per row — the REPEATER the previous design named as the real gap.
Not this story: it is the general case (any layout per record) and
deserves its own design; the cards here are the table's own rows in one
fixed shape, so the table's filters, paging and `more` keep working with
no new wiring. Ren's condition: name the card's fields from the columns,
so a repeater later can take the same `rows` and the same cell kinds.

### When the cards show

**A. A media query on the window.** Rejected: a table inside a narrow card
of a wide page must go to cards too; a page in a wide window may still
place a table in a 300-pixel column.

**B. The widget's own width, measured.** Chosen. A `ResizeObserver` on the
widget's root (the row window already has one for the scroll box) gives
the width; below `cardsBelow` pixels the cards renderer takes over. Setting
`cards: "auto" | "always" | "never"` (default `auto`) with `cardsBelow`
(default 560 px): `always` is the explicit switch a page author flips for
a list that should never be a grid; `never` keeps a dense table dense. The
root exposes `data-view="table" | "cards"` so a scenario asserts which is
showing, and the page author sees the switch happen in the builder by
narrowing the window.

**C. A toggle the USER flips.** A button in the table's corner — "cards /
table". Later: it is a user preference, and the user overlay stores
settings per cell already, so it is a `cards` setting written by a
toolbar button when somebody asks. Not in this story.

## The design

### Contract (`table`, and `infinite-table` through it)

Three settings, no new ports or events:

```ts
filterRow: z.boolean().default(false); // a control per filterable column under the headers
cards: z.enum(["auto", "always", "never"]).default("auto");
cardsBelow: z.number().int().min(0).default(560); // px of the widget's width; "auto" switches under it
```

`headerFilters` stays; a page may turn both on (the dropdowns for the
power user, the row for everyone) or only the row. The `filter-changed`
and `sort-changed` events, the `filterIn` / `filterLike` / `orderBy`
ports, `load`, `more`, `row-selected` and `link-clicked` are unchanged:
the cards are a look, not a behaviour.

### antd implementation

- `use-table-headers.ts` gains the filter-row controls: `headerOf` keeps
  the dropdowns; a new `filterRowOf(column, chosen, searched, change)`
  returns the control (a `Select mode="multiple"` of the values, or an
  `Input` with `prefix={<SearchOutlined />}`, `allowClear`, Enter and blur
  committing); the column's `title` becomes title above control when
  `filterRow` is on. The controls carry `data-testid="table-filter"`,
  `data-property` and `role` (combobox / searchbox: the input is
  `type="search"`), and the header click handler ignores clicks from
  inside the control.
- A `useWidgetWidth(rootRef)` hook (ResizeObserver, the row window's
  pattern) decides `view` from `cards` and `cardsBelow`.
- `TableCards` (render-only) renders `renderedRows` as antd `Card`s (size
  small) in a vertical flex: each card one `DescriptionField` per visible
  column (`antdColumnOf`'s `data-property` / `data-cell` come along), the
  card element with `data-testid="table-card"`, `data-row-key`, `tabIndex`
  and the SAME row props (`useRowProps`) — a click on the card selects, a
  click on a link follows, Enter selects. Above the cards a `CardsBar`:
  the filter-row controls (when `filterRow` or `headerFilters` is on) and
  a sort select of the sortable columns writing `orderBy` through
  `sort-changed`.
- `AntdTable` and `AntdInfiniteTable` switch between `<Table>` and
  `<TableCards>` on `view`; the infinite table keeps its scroll box, its
  row window and its "held of total" line around the cards.
- Styles: `.ww-table__filter` (the control under the title), `.ww-table
--cards` and `.ww-table__card`; nothing of antd's DOM is restyled.

### The demo

- **History page** (no filter bar): `filterRow: true` — Name gets a search
  field under its title, Status and Inbound a values select; the header
  dropdowns stay on (the infinite table's default).
- **Runs page**: nothing changes; it keeps its bar and its header filters
  (one filter UI per page).
- **Cards**: both tables are `auto`; the e2e narrows the window
  (`the browser window is 480 pixels wide`, the step exists) and asserts
  the runs table shows cards, a card shows "Status" "Failed", a click on a
  card selects the run (Open run appears), a link in a card opens the run
  page, and the history list still loads more at its end as cards.
  `cards: "always"` is shown on the cards page: a fourth card? No — the
  cards page is full; the sessions table of the Wirework admin's settings
  card is `always` (three sessions as three cards, a tiny list that reads
  better as cards).

### Steps (for the non-technical QAs)

`I type "<text>" into the "<column>" filter of the table` (the filter
row's search field; Enter), `I pick "<value>" in the "<column>" filter of
the table` (the row's select), `the "<column>" filter of the table holds
"<text>"`, `the table shows its rows as cards` / `as a table`
(`data-view`), `the card for row "<key>" shows "<title>" "<text>"`
(`table-card` by `data-row-key`, `description-field` by `data-item`), `I
click the card for row "<key>"`, `I sort the cards by "<title>"`. The
existing `the table has N rows` counts cards too (`data-row-key`).

## Tiger team's positions

**Alexei (architecture).** Three settings on the contract and zero new
events: the cards are a RENDERING of the same intents, which is the test
that the table's contract was right. The card's field must be
`DescriptionField`, not a copy — the fact sheet proved the cell is a
contract-level thing last week; a second field component is where drift
begins. Measure the widget, never the window.

**Dmitri (readability).** No CSS tricks: two renderers, chosen by one
boolean in one place, each readable on its own. The filter row's control
is the header's child, not a second header row — antd has no such row and
faking one with a summary is the kind of clever that breaks on the next
antd. `cardsBelow` in pixels, a number anyone understands; no breakpoint
names.

**Katya (team).** Both tables share the two hooks already; the filter row
and the width hook go into them once and both tables get them. The
history page is the right demo for the filter row — it is the page with no
bar — and the runs page must not change, or every runs scenario moves.
Two days: a day for the filter row with its scenarios, a day for the cards
with the window.

**Sasha (QA).** The filter row's fields by role — `searchbox` for text,
`combobox` for values — named by the column ("Filter Name"), never by
antd's class names; the cards keep `data-row-key`, so `the table has N
rows` and `the first table row is` work unchanged, and the window-width
step exists. One regression to pin from the start: a click inside a filter
control must not sort the column. The infinite list's `more` as cards is
the scenario most likely to flake — the window's row height changes with
the first card measured; wait for the fact (`data-held`), as always.

**Ren (contrarian).** First: the search icon for text filters EXISTS — is
the ask really the icon, or that nobody found it? If the latter, the
filter row answers it; if the team only adds a second place to filter, the
runs page will have three (bar, header, row) and a user will not know
which one is on. Rule: one filter UI per page — the page author chooses,
the design does not stack them. Second: the cards are the repeater in
disguise; build them so the repeater can replace them — the card's fields
from the columns, the row props shared — and say so in the doc, or in six
months there are two card lists. Third: `auto` on the widget's width is
right, but the builder's palette preview is 200 pixels wide — every table
preview becomes cards; set the previews' `cards: "never"` or accept that
the preview shows the phone look.

**Morgan (product).** In the user's words: "I can see what I filtered by",
and "the runs list works on my phone". The filter row first — it is a
support question today ("why is the list short?") — the cards second. The
history page as the demo is fine, but the runs page is the one people open
on the phone: `auto` there, so the phone look is on the main list without
touching its filters.

**Vlad (fluency).** The card is `columns.map(column => <DescriptionField
item={column} record={row} cells={cells} />)`; the filter row is
`columns.filter(has a filter).map(filterRowOf)`. Two maps, no new state.

**External reviewer (minimum code).** Three settings, two hooks touched,
one new render-only component and a bar. No contract events, no new
widget, no CSS on antd's DOM. The sort select in the cards bar is the one
piece that could wait — a phone user sorts rarely — build it last and
drop it if the day runs out.

## Phases

1. **The filter row — 1 day.** The three settings on the contract (the
   two for cards declared now, inert until phase 2, so the schema changes
   once); `filterRowOf`, the header cell as title above control, the
   history page on it, `table-filters.feature`; the regression test for a
   click inside a control not sorting.
2. **The cards — 1 day.** `useWidgetWidth`, `TableCards`, the cards bar
   with the filter controls, both tables switching on `view`, the sessions
   table `always`, the phone scenarios at 480 pixels including `more` on
   the history list; the sort select last.

## Built — phase 1, the filter row (9 November 2026)

The table a `table-view/load` call makes of the server's FIRST answer
(`doc/tableApi/4-data-first-response.json`, pinned in the `table-view`
tests) now shows its columns with their filters in the table. What was
built, and where it departs from the design above:

- `filterRow` is the one setting added; `cards` and `cardsBelow` come with
  phase 2 — a setting that does nothing would sit in the builder's form.
- `HeaderFilter` (render-only, `useHeaderFilter`) is the column's title above
  its control; `useTableHeaders` builds it for every column with a `filter`
  and emits `filter-changed` through `filterChoice` — the whole choice with
  one column's replaced. The text is a draft until Enter or blur; the clear
  icon applies "no text". The control stops its own clicks and keys, so the
  header cell around it never sorts (a Select's popup included).
- The search field is `role="searchbox"` on a text input, not
  `type="search"`: the browser's own clear cross would stand next to antd's.
- A table with a sticky header (the infinite table) renders every title a
  second time in a row it measures widths by; the copy of the control there
  is `visibility: hidden` — it keeps the column's width, and is out of the
  keyboard's and a screen reader's reach. A test reads the filters it can
  SEE.
- Sorting stays with `headerFilters`: the filter row alone does not sort.
- NO demo page has it on. The history page had (with its header dropdowns)
  for an hour; the product owner's word on seeing it: a filter is not to be
  seen in the header, only when its icon is clicked — which is what
  `headerFilters` does. The setting stays, off by default, proven by the
  `FilterRow` story; `table-filters.feature` went with the demo. The header steps of the suite now find the
  dropdown's trigger through `support/antd.ts` (`headerFilterTrigger`): a
  header with a filter row holds other buttons and icons.
- One thing the example shows that nothing answers yet: that first answer
  carries NO `totalRecords`, so `<into>.total` stays unset — a pagination
  has nothing to count and an infinite table asks for no more. Whether the
  server always counts when asked (`totalRecords: true` is in every
  request) is the open question.

## Later

- A user-flipped toggle (cards / table) as a per-cell setting the overlay
  stores.
- The repeater: a layout per record, which these cards hand their fields
  to (doc/ADR/0015-more-widgets.md, answer E).
- A filter row on the `descriptions` widget's items? No: a fact sheet is
  one record.
