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
names the view: `with: { into: "runs" }`. The transport is the host's:
`fetchTransport` POSTs JSON; pass your own to add headers, auth or a fake
server.

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
