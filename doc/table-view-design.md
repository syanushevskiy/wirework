# Table view — a table the server describes

| Part | Status |
|---|---|
| `@wirework/table-view`: `table-view/load`, the loader, the pure derivations | built |
| `table` contract: optional `columns` port | built |
| `filter-bar` contract and `antd-filter-bar` | built |
| Demo: the runs list is a table view (`/api/v1/view/runs`, fake server) | built |
| The table's `load` event: the first request needs no click and no host code | built |
| The action's parameters in the builder (`params`, `actions-design.md`) | built |
| Cells: predefined kinds (`text`, `tag`, `link`) selected per column; `link-clicked` + `nav/follow` | built |
| Cells the host renders by name (`createAntdTable({ cells })`, `cell: { kind: "custom", name }`) | built |
| Sorting from the table header (`orderBy`, `isSortable`) | not built |
| Other filter groups in the UI (`filterLike`, `filterBetween`, …) | not built — declared only |
| Cell defaults from the server's column `type` (boolean, timestamp, numeric) | not built — deferred, additive |
| A column editor in the builder (hide, title, cell kind per server column) | not built — `builder-user-needs.md`, W7 |

## The API (`doc/tableApi/`)

One POST endpoint per table. The request says which rows and what else the
answer should carry:

```json
{ "dataFilter": { "filterBetween": {}, "filterEqual": {}, "filterIn": { "state": ["RUNNING"] },
                  "filterLike": {}, "filterTimeDiffGt": {}, "limit": 50, "offset": 0,
                  "orderBy": { "job_id": "DESC" } },
  "metadata": true, "totalRecords": true }
```

The answer may carry, together or apart: `metadata` (the
`columnDefinitions` — `id`, `headerName`, `type`, `isHidden`,
`isFilterable`, `isSortable`, and `filterValues`, the values a column can be
filtered by — plus `enableFilter` / `enableSorting`), `totalRecords`, and
`data` (flat rows keyed by column id). Servers leave fields out or send
`null`; only a column's `id` is required.

## What a page writes

The URL is all the action needs — and the natural place for it is the
TABLE's own `load` reaction, fired once when the table appears
(`widget-events-design.md`, "Page events and load events"):

```ts
table: { default: {
  inputs: { rows: "runs.data", loading: "runs.loading", columns: "runs.columns" },
  on: { load: [{ call: "table-view/load", with: { url: "/api/v1/view/runs", into: "runs" } }] } } }
```

Next to it, what THIS page wants different from the server's description:

```ts
with: {
  url: "/api/v1/view/runs",
  into: "runs",                         // the store root of this table view
  metadata: true,                       // the request's flag, for THIS call (see below)
  pageSize: 5,                          // until <into>.pageSize says otherwise
  columns: { inbound: { hidden: true }, // hide a column the server shows…
             message: { hidden: false },// …show one the server hides…
             state:   { title: "Result",           // …rename one…
                        cell: { kind: "tag", tones: { Success: "success", Failed: "danger" } } },
                                        // …show its cells as tags (see "Customizing a table")
             id:      { cell: { kind: "link", to: "/demo/runs/{id}" } } },   // …or as links
  filters: { inbound: false,            // no filter for it, whatever the server offers
             name: { label: "Suite", values: ["Nightly regression", "Smoke suite"] } },
                                        // other values — also where the server offers none
  request: { filterIn: { state: ["RUNNING", "STOPPING"] }, orderBy: { job_id: "DESC" } },
                                        // sent with EVERY request: what this table is about
}
```

The call that has the `url` DECLARES the view. Every other reaction only
NAMES it — `with: { into: "runs" }` — and re-requests it, so the URL and the
changes are written once, not in every reaction that refreshes. Unknown
arguments are an error (a typo must not pass silently).

**The `metadata` flag** is an argument of the CALL, not part of the declared
view (it is not kept at `<into>.view`): `true` sends `metadata: true` — the
server describes the table, and columns and filters are derived (again) by
the view's own changes; `false` sends `metadata: false` — rows only, and a
table nothing describes shows one column per field of the first row (or its
own `columns` setting). Left out, the action decides: it asks when the call
declares the view, or while no columns are known — so "only a URL" works,
and a plain re-request asks for rows only. In the builder it is a checkbox
with those three answers: a dash for "not set", then yes, then no.

