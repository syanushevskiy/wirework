# Widget catalog — which standard widgets to build, in order

## Why

Pages are built from standard widget KINDS (contracts in
`@wirework/widget-contracts`) and their implementations
(`@wirework/antd-widgets`). Today the standard kinds are `label`, `button`,
`input`, `pagination` and `refresher`. Authors expect the basics every UI
library has; this list decides which to add first, and which "widgets" are
not cell widgets at all.

## Method

**Reference libraries** — a widget counts as present when the library ships
a dedicated, documented component for it: Ant Design 6, MUI (core), Chakra
UI 3, Mantine, Bootstrap 5, shadcn/ui. Counts come from the libraries'
component catalogs as known when this list was written; a "~" marks a count
worth re-checking (the widget moved between packages or is a recipe).

**Criteria** (each 0–3):

| Criterion | 3 | 0 |
|---|---|---|
| **U**biquity | in 6 of 6 libraries (score = count ÷ 2) | in none |
| **F**it | a cell that reads ports and emits events, nothing else | owns other cells, or is an action |
| **V**alue | the runs dashboard (`widgets.jpg`) or forms need it now | nobody asked |
| **C**ost | a contract plus a thin implementation | needs a new design first |

**Score** = 3×U + 2×F + V + C (max 21). Ubiquity weighs most: these are the
widgets an author already knows from every other tool. Fit is next: a widget
that cannot live in a cell is not a widget here, whatever its popularity.

**Tie-break:** a widget that adds a NEW capability (a value type or a display
role nothing covers yet) ranks above a variant of one already covered —
a switch is a checkbox with another look; the second one teaches the
builder nothing new.

## Priority list

Status: **standard** exists · **built** added with this list · **next** ·
**later** · **design** needs a design before it can be a widget.

