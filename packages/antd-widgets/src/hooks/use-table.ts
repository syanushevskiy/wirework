/**
 * ALL antd-table logic lives here (guidelines: render-only components) —
 * including the antd Table configuration: the columns (configured, or one
 * per field of the first row), one row per record keyed by its `rowKey`
 * property, the cell text, and the row props that turn a click into the
 * `row-selected` intent.
 */
import { useCallback, useMemo, type TdHTMLAttributes } from "react";
import type { TableProps } from "antd";
import { getPath, type Emit, type PortDefinition, type ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type { TableColumn, TableRow } from "@wirework/widget-contracts";
import type { TableEvents } from "../widgets/antd-table";

/** One rendered row: its identity, the record, and a text per column. */
export interface RenderedRow {
  key: string;
  row: TableRow;
  values: string[];
}

const NO_ROWS: TableRow[] = [];

/** A cell as text: nothing for null/undefined, JSON for objects, the value otherwise. */
function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** The row's own key, or its position when it has none (not stable — configure rowKey). */
function keyOf(row: TableRow, rowKey: string, index: number): string {
  const key = getPath(row, rowKey);
  return key === undefined || key === null || key === "" ? String(index) : String(key);
}

export function useTable(
  store: ReadableStore,
  emit: Emit<TableEvents>,
  paths: { rows: string; loading?: string; columns?: string },
  ports: {
    rows: PortDefinition<TableRow[]>;
    loading: PortDefinition<boolean>;
    columns: PortDefinition<TableColumn[]>;
  },
  settings: { columns: TableColumn[]; rowKey: string },
) {
  // The table appeared: `load`, once — the reaction calls whatever fetches its
  // data. After the mount, so the page has bound its reactions (useAfterMount).
  useAfterMount(() => emit("load", {}));

  // Validated by the contract's ports: a malformed value shows no rows, never a crash.
  const rows = usePort(store, paths.rows, ports.rows) ?? NO_ROWS;
  const loading = usePort(store, paths.loading, ports.loading) === true;
  // A bound columns port wins (a table the server describes); a missing,
  // empty or malformed one shows the setting's.
  const boundColumns = usePort(store, paths.columns, ports.columns);
  const configured = boundColumns !== undefined && boundColumns.length > 0 ? boundColumns : settings.columns;

  // Without any columns, the first row's fields — recomputed only when those change.
  const firstRowFields = Object.keys(rows[0] ?? {}).join("\n");
  const columns = useMemo<TableColumn[]>(
    () =>
      configured.length > 0
        ? configured
        : firstRowFields.split("\n").filter(Boolean).map((field) => ({ title: field, property: field })),
    [configured, firstRowFields],
  );

  const renderedRows = useMemo<RenderedRow[]>(
    () =>
      rows.map((row, index) => ({
        key: keyOf(row, settings.rowKey, index),
        row,
        values: columns.map((column) => cellText(getPath(row, column.property))),
      })),
    [rows, columns, settings.rowKey],
  );

  const tableColumns = useMemo<TableProps<RenderedRow>["columns"]>(
    () =>
      columns.map((column, index) => ({
        key: `${index}:${column.property}`,
        title: column.title,
        render: (_, rendered) => rendered.values[index],
        onCell: () => ({ "data-property": column.property }) as TdHTMLAttributes<HTMLElement>,
      })),
    [columns],
  );

  const rowProps = useCallback<NonNullable<TableProps<RenderedRow>["onRow"]>>(
    (rendered) => ({
      "data-testid": "table-row",
      "data-row-key": rendered.key,
      onClick: () => emit("row-selected", { key: rendered.key, row: rendered.row }),
    }),
    [emit],
  );

  return { columns: tableColumns, rows: renderedRows, loading, rowProps };
}
