/**
 * What the two antd tables (antd-table, antd-infinite-table) SHARE: the
 * columns (bound, configured, or one per field of the first row), one row
 * per record keyed by its `rowKey` property, each cell as its column's
 * `cell` says (TableCell), and the row props that turn a click into an
 * intent: `row-selected` for the row, or `link-clicked` for a plain click
 * on a link cell — the ONE place a click is decided, so a renderer the host
 * registered needs nothing of its own: interactive content inside a cell
 * (a link, a button, a form control) OWNS its click and never selects the
 * row. Hooks and pure helpers; each table's own hook composes them.
 */
import { createElement, useCallback, useMemo, type MouseEvent, type TdHTMLAttributes } from "react";
import type { TableColumnType, TableProps } from "antd";
import { getPath, type Emit, type PortDefinition, type ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import { appPathSchema, type tableEvents, type TableColumn, type TableRow } from "@wirework/widget-contracts";
import { TableCell } from "../widgets/table-cells";
import type { TableCellRenderers } from "./use-table-cell";

/** One rendered row: its identity and the record. */
export interface RenderedRow {
  key: string;
  row: TableRow;
}

/** The events a row emits — the part of every table kind's events a row click decides. */
export type RowEvents = Pick<typeof tableEvents, "row-selected" | "link-clicked">;

export const NO_ROWS: TableRow[] = [];
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
type Clicked = { on: "row" } | { on: "control" } | { on: "link"; href: string; property: string; follow: boolean };

function clicked(event: MouseEvent<HTMLElement>): Clicked {
  const control = (event.target as Element).closest(INTERACTIVE);
  if (control === null || !event.currentTarget.contains(control)) return { on: "row" };
  if (!control.matches("a[href]")) return { on: "control" };
  const href = control.getAttribute("href") ?? "";
  const property = control.closest("[data-property]")?.getAttribute("data-property") ?? "";
  const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  return { on: "link", href, property, follow: plain && appPathSchema.safeParse(href).success };
}

/**
 * The columns a table shows: a bound columns port wins (a table the server
 * describes); a missing, empty or malformed one shows the setting's; without
 * any, one per field of the first row — recomputed only when those change.
 */
export function useTableColumns(
  store: ReadableStore,
  path: string | undefined,
  port: PortDefinition<TableColumn[]>,
  configured: TableColumn[],
  rows: TableRow[],
): TableColumn[] {
  const bound = usePort(store, path, port);
  const chosen = bound !== undefined && bound.length > 0 ? bound : configured;
  const firstRowFields = Object.keys(rows[0] ?? {}).join("\n");
  return useMemo<TableColumn[]>(
    () =>
      chosen.length > 0
        ? chosen
        : firstRowFields
            .split("\n")
            .filter(Boolean)
            .map((field) => ({ title: field, property: field })),
    [chosen, firstRowFields],
  );
}

/** One rendered row per record, keyed by its `rowKey` property. */
export function useRenderedRows(rows: TableRow[], rowKey: string): RenderedRow[] {
  return useMemo<RenderedRow[]>(
    () => rows.map((row, index) => ({ key: keyOf(row, rowKey, index), row })),
    [rows, rowKey],
  );
}

/** What every antd column of a table has: its key, header, cells and the cell's data attributes. */
export function antdColumnOf(
  column: TableColumn,
  index: number,
  cells: TableCellRenderers,
): TableColumnType<RenderedRow> & { key: string } {
  return {
    key: `${index}:${column.property}`,
    title: column.title,
    render: (_, rendered) =>
      createElement(TableCell, { column, row: rendered.row, value: getPath(rendered.row, column.property), cells }),
    onCell: () =>
      ({
        "data-property": column.property,
        "data-cell": column.cell?.kind ?? "text",
      }) as TdHTMLAttributes<HTMLElement>,
  };
}

/** The row props: identity for tests, keyboard reach, and the click decided in one place. */
export function useRowProps(emit: Emit<RowEvents>): NonNullable<TableProps<RenderedRow>["onRow"]> {
  return useCallback<NonNullable<TableProps<RenderedRow>["onRow"]>>(
    (rendered) => ({
      "data-testid": "table-row",
      "data-row-key": rendered.key,
      // A row can be reached and selected by keyboard: Tab to it, Enter or Space selects (a control inside keeps its own keys).
      tabIndex: 0,
      onKeyDown: (event) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        emit("row-selected", { key: rendered.key, row: rendered.row });
      },
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
}
