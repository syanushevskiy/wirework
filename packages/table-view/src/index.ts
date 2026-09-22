/**
 * @wirework/table-view — actions for the VIEW TABLE API (examples in
 * doc/tableApi/): a table whose columns, and the filters that go with it,
 * are DESCRIBED BY THE SERVER. A page declares only the URL (plus what it
 * wants different); the action asks the server, and the table, the filter
 * bar and the pagination bind plain store paths.
 *
 * Customizing such a table has levels, from nothing to code:
 *  0. automatic — order, headers and hidden columns from the metadata;
 *  1. predefined cell kinds, no code — `columns.<id>.cell` in the load
 *     call: `text`, `tag { tones }`, `link { to }` (table-cell.ts in
 *     @wirework/widget-contracts holds the kinds and the admission rule:
 *     literals and row-property selections only, never logic);
 *  2. a renderer the host registers by name (`createAntdTable({ cells })`
 *     in @wirework/antd-widgets), selected with `cell: { kind: "custom",
 *     name }` — a page picks the name, never what it renders;
 *  3. the host's own table implementing the `table` contract.
 * The server describes DATA, never looks: nothing in the metadata chooses a
 * cell kind.
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
