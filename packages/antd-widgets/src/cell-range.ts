/**
 * The CELL SELECTION's arithmetic, pure (doc/row-window-design.md, "Cells
 * are selected and copied"): a range as the cell it started at and the cell
 * it reaches, its rectangle, which of the rectangle's edges a cell lies on,
 * what a cell COPIES — its text, and for a link cell the address it leads
 * to —, the rectangle as clipboard text and the rows as a CSV file.
 *
 * Rows count through the WHOLE list (a windowed list holds a slice of it,
 * `offset` rows in), columns through the ones shown, both from 0.
 */
import { getPath } from "@wirework/schema";
import { cellHref, cellText, type TableColumn, type TableRow } from "@wirework/widget-contracts";

export interface CellAt {
  row: number;
  column: number;
}

/** From the cell the selection started at to the cell it reaches — in any direction. */
export interface CellRange {
  anchor: CellAt;
  focus: CellAt;
}

/** The range as a rectangle, every side inclusive. */
export interface CellRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export const rectOf = ({ anchor, focus }: CellRange): CellRect => ({
  top: Math.min(anchor.row, focus.row),
  left: Math.min(anchor.column, focus.column),
  bottom: Math.max(anchor.row, focus.row),
  right: Math.max(anchor.column, focus.column),
});

/** The rectangle within the columns the table shows now, or none when it shows none of them. */
export const withinColumns = (rect: CellRect, columns: number): CellRect | undefined =>
  rect.left >= columns ? undefined : { ...rect, right: Math.min(rect.right, columns - 1) };

export const inRect = (rect: CellRect, { row, column }: CellAt): boolean =>
  row >= rect.top && row <= rect.bottom && column >= rect.left && column <= rect.right;

export const sameCell = (a: CellAt, b: CellAt): boolean => a.row === b.row && a.column === b.column;

/** The sides of the rectangle a cell inside it lies on: "top left", "" in the middle — where the outline is drawn. */
export const edgesOf = (rect: CellRect, { row, column }: CellAt): string =>
  [
    row === rect.top ? "top" : "",
    column === rect.right ? "right" : "",
    row === rect.bottom ? "bottom" : "",
    column === rect.left ? "left" : "",
  ]
    .filter(Boolean)
    .join(" ");

/** The rectangle as a scenario reads it: "1-1/2-3" — rowStart-columnStart/rowEnd-columnEnd, counted from 1. */
export const rectText = ({ top, left, bottom, right }: CellRect): string =>
  `${top + 1}-${left + 1}/${bottom + 1}-${right + 1}`;

/** Makes a link cell's address whole (the page's origin before an application path); the hook passes the browser's. */
export type Resolve = (href: string) => string;
const asIs: Resolve = (href) => href;

/** What a cell COPIES: its text — a tag's too —, and for a link cell the address it leads to (its text when it leads nowhere). */
export function copyValue(column: TableColumn, row: TableRow, resolve: Resolve = asIs): string {
  const text = cellText(getPath(row, column.property));
  if (column.cell?.kind !== "link") return text;
  const href = cellHref(column.cell.to, row);
  return href === undefined ? text : resolve(href);
}

/** A value on one line of the clipboard: a tab or a line break inside it would start another cell or row. */
const onOneLine = (value: string): string => value.replace(/[\t\r\n]+/g, " ");

/**
 * The rectangle as CLIPBOARD text — a line per row, the cells tab-separated,
 * what a spreadsheet pastes as cells —, with the columns' titles first when
 * asked. Only the rows HELD are there to copy: `offset` says where in the
 * whole list they begin.
 */
export function rangeText(
  rows: readonly TableRow[],
  offset: number,
  columns: readonly TableColumn[],
  rect: CellRect,
  headers: boolean,
  resolve: Resolve = asIs,
): { text: string; rows: number; columns: number } {
  const shown = columns.slice(rect.left, rect.right + 1);
  const held = rows.slice(Math.max(0, rect.top - offset), Math.max(0, rect.bottom - offset + 1));
  const lines = [
    ...(headers ? [shown.map((column) => column.title)] : []),
    ...held.map((row) => shown.map((column) => copyValue(column, row, resolve))),
  ];
  return {
    text: lines.map((line) => line.map(onOneLine).join("\t")).join("\n"),
    rows: held.length,
    columns: shown.length,
  };
}

/** A CSV field (RFC 4180): quoted when it holds a comma, a quote or a line break, its quotes doubled. */
const csvField = (value: string): string => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** The rows as a CSV file: the columns' titles, then a line per row, each cell what it copies. */
export const csvText = (rows: readonly TableRow[], columns: readonly TableColumn[], resolve: Resolve = asIs): string =>
  [
    columns.map((column) => column.title),
    ...rows.map((row) => columns.map((column) => copyValue(column, row, resolve))),
  ]
    .map((line) => line.map(csvField).join(","))
    .join("\r\n");

/** The CSV file's name: the setting's, or one made from the rows' store path ("runs.data" → "runs-data"). */
export const exportFile = (name: string, rowsPath: string): string =>
  `${name.trim() === "" ? rowsPath.replace(/[^\w-]+/g, "-") : name.trim()}.csv`;
