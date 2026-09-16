/**
 * ALL antd-runs-table logic lives here (guidelines: render-only
 * components) — including the antd Table configuration: one column per
 * view-model column (the cell keeps `data-property` so a page can be
 * asserted on), one row per run keyed by its stable id, and the row props
 * that turn a click into the `row-selected` intent.
 */
import { useCallback, useMemo, type TdHTMLAttributes } from "react";
import type { TableProps } from "antd";
import type { Emit, ReadableStore, RunsData } from "@wirework/schema";
import { useStorePath } from "@wirework/react";
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

function readProperty(row: unknown, property: string): string {
  let current: unknown = row;
  for (const segment of property.split(".")) {
    // Own properties only — never the prototype chain.
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, segment)) return "";
    current = (current as Record<string, unknown>)[segment];
  }
  return current === undefined || current === null ? "" : String(current);
}

export function useRunsTable(
  store: ReadableStore,
  emit: Emit<RunsTableEvents>,
  paths: { data: string; loading?: string },
  defaults: { data: RunsData; loading: boolean },
  columns: TableColumn[],
) {
  const runs = useStorePath<RunsData>(store, paths.data) ?? defaults.data;
  // Optional port; a live value is not validated, so only `true` spins.
  const loading = (useStorePath<unknown>(store, paths.loading) ?? defaults.loading) === true;

  const rows = useMemo(() => {
    const order = runs?.order ?? [];
    const result: TableRow[] = [];
    for (const id of order) {
      const row = runs?.byId?.[id];
      if (!row) continue;
      result.push({ key: id, id, values: columns.map((column) => readProperty(row, column.property)) });
    }
    return result;
  }, [runs, columns]);

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
