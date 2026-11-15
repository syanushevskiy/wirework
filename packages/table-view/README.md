# @wirework/table-view

Actions for a table the SERVER describes — the view table API: one POST
endpoint whose first answer (`metadata: true`) carries the columns, which of
them are hidden and the values some can be filtered by, along with the rows
and the count. A page declares only the URL and what it wants different
(a column hidden or renamed, a cell kind, a filter dropped or given its own
values); the action asks the server and writes everything to fixed places
under one store root, which the table, the filter bar and the pagination
bind as plain paths.

```ts
import { createTableViewActions, fetchTransport } from "@wirework/table-view";
for (const action of createTableViewActions({ transport: fetchTransport })) actions.register(action);
```

Then, in a page's view models, the table's own `load` reaction:

```ts
on: {
  load: [{ call: "table-view/load", with: { url: "/api/v1/view/runs", into: "runs" } }];
}
```

Every other reaction of the page (a page change, a filter, a refresh) only
names the view: `with: { into: "runs" }`. An INFINITE list appends instead
of paging: its `more` reaction says `with: { into: "runs", more: true }` and
the rows after the ones held are added to `<into>.data`. A WINDOWED list
holds a slice: its `window` reaction stores what it asks for at
`<into>.wanted` (`{ set: "runs.wanted" }`, the event's whole payload
`{ offset, edge }`) and says `with: { into: "runs", window: true }` — the
batch `after` the rows held or the one `before` them JOINS them (asked for
ahead of time, so the list scrolls into rows already there; at most three
batches are kept, `KEEP_BATCHES`), a slice `around` a row REPLACES them, and
`<into>.offset` says where the rows held begin (`slicePlan`, `joinedSlice`).
The transport is
the host's: `fetchTransport` POSTs JSON; pass your own to add headers, auth
or a fake server.

What the loader writes under `<into>`: `view`, `columns` (each column saying
what its header can `filter` by — a period of dates for a column whose `type`
is a date or a timestamp (by default; `isDateType`), the server's values, or
free text where it calls the column filterable without values — and whether
it is `sortable`),
`filters` (the filter bar's), `data`, `total`, `hasMore`, `offset`,
`loading`, `error`.

A LIST NOBODY COUNTS: `countRows: false` in the declaration sends
`totalRecords: false` — for a long list a server counts more slowly than it
reads a page. For every answer without `totalRecords` (asked so, or a server
that does not count anyway) `<into>.total` is the rows KNOWN to be there so
far — a high-water mark, kept when a windowed list drops far rows — and
`<into>.hasMore` is true until an answer brings fewer rows than were asked
for: the end, from where the total is exact (a list ending on a full batch
is found out by the empty one after it). Other filters, and a load that is
neither `more` nor `window`, start over. Bind the `hasMore` port of the
infinite table and the list position to it.
What it reads there, written by the widgets' reactions: `page`, `pageSize`,
`wanted`, `filterIn`, `filterLike`, `filterBetween`, `orderBy`.

## Exports

- `createTableViewActions({ transport })`, `TABLE_VIEW_LOAD` (the action's
  name) — the actions a host registers.
- `createTableViewLoader` (`TableViewLoader`), `tableViewArgsSchema`
  (`TableViewArgs`) — the loader behind the action: one request in flight
  per view, a newer one aborting the older.
- `columnsOf`, `filtersOf`, `requestOf`, `tableViewSchema` (`TableView`,
  `TableViewQuery`), `DEFAULT_PAGE_SIZE` — the pure derivations, for tests
  and for hosts that describe tables themselves.
- `fetchTransport` (`TableViewTransport`), `tableViewResponseSchema`,
  `tableMetadataSchema`, `columnDefinitionSchema` (`TableViewRequest`,
  `TableViewResponse`, `TableMetadata`, `ColumnDefinition`,
  `SortDirection`) — the API as the server speaks it; `doc/tableApi/` holds
  example requests and answers the tests read.
