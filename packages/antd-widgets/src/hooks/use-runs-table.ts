/**
 * ALL antd-runs-table logic lives here (guidelines: render-only
 * components) — including the antd Table configuration: one column per
 * view-model column (the cell keeps `data-property` so a page can be
 * asserted on), one row per run keyed by its stable id, and the row props
 * that turn a click into the `row-selected` intent.
 */
import { useCallback, useMemo, type TdHTMLAttributes } from "react";
import type { TableProps } from "antd";
import { getPath, type Emit, type PortDefinition, type ReadableStore, type Run, type RunsData } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { RunsTableEvents } from "../widgets/antd-runs-table";

export interface TableColumn {
  name: string;
  /** Dot-path into the run row ("status.state"). */
  property: string;
}

export interface TableRow {
  /** antd row key. */
  key: string;
  id: string;
  /** One rendered value per view-model column, in order. */
  values: string[];
}

/** A column's value as text; own properties only (the shared path rules). */
const readProperty = (row: Run, property: string): string => String(getPath(row, property) ?? "");

/** The runs in display order; an id without a row is skipped. */
const orderedRuns = ({ order, byId }: RunsData): Run[] => order.flatMap((id) => byId[id] ?? []);

export function useRunsTable(
  store: ReadableStore,
  emit: Emit<RunsTableEvents>,
  paths: { data: string; loading?: string },
  ports: { data: PortDefinition<RunsData>; loading: PortDefinition<boolean> },
  columns: TableColumn[],
) {
  // Validated by the ports: a malformed value shows the port's default
  // (no rows) instead of crashing the table.
  const runs = usePort(store, paths.data, ports.data);
  const loading = usePort(store, paths.loading, ports.loading) === true;

  const rows = useMemo<TableRow[]>(
    () =>
      orderedRuns(runs ?? { order: [], byId: {} }).map((run) => ({
        key: run.id,
        id: run.id,
        values: columns.map((column) => readProperty(run, column.property)),
      })),
    [runs, columns],
  );

  const tableColumns = useMemo<TableProps<TableRow>["columns"]>(
    () =>
      columns.map((column, index) => ({
        key: `${column.name}:${column.property}`,
        title: column.name,
        render: (_, row) => row.values[index],
        onCell: () => ({ "data-property": column.property }) as TdHTMLAttributes<HTMLElement>,
      })),
    [columns],
  );

  const rowProps = useCallback<NonNullable<TableProps<TableRow>["onRow"]>>(
    (row) => ({
      "data-testid": "runs-row",
      "data-run-id": row.id,
      onClick: () => emit("row-selected", { id: row.id }),
    }),
    [emit],
  );

  return { columns: tableColumns, rows, loading, rowProps };
}
