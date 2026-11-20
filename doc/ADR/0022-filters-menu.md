# ADR-0022: The table's filters behind a button — where they go when the bar has no room

- **Status:** Proposed — not built
- **Deciders:** the product owner

## 1. Decision

Proposed, not built. A table's own filters that the bar has no room for go
behind a "Filters" button beside "Columns", which stays as it is. Each
filter gains `place: "bar" | "menu"` (default `bar`). The button shows how
many of the menu's filters have a choice. Same controls, same ports, same
`filter-changed`. Chips for what is chosen are a second phase. Four points
wait for the owner.

## 2. Problem

A table can show filters of its own in the bar above it (`filters`,
ADR-0007 "A title and the table's own filters"). The owner has such a filter
and little room in the bar, and asked where else it can live: a Filters
button like Columns, or Columns renamed to Menu with sections — and for
other ideas.

What the decision rests on:

- **The bar has three parts:** the title at the left; at the right the
  table's own filters, each a label and a control about 10 rem wide (a
  period is two date-time fields, about twice that); then the tools and the
  "Columns" button. When they do not fit, the filters WRAP onto a second
  line: the bar grows taller, nothing is hidden.
- **"Columns" is the user's VIEW of the table:** a popover with a checkbox
  per column, a drag to reorder, pinning and Reset, kept in local storage
  (or a port).
- **A filter's choice is DATA of the page:** it lives in the store
  (`filterIn` / `filterLike` / `filterBetween`), is sent to the server and
  is cleared by the toolbar's "Reset Filters". The bar's filters, the header
  dropdowns and the filter row are views of that one choice.
- **Nothing says what is filtered by** once a control is out of view. An
  enabled "Reset Filters" is the only table-wide sign.
- **A control inside a popover works:** the header dropdowns hold a Select
  and date pickers in one.

## 3. Details

A "Filters" button with a place per filter (options A and C below);
"Columns" is left as it is.

### The rule

- A filter gains `place: "bar" | "menu"`. The default is `bar`, so the
  change is additive and needs no migration.
- Filters placed in the menu stand in a popover opened by a "Filters" button
  between the bar's own filters and the tools.
- The button reads "Filters", or "Filters · 2" with the count of the menu's
  filters that have a choice. It is in the bar only while a filter is placed
  in the menu.
- In the popover: a label over each control, the same control the bar and
  the filter row use (`FilterControl`), applying as they do — values and
  periods at once, a text on Enter or on leaving the field.
- "Reset" at the popover's foot clears the MENU's filters only. The
  toolbar's "Reset Filters" still clears everything.
- The menu's filters stay one choice with everything else: the same three
  ports, the same `filter-changed`. A page's reactions do not change.

### The build

- **Contract** (`table`, shared by both table kinds): `place` on
  `tableFilterSchema`. The menu is not a setting of its own — it exists when
  a filter is placed in it.
- **antd:** `useToolbarFilters` returns the bar's entries and the menu's; a
  render-only `FiltersMenu` (a Popover, as `ColumnMenu` is) in
  `table-toolbar.tsx`. The count is derived from the entries, not kept.
- **Facts for tests:** the button `table-filters-menu` with `data-count`;
  each control in the popover `table-menu-filter` with the attributes a bar
  filter has (`data-column`, `data-property`, `data-kind`, `data-values`).
- **Proof:** a `FiltersMenu` story (two filters in the bar, two in the menu:
  a pick writes the port and raises the count; the menu's Reset leaves the
  bar's choice alone; the toolbar's reset clears both) and scenarios on the
  demo table that has the bar filters, with "Reference" kept in the bar and
  "Started" — the widest control — behind the button.

### Phases

1. `place`, the "Filters" button with its count, the popover, the story, the
   scenarios, the demo page.
2. Chips for what is chosen (option E), for every filter of the table.

### Fallback

If one button is wanted for reasons of room: a "Columns" popover with a
second TAB, not a renamed button with stacked sections. The two halves keep
their own Reset and their own height.

### For the owner to decide

1. Two buttons — "Filters" and "Columns" (proposed) — or one with two tabs
   (the fallback).
2. A place per filter (proposed), or one switch for the whole list —
   simpler, but then the filter used every time is behind a click too.
3. The menu's filters apply at once, as in the bar (proposed), or wait for
   an "Apply" button in the popover — fewer requests while several are set,
   one more click, and a second way to apply a filter.
4. Whether the chips (phase 2) are wanted, and whether before or after.

## 4. Options weighed

| Option                                                 | Verdict                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. A "Filters" button beside "Columns"                 | Proposed. One more button, and the two jobs stay apart: what rows I see, and how the table looks. A filter behind a button costs a click, so the count is needed — without it a list is short for no visible reason.                      |
| B. One "Menu" button with sections Filters and Columns | Not proposed. Filters are used often, reach the server and are the page's data; columns are set rarely and stay in the browser; each Reset means something else. A drag list and a form in one popover is tall, and "Menu" names neither. |
| C. A place per filter                                  | Proposed, with A. The page author keeps the one or two filters people use every time in view and puts the rest away — what ProTable's light filter does with its "more" group.                                                            |
| D. Overflow by width                                   | Refused. Nothing to configure, but a filter is in a different place on every screen — hard to teach, document and test — and the bar must be measured on every resize.                                                                    |
| E. Chips for what is chosen                            | Phase 2, a decision of its own. Answers "why is the list short" for every filter, the headers' too; adds a line to the table's height only while something is chosen.                                                                     |
| F. A drawer at the side                                | Waits for a page with more filters than a popover holds. Heavy for one or two filters, and it covers the table it filters.                                                                                                                |

Trade-offs accepted:

- A filter behind the button is out of sight. The count is the only sign
  until the chips exist; a page author should keep the filter people use
  every time in the bar.
- Two Resets on one table mean different things. The menu's is labelled for
  what it clears.
- A period in a popover opens a calendar from inside a popover. The header
  dropdowns do the same, so it is known to work; it is the first thing to
  try in the story.
