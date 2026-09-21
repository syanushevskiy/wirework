/**
 * @wirework/table-view — actions for the VIEW TABLE API (doc/tableApi/,
 * doc/table-view-design.md): a table whose columns, and the filters that go
 * with it, are DESCRIBED BY THE SERVER. A page declares only the URL (plus
 * what it wants different); the action asks the server, and the table, the
 * filter bar and the pagination bind plain store paths.
 *
 * Contract proof: depends on @wirework/schema (Store, ActionDefinition) and
 * the standard widget contracts' data shapes only — no engine, no React.
 */
export { createTableViewActions, TABLE_VIEW_LOAD } from "./actions";
export { createTableViewLoader, tableViewArgsSchema } from "./loader";
export type { TableViewArgs, TableViewLoader } from "./loader";
export { columnsOf, filtersOf, requestOf, tableViewSchema, DEFAULT_PAGE_SIZE } from "./view";
export type { TableView, TableViewQuery } from "./view";
export {
  fetchTransport,
  columnDefinitionSchema,
  tableMetadataSchema,
  tableViewResponseSchema,
} from "./api";
export type {
  ColumnDefinition,
  SortDirection,
  TableMetadata,
  TableViewRequest,
  TableViewResponse,
  TableViewTransport,
} from "./api";
