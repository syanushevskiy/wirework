/**
 * One table cell, as its column's `cell` says: text, a tag in a tone, a
 * link to an address of the application, or a renderer the host registered
 * by name. Render-only: what to show comes from useTableCell. A link is a
 * real anchor — a modifier or middle click is the browser's (a new tab);
 * a plain click is turned into the table's `link-clicked` by the row (see
 * useTable), never a navigation of the widget's own.
 */
import { Tag } from "antd";
import type { TableColumn, TableRow } from "@wirework/widget-contracts";
import { useTableCell, type TableCellRenderers } from "../hooks/use-table-cell";

export function TableCell({
  column,
  row,
  value,
  cells,
}: {
  column: TableColumn;
  row: TableRow;
  value: unknown;
  cells: TableCellRenderers;
}) {
  const view = useTableCell(column, row, value, cells);
  switch (view.kind) {
    case "text":
      return view.text;
    case "tag":
      return view.text === "" ? null : (
        <Tag color={view.color} data-tone={view.tone}>
          {view.text}
        </Tag>
      );
    case "link":
      return view.href === undefined ? (
        view.text
      ) : (
        <a href={view.href} className="ww-table__link">
          {view.text}
        </a>
      );
    case "custom":
      return view.Renderer === undefined ? (
        <span data-cell-problem="unknown-renderer">{view.text}</span>
      ) : (
        <view.Renderer {...view.props} />
      );
  }
}