## Where everything lives (fixed places under `<into>`)

| Path | What | Bound by |
|---|---|---|
| `<into>.view` | the declaration (url and changes) | — (inspection) |
| `<into>.columns` | `[{ title, property, cell? }]` | table `columns` port |
| `<into>.filters` | `[{ id, label, options }]` | filter bar `filters` port |
| `<into>.data` | the rows | table `rows` port |
| `<into>.total` | all rows on the server | pagination `total` port |
| `<into>.loading` | a request is in flight | table `loading`, refresher `busy` |
| `<into>.error` | what failed (the last good rows stay) | a label |
| `<into>.page`, `.pageSize` | what the user asked for → `limit` / `offset` | pagination (written by its reaction) |
| `<into>.filterIn` | chosen in the filter bar → `dataFilter.filterIn` | filter bar `value` port |
| `<into>.orderBy` | → `dataFilter.orderBy` (no widget writes it yet) | — |

The widgets are the ordinary ones. The table never fetches and knows
nothing about the API: its columns simply became a store path, like its
rows. The filter bar is a new standard kind for filters that are DATA — a
page cannot lay out cells for filters it does not know.

```ts
filterBar: { default: {
  inputs: { filters: "runs.filters", value: "runs.filterIn" },
  on: { changed: [ { set: "runs.filterIn", from: "value" },
                   { set: "runs.page", value: 1 },
                   { call: "table-view/load", with: { into: "runs" } } ] } } },
table:     { default: { inputs: { rows: "runs.data", loading: "runs.loading", columns: "runs.columns" } } },
```

## Rules

- **Derivation is code.** `columnsOf`, `filtersOf` and `requestOf` are pure
  functions, unit-tested against the API's own examples; configuration only
  selects (hide, rename, other values, a cell kind).
- **The server describes data, never looks.** How a column's cells are
  shown is the page's word alone (`columns.<id>.cell`), passed through by
  `columnsOf`; nothing in the metadata chooses a cell kind (defaults from
  the column `type` are a deferred, additive step).
