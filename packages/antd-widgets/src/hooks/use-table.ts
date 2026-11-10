/**
 * ALL antd-table logic lives here (guidelines: render-only components) —
 * the antd Table configuration out of what the tables share
 * (use-table-rows.ts, use-table-headers.ts): the columns, one row per
 * record keyed by its `rowKey` property, each cell as its column's `cell`
 * says, the row props that turn a click into an intent, and — with the
 * `headerFilters` setting on — each column's filter and sorting in its
 * header.
 */
import type { TableColumnsType, TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type { ColumnOrder, FilterValues, SearchValues, TableColumn, TableRow } from "@wirework/widget-contracts";
import type { TableEvents } from "../widgets/antd-table";
import type { TableCellRenderers } from "./use-table-cell";
import { useTableHeaders } from "./use-table-headers";
import { NO_CELLS, NO_ROWS, useRenderedRows, useRowProps, useTableColumns, type RenderedRow } from "./use-table-rows";

export type { RenderedRow } from "./use-table-rows";
export { NO_CELLS } from "./use-table-rows";

/**
 * What the antd Table is given. Named, not inferred: a declaration file
 * must refer to antd's public `TableProps`, never to the internal package
 * antd builds it from.
 */
export interface TableView {
  columns: TableColumnsType<RenderedRow>;
  rows: RenderedRow[];
  loading: boolean;
  rowProps: NonNullable<TableProps<RenderedRow>["onRow"]>;
  /** antd's one callback for header filters and sorting. */
  change: NonNullable<TableProps<RenderedRow>["onChange"]>;
}

/** The store paths every table kind reads. */
export interface TablePaths {
  rows: string;
  loading?: string | undefined;
  columns?: string | undefined;
  filterIn?: string | undefined;
  filterLike?: string | undefined;
  orderBy?: string | undefined;
}

/** The ports every table kind reads them through. */
export interface TablePorts {
  rows: PortDefinition<TableRow[]>;
  loading: PortDefinition<boolean>;
  columns: PortDefinition<TableColumn[]>;
  filterIn: PortDefinition<FilterValues>;
  filterLike: PortDefinition<SearchValues>;
  orderBy: PortDefinition<ColumnOrder>;
}

/** The settings every table kind has. */
export interface TableSettings {
  columns: TableColumn[];
  rowKey: string;
  headerFilters: boolean;
  filterRow: boolean;
}

export function useTable(
  store: ReadableStore,
  emit: Emit<TableEvents>,
  paths: TablePaths,
  ports: TablePorts,
  settings: TableSettings,
  cells: TableCellRenderers = NO_CELLS,
): TableView {
  // The table appeared: `load`, once — the reaction calls whatever fetches its
  // data. After the mount, so the page has bound its reactions (useAfterMount).
  useAfterMount(() => emit("load", {}));

  // Validated by the contract's ports: a malformed value shows no rows, never a crash.
  const rows = usePort(store, paths.rows, ports.rows) ?? NO_ROWS;
  const loading = usePort(store, paths.loading, ports.loading) === true;
  const columns = useTableColumns(store, paths.columns, ports.columns, settings.columns, rows);
  const renderedRows = useRenderedRows(rows, settings.rowKey);
  const headers = useTableHeaders(
    store,
    emit,
    paths,
    ports,
    columns,
    cells,
    settings.headerFilters,
    settings.filterRow,
  );
  const rowProps = useRowProps(emit);

  return { columns: headers.columns, rows: renderedRows, loading, rowProps, change: headers.change };
}