| # | Kind | What | Libraries | U | F | V | C | Score | Status |
|---|---|---|---|---|---|---|---|---|---|
| — | `label` | static or bound text | 6 | 3 | 3 | 3 | 3 | 21 | standard |
| — | `button` | a click intent | 6 | 3 | 3 | 3 | 3 | 21 | standard |
| — | `input` | validated single-line text | 6 | 3 | 3 | 3 | 3 | 21 | standard |
| — | `pagination` | page navigation | 6 | 3 | 3 | 3 | 3 | 21 | standard |
| — | `refresher` | refresh by hand / on a timer (a product need, in no library) | 0 | 0 | 3 | 3 | 3 | 12 | standard |
| 1 | `select` | one choice from a dropdown | 6 | 3 | 3 | 3 | 3 | 21 | **built** |
| 2 | `tag` | short status text in a tone (badge, chip) | 6 | 3 | 3 | 3 | 3 | 21 | **built** |
| 3 | `checkbox` | a boolean | 6 | 3 | 3 | 2 | 3 | 20 | **built** |
| 4 | `progress` | a percentage | 6 | 3 | 3 | 2 | 3 | 20 | **built** |
| 5 | `alert` | a message with a severity | 6 | 3 | 3 | 2 | 3 | 20 | **built** |
| 6 | `switch` | a boolean, as a toggle (variant of checkbox) | 6 | 3 | 3 | 2 | 3 | 20 | next |
| 7 | `radio-group` | one visible choice (variant of select) | 6 | 3 | 3 | 2 | 3 | 20 | next |
| 8 | `segmented` | one choice as a button group — the sketch's view pills | 5 | 2.5 | 3 | 3 | 3 | 19.5 | next |
| 9 | `textarea` | multi-line text (variant of input) | 6 | 3 | 3 | 1 | 3 | 19 | next |
| 10 | `slider` | a number in a range | 6 | 3 | 3 | 1 | 3 | 19 | next |
| 11 | `multi-select` | several choices — the sketch's "Statuses" filter | 5 | 2.5 | 3 | 3 | 2 | 18.5 | **built** (on request, ahead of 6–10) |
| 12 | `autocomplete` | text with suggestions | 5 | 2.5 | 3 | 2 | 2 | 17.5 | later |
| 13 | `avatar` | a person or entity picture — the sketch's signed-in user | 5 | 2.5 | 3 | 1 | 3 | 17.5 | later |
| 14 | `spinner` | an indeterminate wait | ~6 | 3 | 2 | 1 | 3 | 17 | later |
| 15 | `skeleton` | a loading placeholder | 6 | 3 | 2 | 1 | 3 | 17 | later |
| 16 | `image` | a picture from a URL | 4 | 2 | 3 | 1 | 3 | 16 | later |
| 17 | `number-input` | a number with min / max / step | 3 | 1.5 | 3 | 2 | 3 | 15.5 | later |
| 18 | `date-picker` | a date — value format (ISO string) to decide | ~4 | 2 | 2 | 3 | 2 | 15 | later |
| 19 | `statistic` | a KPI number with a caption | 2 | 1 | 3 | 3 | 3 | 15 | later |
| 20 | `timeline` | ordered events | 4 | 2 | 3 | 1 | 2 | 15 | later |
| 21 | `rating` | stars | 4 | 2 | 3 | 0 | 3 | 15 | later |
| 22 | `color-picker` | a colour | 4 | 2 | 3 | 0 | 3 | 15 | later |
| 23 | `link` | navigation text — needs `nav/go` (doc/actions-design.md) | 4 | 2 | 2 | 1 | 3 | 14 | later |
| 24 | `divider` | a rule between content — mostly a layout concern | 6 | 3 | 1 | 0 | 3 | 14 | later |
| 25 | `descriptions` | key–value pairs | 2 | 1 | 3 | 2 | 2 | 13 | later |
| 26 | `date-range-picker` | the sketch's "Started" filter | ~3 | 1.5 | 2 | 3 | 1 | 12.5 | later |
| 27 | `time-picker` | a time of day | 3 | 1.5 | 2 | 1 | 2 | 11.5 | later |
| 28 | `empty-state` | "nothing here" | 2 | 1 | 2 | 1 | 3 | 11 | later |
| 29 | `file-upload` | files — the store holds data, not blobs; needs an upload action | 4 | 2 | 1 | 1 | 1 | 10 | design |
| — | `table` | rows from the store in columns (v1: no sorting or selection yet) | 6 | 3 | 2 | 3 | 1 | 16 | **built** (replaced the runs-only table) |
| — | tree | hierarchical data | 3 | 1.5 | 2 | 1 | 1 | 10.5 | design |
| — | dropdown menu, breadcrumb, steps | navigation | 4–6 | — | 1 | 1 | 2 | ≤ 14 | design |
| — | tooltip, popover | attach to ANOTHER widget | 6 | 3 | 1 | 1 | 2 | ≤ 14 | design |
| — | toast / notification | a transient message | 6 | 3 | 0 | 2 | 2 | 13 | design |
| — | tabs, card, accordion | contain other cells | 6 | 3 | 0 | 1–2 | 1 | ≤ 12 | design |
| — | modal / dialog, drawer | contain other cells, on demand | 6 | 3 | 0 | 1–2 | 1 | ≤ 12 | design |

### Why the tie-break picked these five

`select` and `tag` score 21. Five widgets share 20: `checkbox`, `progress` and
`alert` each add a capability nothing covers yet — a boolean input, a
numeric display, a severity message — while `switch` (boolean input, like
checkbox) and `radio-group` (single choice, like select) are variants. The
variants come next: they reuse a contract shape the builder already knows.

## The five built

All five are standard contracts (`@wirework/widget-contracts`) with antd
implementations. They are in the builder's palette, and
e2e/features/basic-widgets.feature adds and wires each one there.

