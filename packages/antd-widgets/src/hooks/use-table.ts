/**
 * ALL antd-table logic lives here (guidelines: render-only components) —
 * the antd Table configuration out of what the tables share
 * (use-table-rows.ts): the columns, one row per record keyed by its
 * `rowKey` property, each cell as its column's `cell` says, and the row
 * props that turn a click into an intent. A column's `filter` and
 * `sortable` are not offered here: that is the infinite table's job.
 */
import { useMemo } from "react";
import type { TableColumnsType, TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type { TableColumn, TableRow } from "@wirework/widget-contracts";
import type { TableEvents } from "../widgets/antd-table";
import type { TableCellRenderers } from "./use-table-cell";
import {
  NO_CELLS,
  NO_ROWS,
  antdColumnOf,
  useRenderedRows,
  useRowProps,
  useTableColumns,
  type RenderedRow,
} from "./use-table-rows";

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
}

export function useTable(
  store: ReadableStore,
  emit: Emit<TableEvents>,
  paths: { rows: string; loading?: string | undefined; columns?: string | undefined },
  ports: {
    rows: PortDefinition<TableRow[]>;
    loading: PortDefinition<boolean>;
    columns: PortDefinition<TableColumn[]>;
  },
  settings: { columns: TableColumn[]; rowKey: string },
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

  const tableColumns = useMemo<TableColumnsType<RenderedRow>>(
    () => columns.map((column, index) => antdColumnOf(column, index, cells)),
    [columns, cells],
  );

  const rowProps = useRowProps(emit);

  return { columns: tableColumns, rows: renderedRows, loading, rowProps };
}
