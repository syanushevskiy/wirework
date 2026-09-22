/**
 * ALL antd-table logic lives here (guidelines: render-only components) —
 * including the antd Table configuration: the columns (configured, or one
 * per field of the first row), one row per record keyed by its `rowKey`
 * property, each cell as its column's `cell` says (TableCell), and the row
 * props that turn a click into an intent: `row-selected` for the row, or
 * `link-clicked` for a plain click on a link cell — the ONE place a click
 * is decided, so a renderer the host registered needs nothing of its own:
 * interactive content inside a cell (a link, a button, a form control)
 * OWNS its click and never selects the row.
 */
import { createElement, useCallback, useMemo, type MouseEvent, type TdHTMLAttributes } from "react";
import type { TableProps } from "antd";
import { getPath, type Emit, type PortDefinition, type ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import { appPathSchema, type TableColumn, type TableRow } from "@wirework/widget-contracts";
import type { TableEvents } from "../widgets/antd-table";
import { TableCell } from "../widgets/table-cells";
import type { TableCellRenderers } from "./use-table-cell";

/** One rendered row: its identity and the record. */
export interface RenderedRow {
  key: string;
  row: TableRow;
}

const NO_ROWS: TableRow[] = [];
export const NO_CELLS: TableCellRenderers = {};

/** Content inside a cell that owns its clicks: the row must not react to them. */
const INTERACTIVE = "a[href], button, input, select, textarea, [role='button']";

/** The row's own key, or its position when it has none (not stable — configure rowKey). */
function keyOf(row: TableRow, rowKey: string, index: number): string {
  const key = getPath(row, rowKey);
  return key === undefined || key === null || key === "" ? String(index) : String(key);
}

/**
 * What a click on a row landed on: the ROW itself, some interactive CONTROL
 * inside a cell (its own business), or a LINK — with its address, the
 * cell's property, and whether the page should follow it: a plain left
 * click on an address of the application. Anything else on a link (a
 * modifier, the middle button, another origin) is left to the browser.
 */
type Clicked =
  | { on: "row" }
  | { on: "control" }
  | { on: "link"; href: string; property: string; follow: boolean };

function clicked(event: MouseEvent<HTMLElement>): Clicked {
  const control = (event.target as Element).closest(INTERACTIVE);
  if (control === null || !event.currentTarget.contains(control)) return { on: "row" };
  if (!control.matches("a[href]")) return { on: "control" };
  const href = control.getAttribute("href") ?? "";
  const property = control.closest("[data-property]")?.getAttribute("data-property") ?? "";
  const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  return { on: "link", href, property, follow: plain && appPathSchema.safeParse(href).success };
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
  cells: TableCellRenderers = NO_CELLS,
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
    () => rows.map((row, index) => ({ key: keyOf(row, settings.rowKey, index), row })),
    [rows, settings.rowKey],
  );

  const tableColumns = useMemo<TableProps<RenderedRow>["columns"]>(
    () =>
      columns.map((column, index) => ({
        key: `${index}:${column.property}`,
        title: column.title,
        render: (_, rendered) =>
          createElement(TableCell, { column, row: rendered.row, value: getPath(rendered.row, column.property), cells }),
        onCell: () =>
          ({ "data-property": column.property, "data-cell": column.cell?.kind ?? "text" }) as TdHTMLAttributes<HTMLElement>,
      })),
    [columns, cells],
  );

  const rowProps = useCallback<NonNullable<TableProps<RenderedRow>["onRow"]>>(
    (rendered) => ({
      "data-testid": "table-row",
      "data-row-key": rendered.key,
      onClick: (event) => {
        const target = clicked(event);
        if (target.on === "row") {
          emit("row-selected", { key: rendered.key, row: rendered.row });
        } else if (target.on === "link" && target.follow) {
          event.preventDefault();
          emit("link-clicked", { href: target.href, key: rendered.key, property: target.property, row: rendered.row });
        }
      },
    }),
    [emit],
  );

  return { columns: tableColumns, rows: renderedRows, loading, rowProps };
}