- **`select`** — `value` port (string, default `""` = nothing chosen),
  optional `options` port (`[{ value, label? }]`, falling back to the
  `options` setting — dynamic options come from the store), required
  `changed { value }` (primary `value`); settings `label`, `placeholder`,
  `options`, `allowClear`. Implementations render a combobox with the label
  as its accessible name; clearing emits `""`.
- **`tag`** — optional `text` port, `text` + `tone` settings (`default`,
  `info`, `success`, `warning`, `danger`). Display only.
- **`checkbox`** — `checked` port (boolean, default `false`), required
  `changed { checked }` (primary `checked`); setting `label`. Implementations
  render role=checkbox named by the label.
- **`progress`** — `percent` port (number, default `0`; displays clamped to
  0–100), settings `label`, `tone` (`default`, `success`, `danger`),
  `showValue`. Implementations render role=progressbar named by the label.
- **`alert`** — optional `title` port (replaces the static title), settings
  `title`, `description`, `tone` (`info`, `success`, `warning`, `danger`),
  `showIcon`. Implementations render role=alert.

### Built out of order: `multi-select`

Requested directly, for filters that depend on each other.

- **Contract** — `value` port (string array, default `[]`), optional
  `options` port falling back to the `options` setting, required
  `changed { value }` carrying ALL chosen values; settings `label`,
  `placeholder`, `options`, `collapseTags`. A chosen value no longer among
  the options is shown as it is: removing it is the job of whoever changed
  the options, not the widget's.
- **Dependent filters (demo page)** — "Applications" and "Test suites". The
  suites on offer depend on the applications chosen, and that is LOGIC, so
  it is a host action, not a reaction (reactions never transform):
  Applications' `changed` runs `[{ set: "filters.applications", from:
  "value" }, { call: "filters/sync-suites" }]`. The action writes
  `filters.suiteOptions` (which Test suites binds as its `options` port)
  and drops chosen suites whose application is no longer chosen. It is
  synchronous, so both writes land inside the same pick. The catalog of
  applications and suites is host data (apps/playground/src/api).

### Built out of order: `table`

The demo's table used to be `antd-runs-table`: a DOMAIN widget written for
the runs dashboard sketch, reading only a runs-specific `{ order, byId }`
shape. A builder needs a table for any data, so it was replaced by a
generic standard kind:

- **Contract** — `rows` port (an array of objects, default `[]`), optional
  `loading` port; settings `columns` (`{ title, property }`, the property a
  dot path into the row), `rowKey` (default `"id"`), `emptyText`;
  `row-selected { key, row }` (primary `key`), not required.
- **Identity, not position** — each row is keyed by its `rowKey` property,
  so a re-fetched or re-sorted page keeps rows apart; a row without it
  falls back to its position.
- **Columns** — configured, or one per field of the first row when none
  are (so a table added in the builder shows its data at once; objects are
  shown as JSON).
- **Domain types left the contracts package** — `Run` is example data
  (`@wirework/view-data-models-examples`), and runs are a plain array in
  the store (`runs.data`).
- **Next for the table** — sorting and selection events, and data sources
  (doc/refresher-design.md).

## Not cell widgets (yet)

- **Containers** (tabs, card, accordion, modal, drawer) hold OTHER cells.
  Layout engines own placement today (flexlayout already renders tabs); a
  container widget needs nested pages or child cells — the actions design's
  `dialog/open-page` ("a wizard is a page rendered in a dialog") is the
  intended route for modal and drawer.
- **Overlays** (tooltip, popover) belong to another widget; they are a
  widget capability (e.g. a `tooltip` setting on the contracts that want
  it), not a cell.
- **Feedback** (toast, notification) is transient and triggered: an ACTION
  (`notify/show { message, tone }`), not a widget.
- **Navigation** (link, menu, breadcrumb, steps) needs page state in the
  store and `nav/go` (doc/actions-design.md, phase 2).
- **File upload**: the store holds data, not files; it needs an upload
  action and a place for results.
