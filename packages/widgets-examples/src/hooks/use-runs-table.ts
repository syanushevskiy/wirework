/** ALL dummy-runs-table logic lives here (guidelines: render-only components). */
import { useCallback, useMemo } from "react";
import type { Emit, ReadableStore, RunsData } from "@wirework/schema";
import { useStorePath } from "@wirework/react";
import type { RunsTableEvents } from "../widgets/dummy-runs-table";

export interface TableColumn {
  name: string;
  /** Dot-path into the run row ("status.state"). */
  property: string;
}

export interface TableRow {
  id: string;
  cells: { column: TableColumn; value: string }[];
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
  dataPath: string,
  fallback: RunsData,
  columns: TableColumn[],
) {
  const runs = useStorePath<RunsData>(store, dataPath) ?? fallback;

  const rows = useMemo(() => {
    const order = runs?.order ?? [];
    const result: TableRow[] = [];
    for (const id of order) {
      const row = runs?.byId?.[id];
      if (!row) continue;
      result.push({
        id,
        cells: columns.map((column) => ({
          column,
          value: readProperty(row, column.property),
        })),
      });
    }
    return result;
  }, [runs, columns]);

  const selectRow = useCallback((id: string) => emit("row-selected", { id }), [emit]);

  return { rows, selectRow };
}
