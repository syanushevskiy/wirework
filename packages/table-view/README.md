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
holds a slice: its `window` reaction stores the offset it asks for at
`<into>.wanted` and says `with: { into: "runs", window: true }` — the
`pageSize` rows from there REPLACE the ones held, and `<into>.offset` says
where they begin. The transport is
the host's: `fetchTransport` POSTs JSON; pass your own to add headers, auth
or a fake server.

What the loader writes under `<into>`: `view`, `columns` (each column saying
what its header can `filter` by — the server's values, or free text where it
calls the column filterable without values — and whether it is `sortable`),
`filters` (the filter bar's), `data`, `total`, `offset`, `loading`, `error`.
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
