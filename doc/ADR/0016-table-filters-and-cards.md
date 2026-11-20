# ADR-0016: In-table filters and rows as cards — a filter row under the headers, and a table that becomes cards on a narrow screen

- **Status:** Accepted — partly built (the filter row; the cards not)
- **Deciders:** the product owner

## 1. Decision

Both asks are answered by SETTINGS on the two tables — no new widget, port
or event. **The filter row** (`filterRow`, built, off by default): a
control per filterable column under the headers, one more view of the
filter state the header dropdowns and the filter bar share. No demo page
turns it on; the `FilterRow` story proves it. **Rows as cards** (not
built): a second renderer in the same widget, taking over below a width of
the WIDGET (`cards`, `cardsBelow`). Story WW-35.

## 2. Problem

The ask: "design in-table filters with search icon for text filters, and
also a switch for small screens so every row becomes a card". That is two
asks:

1. **Filters you can see** — one control per filterable column inside the
   table, always visible, so the table says what it is showing.
2. **Rows as cards** — on a narrow screen (or on request) every row is a
   card of labelled fields in the columns' cell kinds, and the table's
   behaviour stays: a row click selects, a link follows, more rows load at
   the end.

Both tables already filter and sort in their HEADERS (ADR-0007,
`headerFilters`): a values filter behind a filter icon, a text filter
behind a search icon, a sort on the title. What is chosen is read from the
`filterIn` / `filterLike` / `orderBy` ports, and every change emits
`filter-changed` or `sort-changed` whole. So the search icon exists; what
a reader cannot see is WHICH filters are on — the choice sits in a closed
dropdown. And on a phone a six-column table in a 360-pixel cell is a
sideways scroll nobody reads.

## 3. Details

### The filter row

`filterRow: boolean`, default `false`, on `table` and through it on
`infinite-table`. No new port or event.

- Every column with a `filter` shows its control under its title: a
  multi-select of the column's values, or a text field with the search
  icon. `HeaderFilter` (render-only, `useHeaderFilter`) is the title above
  the control; `useTableHeaders` builds it.
- The controls read `filterIn` / `filterLike` and emit `filter-changed`
  through `filterChoice` — the whole choice with one column's replaced. A
  value picked in the row shows in the header dropdown and in the filter
  bar, and the other way round.
- The text is a draft until Enter or blur; the clear icon applies "no
  text".
- A control stops its own clicks and keys, a Select's popup included, so
  the header cell around it never sorts.
- The search field is `role="searchbox"` on a text input, not
  `type="search"`: the browser's own clear cross would stand next to
  antd's. A values control is a combobox. Each is named by its column
  ("Filter Name") and carries `data-testid="table-filter"` and
  `data-property`, so a test finds it by role and name.
- A table with a sticky header (the infinite table) renders every title a
  second time in the row it measures widths by. The control's copy there
  is `visibility: hidden`: it keeps the column's width and is out of the
  keyboard's and a screen reader's reach. A test reads the filters it can
  SEE.
- Sorting stays with `headerFilters`: the filter row alone does not sort.
  A page may turn both on.
- ONE filter UI per page: the page author chooses, the design does not
  stack them.
- No demo page turns it on — the product owner's rule for the demo: a
  filter shows only when its header icon is clicked, which is what
  `headerFilters` does.

Proven by the `FilterRow` story. The suite's header steps find the
dropdown's trigger through `headerFilterTrigger` (`e2e/support/antd.ts`),
because a header with a filter row holds other buttons and icons.

### Rows as cards

Not built. The design:

```ts
cards: z.enum(["auto", "always", "never"]).default("auto");
cardsBelow: z.number().int().min(0).default(560); // px of the widget's width; "auto" switches under it
```

The two settings are added with the cards, not before — a setting that
does nothing would sit in the builder's form. The events, the ports,
`load`, `more`, `row-selected` and `link-clicked` are unchanged: the cards
are a look, not a behaviour.

- **When**: `useWidgetWidth(rootRef)` (a ResizeObserver, the row window's
  pattern) decides the view from `cards` and `cardsBelow`. `always` is for
  a list that should never be a grid; `never` keeps a dense table dense.
  The root says `data-view="table" | "cards"`.
