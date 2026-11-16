# ADR-0022: The table's filters behind a button — where they go when the bar has no room

- **Status:** Proposed — not built
- **Date:** 2026-11-16
- **Deciders:** the product owner

## Description

A table can show filters of its own in the bar above it (`filters`,
ADR-0007 "A title and the table's own filters"). The owner has such a
filter and little room in the bar, and asked where else it can live: "an
additional Filters button like Columns, or rename Columns to Menu" with
sections — and for ideas beyond those two.

## What there is (read from the code, 16 November 2026)

- **The bar has three parts:** the title at the left; at the right the
  table's own filters, each a label and a control about 10 rem wide (a
  period is two date-time fields, about twice that); then the tools and
  the "Columns" button. When they do not fit, the filters WRAP onto a
  second line under the title — the bar grows taller, nothing is hidden.
- **"Columns" is a popover** with a tree: a checkbox per column, a drag
  to reorder, three dots to pin, sections PINNED LEFT / COLUMNS / PINNED
  RIGHT, and Reset. Its state is the user's VIEW of the table, kept in
  local storage (or a port).
- **A filter's choice is DATA of the page:** it lives in the store
  (`filterIn` / `filterLike` / `filterBetween`), is sent to the server
  and is cleared by the toolbar's "Reset Filters". The bar's filters, the
  header dropdowns and the filter row are views of that one choice.
- **Nothing says what is filtered by** once a control is out of view: a
  header shows a highlighted icon, the bar shows the control itself.
  "Reset Filters" being enabled is the only table-wide sign.
- **A control inside a popover works:** the header dropdowns already
  hold a Select and date pickers in one.

## Options considered

- **A. A "Filters" button beside "Columns".** A popover with the table's
  own filters one under the other, each under its label, and Reset at its
  foot. The button says how many are chosen ("Filters · 2"). One more
  button in the bar, and the two jobs stay apart: what rows I see, and
  how the table looks. A filter behind a button costs a click, so the
  count on the button is not decoration — without it a list is short for
  no visible reason.
- **B. One "Menu" button: "Columns" renamed, with sections Filters and
  Columns.** One button instead of two. But the two halves differ in
  everything that matters: filters are used often, columns rarely;
  filters are the page's data and reach the server, the column state is
  the user's own and stays in the browser; each has a Reset that means
  something else. A drag list and a form in one popover is tall, and a
  word like "Menu" says nothing about either. The filter's state would
  sit two steps from sight.
- **C. A place per filter.** Each filter says where it stands: in the
  bar, or behind the button. The page author keeps the one or two
  filters people use every time in view and puts the rest away — what
  ProTable's light filter does with its "more" group. It needs A's
  button to exist.
- **D. Overflow by width.** The filters that do not fit move behind a
  "More" button by themselves. Nothing to configure, and right at every
  width — but a filter is in a different place on every screen, which is
  hard to teach, to document and to test, and it needs the bar measured
  on every resize.
- **E. Chips for what is chosen.** Whatever holds the controls, a line
  under the bar lists what is filtered by — "Reference: REF55 ×",
  "Started: from 1 Nov ×" — each removable. It answers "why is the list
  short" for every filter at once, the headers' too. It adds a line to
  the table's height, and only when something is chosen.
- **F. A drawer at the side.** Room for many filters, their labels and
  help. Heavy for one or two filters, and it covers the table it filters.

## Decision

**Proposed: A with C — a "Filters" button, a place per filter — and
"Columns" left as it is.**

- A filter gains `place: "bar" | "menu"` (default `bar`, so nothing
  stored changes: additive, no migration). Filters placed in the menu
  stand in a popover opened by a "Filters" button between the bar's own
  filters and the tools.
- The button reads "Filters", and "Filters · 2" with the count of the
  menu's filters that have a choice; it has no place in the bar while no
  filter is placed in the menu.
- In the popover: a label over each control, the same control the bar
  and the filter row use (`FilterControl`), applying as they do — values
  and periods at once, a text on Enter or on leaving the field — and
  "Reset" at the foot, which clears the MENU's filters only (the
  toolbar's "Reset Filters" still clears everything).
- They stay one choice with everything else: the same three ports, the
  same `filter-changed`. A page's reactions do not change.

B is not proposed: it joins two things that share nothing but the bar,
and makes the more frequent one harder to reach. D is refused for a
filter that moves between screens. E is worth having but is its own
decision — it serves the header filters as much as these — and is left
as the second phase. F waits for a page with more filters than a popover
holds.

If one button is still wanted for reasons of room, the form of B that
costs least is a "Columns" popover with a second TAB, not a renamed
button with stacked sections: the two halves keep their own Reset and
their own height. It is recorded here as the fallback, not built.

## The design

- **Contract** (`table`, shared by both kinds): `place` on
  `tableFilterSchema`. Nothing else: the menu is not a setting of its
  own — it exists when a filter is placed in it.
- **antd:** `useToolbarFilters` returns the bar's entries and the menu's;
  a render-only `FiltersMenu` (a Popover, as `ColumnMenu` is) in
  `table-toolbar.tsx`. The count is derived from the entries, not kept.
- **Facts for tests:** the button `table-filters-menu` with `data-count`;
  each control in the popover `table-menu-filter` with the attributes a
  bar filter has (`data-column`, `data-property`, `data-kind`,
  `data-values`).
- **Steps:** `I open the filters of the table`, `the filters of the
table list "<labels>"`, `the table says <n> filters are chosen`, and
  the bar's typing and picking steps with "in the filters of the table".
- **The demo:** the history list keeps "Reference" in the bar and moves
  "Started" — the widest control — behind the button.

## How it is tested

A story (`FiltersMenu`): two filters in the bar, two in the menu; a pick
in the menu writes the port and raises the count; the menu's Reset
leaves the bar's choice alone; the toolbar's reset clears both. Scenarios
on the history page: the period chosen behind the button filters the
list and the button says 1; a reload of the rows keeps it; "Reset
Filters" brings the count back to none.

## Consequences

- A filter behind the button is out of sight. The count is the only sign
  until the chips of phase 2 exist; a page author should keep the filter
  people use every time in the bar.
- Two Resets on one table — the menu's and the toolbar's — mean
  different things. The menu's is labelled for what it clears.
- A period in a popover opens a calendar from inside a popover: the
  header dropdowns do the same today, so it is known to work, and it is
  the first thing to try in the story.

## Phases

1. `place`, the "Filters" button with its count, the popover, the story,
   the scenarios, the history page.
2. Chips for what is chosen (option E), for every filter of the table.

## For the owner to decide

1. Two buttons — "Filters" and "Columns" (proposed) —, or one with two
   tabs (the fallback above).
2. A place per filter (proposed), or one switch for the whole list —
   simpler, but then the filter used every time is behind a click too.
3. The menu's filters apply at once, as in the bar (proposed), or wait
   for an "Apply" button in the popover — fewer requests while several
   are set, one more click, and a second way to apply a filter.
4. Whether the chips (phase 2) are wanted, and whether before or after.