- **Filters.** A column becomes a filter when the server gives it
  `filterValues` and neither the column (`isFilterable: false`) nor the
  table (`enableFilter: false`) forbids it. `null` among the values ("rows
  without a value") is not offered; values become text. What the user
  chooses for a column REPLACES the declaration's `request.filterIn` for
  that column.
- **Latest request wins** per store and view; on failure the last good rows
  stay and `<into>.error` says what failed.
- **A page behind the last one** (a filter shrank the table) is re-requested
  once as the last page there is.
- **Transport is the host's.** `createTableViewActions({ transport })`:
  `fetchTransport` POSTs JSON; the playground passes an in-memory fake
  (`apps/playground/src/api/transport.ts`) — pages and actions are the same.

## The first load

The table asks for its data itself: the `table` contract emits `load` once
when the table appears, and the table's template declares the view in that
reaction (above). No host code knows the URL, and nothing needs a click.
(An earlier version let the HOST run declared "open reactions"; the table's
event replaced it, and pages got a `load` event of their own for what
belongs to the page rather than to one table.)

What the host still does before that, in code, is what only the application
knows: the playground seeds `runs.pageSize` and the refresher's schedule
from the user's settings when the runs page opens.

## Customizing a table — the ladder

The columns arrive at runtime, so "customizing the table" is not editing a
column list: it is saying, per server column id, what should be DIFFERENT
— and that has levels, from nothing to code. Team decision (Team Tiger,
2026-09-22); the guardrails are in "Rules" below and in
`builder-user-needs.md` ("Rule conflicts", W8).

| Level | What | Who | Where | What the edit view can change |
|---|---|---|---|---|
| 0 automatic | order, headers, hidden columns — from the server's metadata | nobody | — | nothing |
| 1 predefined kinds | `text`; `tag` with `tones` (value → tone, exact match, `default` on a miss); `link` with `to` (an address pattern whose `{property}` slots select row values, URL-encoded) | the page author, no code and no deploy | the `columns` JSON of the `table-view/load` reaction (or a static table's `columns` setting) | nothing on a server-described table (`with` is never in the user overlay); a static table's `columns` setting, all of it |
| 2 a renderer the host registers | `cell: { kind: "custom", name, params? }` | a developer writes the component and the host registers it at boot: `createAntdWidgets({ tableCells: { "run-status": RunStatusCell } })`; the author selects the name | host code + the same `cell` field | the name and its `params` — never what it renders |
| 3 the host's own table | `implementContract(tableContract, { type: "runs-table", … })` | a developer | the host, as `status-badge` does | — |

A renderer (`TableCellProps`) gets `value`, `text`, `row`, `column` and
`params` — no store, no `emit`: it shows the row's data. A plain click on
any `<a href="/…">` it renders is the table's `link-clicked` like a link
cell's (the row decides clicks, once). A name nobody registered shows the
text and marks the cell (`data-cell-problem`), with one console warning —
the name cannot be checked at boot, since columns arrive at runtime.

**The kind-admission rule.** A predefined kind's configuration holds
literals and row-property selections only: no conditionals, comparisons,
regexes, ranges, case folding, pipes, defaults or format logic — ever. A
cell that needs two properties or a condition is level 2. `to` is not a
template language: slots select, `encodeURIComponent` is the only
processing, and the address must be the application's (one leading `/`,
never another origin — `appPathSchema`, also what `nav/go` accepts).

**Links and clicks.** A link cell is a real anchor, so a modifier or middle
click opens a new tab and the address can be copied; a plain left click is
turned into `link-clicked { href, key, property, row }` (never
`row-selected`), and the page's reaction `{ call: "nav/follow" }` goes
there. Without that reaction the link is inert on a plain click — the
demo's table template has it; a builder hint for a link column without one
is a follow-up. A slot with no value renders plain text, not a broken link.

In the demo (`widgets.runs.table` in the fixtures) the `#` and Name cells
link to `/demo/runs/{id}` and Status is a tag per state — level 1. The
playground also registers one level-2 renderer, `run-status` (the state as
a tag with the run's message in a tooltip — two row properties, which no
predefined kind offers), shown in Storybook (`antd-table` → CustomCell) and
in `e2e/features/table-cells.feature`.

## In the builder

`table-view/load` declares its parameters (`params`), so the builder asks
for them when the action is picked for an event: `url`, `into` and
`pageSize` as fields, `columns`, `filters` and `request` as JSON. `into` is
required — Add waits for it, and a `with` that does not fit is a problem of
the cell, not an error in the console at the first click.

1. Add a **table**. Its ports come suggested as `builder.table.data`,
   `builder.table.columns` and `builder.table.loading` — exactly where a
   table view writes (the `rows` port declares `suggestedName: "data"` for
   that; a port's name and the place loaders use need not be the same word).
   So for its `load` event call `table-view/load` with the `url` and
   `into: builder.table`: nothing is retyped, and the table loads as soon
   as it is added.
2. Add a **refresher** to re-request: `refresh` → call `table-view/load`
   with `into: builder.table` only; bind `busy` to `builder.table.loading`.
3. Change the table's load reaction later (Edit page → the table → another
   page size, a hidden column, the metadata flag) and **Save page**: the
   page loads again, so the table asks again by what was just saved. The
   same happens after every Add (`widget-events-design.md`, "Loading again").

Limits today: the form edits the FIRST reaction of an event, so a filter
bar added in the builder can store its choice but not also re-request
(`builder-user-needs.md`, W14) — Refresh does it.

## Relation to data sources (`refresher-design.md`)

That design names sources in `viewModels.sources` and refreshes them with
`source/refresh`. A table view is the same idea for one API: named by
`into`, results at fixed places, one generic action, the URL written once.
When sources are built, `table-view` becomes a source KIND and
`table-view/load` its adapter; the pages' bindings do not change.