- **What**: `TableCards` (render-only) renders the same `renderedRows` as
  antd `Card`s (size small) in a vertical flex. Each card holds one
  `DescriptionField` per visible column — the `descriptions` widget's
  field (ADR-0015), so a status is the same tag and a custom cell the same
  control. The card carries `data-testid="table-card"`, `data-row-key`,
  `tabIndex` and the SAME row props (`useRowProps`): a click selects, a
  link follows, Enter selects.
- **The bar above the cards** (`CardsBar`): the filter-row controls, when
  `filterRow` or `headerFilters` is on, and a select of the sortable
  columns writing `orderBy` through `sort-changed`. The sort select is
  built last.
- `AntdTable` and `AntdInfiniteTable` switch between `<Table>` and
  `<TableCards>` on the view, in one place. The infinite table keeps its
  scroll box, its row window and its "held of total" line: the window
  already measures the average height of the rendered rows, so it gets
  taller rows and fewer of them.
- Styles `.ww-table--cards` and `.ww-table__card`; nothing of antd's DOM
  is restyled.
- In the demo: both tables `auto`; the Wirework admin's sessions table
  `always`. Scenarios narrow the window to 480 pixels and assert the
  cards, a click selecting, a link followed and `more` still loading —
  waiting for the fact (`data-held`), never for time.

After the cards: a user-flipped toggle (cards / table) as a per-cell
setting the overlay stores; the repeater (ADR-0015), which takes the same
rows and cell kinds.

### Open points

- The builder's palette preview is 200 pixels wide, so with `auto` every
  table preview becomes cards: either the previews set `cards: "never"` or
  the preview is accepted as the phone look.
- The view table API's example first answer
  (`doc/tableApi/4-data-first-response.json`) carries NO `totalRecords`,
  so `<into>.total` stays unset — a pagination has nothing to count.
  Whether the server always counts when asked (`totalRecords: true`) is
  not answered.

## 4. Options weighed

**Filters**

| Option                                | Verdict                                                                                                                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. The header dropdowns alone         | They stay. Not the whole answer: the ask is visibility, and a closed dropdown is invisible by design.                                                                                                                                                     |
| B. A filter row, a setting            | Chosen. Same ports, same event: nothing new in the contract but the setting. antd's Table has no floating-filter row, so the control sits INSIDE the header cell under the title; a second header row faked with the summary row breaks on the next antd. |
| C. The filter bar widget alone        | Stays as a separate widget the page places. A bar plus a row plus dropdowns would show the filters three times — hence one filter UI per page.                                                                                                            |
| D. The header title itself as a field | Rejected: crowded, and the sort click and the typing fight for the same pixels.                                                                                                                                                                           |

**Cards**

| Option                                     | Verdict                                                                                                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. CSS only (`display: block`, `::before`) | Rejected: antd's table DOM carries its own measurements, the row window measures real row heights and spacer rows, and a `::before` label cannot be a React cell.                                                           |
| B. A second renderer in the same widget    | Chosen. The table hooks already produce what a card needs — the rendered rows, the columns, the cell renderer, the row props — so filters, paging and `more` keep working with no new wiring.                               |
| C. A separate `card-list` widget           | That is the repeater: any layout per record, a design of its own. The cards name their fields from the columns and share the row props, so a repeater can later take the same rows and replace them — never two card lists. |

**When the cards show**

| Option                             | Verdict                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| A. A media query on the window     | Rejected: a table in a narrow cell of a wide page must go to cards too.                     |
| B. The widget's own measured width | Chosen. `cardsBelow` is a number of pixels, which anyone understands; no breakpoint names.  |
| C. A toggle the USER flips         | After the cards: it is a user preference, and the overlay stores settings per cell already. |

The filter row came first because which filters are on is a support
question ("why is the list short?").

Risks:

- A click inside a filter control must not sort the column — a regression
  test pins it.
- The infinite list's `more` as cards is the scenario most likely to
  flake: the window's row height changes with the first card measured.
