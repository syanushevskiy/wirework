/**
 * What ONE table cell shows, from its column's `cell` (table-cell.ts in
 * @wirework/widget-contracts) and the row: the text, and for a tag its
 * tone and colour, for a link its address, for a custom cell the renderer
 * the host registered under that name — or the plain text, with a problem,
 * when no renderer has that name (columns arrive at runtime, so nothing
 * checked the name before). Pure derivation, in a hook per the guidelines.
 */
import type { ComponentType } from "react";
import type { TagProps } from "antd";
import { cellHref, cellText, cellTone, type TableColumn, type TableRow, type TagTone } from "@wirework/widget-contracts";
import { TAG_COLOR } from "../tones";

/** What a renderer the host registers receives — no store, no emit: it shows the row's data. */
export interface TableCellProps {
  /** The value at the column's property. */
  value: unknown;
  /** The value as the table would show it. */
  text: string;
  row: TableRow;
  column: TableColumn;
  /** The `params` of the column's `cell`, as declared. */
  params: Record<string, unknown>;
}
export type TableCellRenderer = ComponentType<TableCellProps>;
/** The host's renderers by name; a column selects one with `cell: { kind: "custom", name }`. */
export type TableCellRenderers = Readonly<Record<string, TableCellRenderer>>;

export type TableCellView =
  | { kind: "text"; text: string }
  | { kind: "tag"; text: string; tone: TagTone; color: TagProps["color"] }
  | { kind: "link"; text: string; href: string | undefined }
  | { kind: "custom"; text: string; Renderer: TableCellRenderer | undefined; props: TableCellProps };

const warned = new Set<string>();

/** Once per unknown name: the page shows text, the console says why. */
function warnUnknown(name: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  console.warn(`table: no cell renderer is registered as "${name}" — showing the value as text`);
}

export function useTableCell(column: TableColumn, row: TableRow, value: unknown, cells: TableCellRenderers): TableCellView {
  const text = cellText(value);
  const cell = column.cell ?? { kind: "text" as const };
  switch (cell.kind) {
    case "text":
      return { kind: "text", text };
    case "tag": {
      const tone = cellTone(cell.tones, value);
      return { kind: "tag", text, tone, color: TAG_COLOR[tone] };
    }
    case "link":
      return { kind: "link", text, href: cellHref(cell.to, row) };
    case "custom": {
      const Renderer = cells[cell.name];
      if (Renderer === undefined) warnUnknown(cell.name);
      return { kind: "custom", text, Renderer, props: { value, text, row, column, params: cell.params ?? {} } };
    }
  }
}
