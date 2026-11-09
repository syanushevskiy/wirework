/**
 * The css-grid operations, PURE (hosts replay them): a cell appended as a
 * row of its own, a cell removed with its slots emptied, a change applied,
 * and what `validate` says about the picture and the tracks (areas.ts).
 */
import type { CellBase, CellSize } from "@wirework/schema";
import { areasOf, columnCount, pictureProblems, tokensOf, withoutEmptyRows } from "./areas";
import { EMPTY, type CssGridChange, type CssGridPage } from "./schema";

export const emptyCssGrid = (): CssGridPage => ({ engine: "css-grid", areas: [], cells: [] });

/** The cell appended with a row of its own across every column — two rows for a cell that holds a layout (a card). */
export function appendCssGridCell(template: CssGridPage, cell: CellBase, size: CellSize = "default"): CssGridPage {
  const tokens = tokensOf(template.areas);
  const width = Math.max(1, columnCount(tokens));
  const row = Array<string>(width).fill(cell.id).join(" ");
  const rows = size === "tall" ? [row, row] : [row];
  return {
    ...template,
    areas: [...template.areas, ...rows],
    ...(template.rows === undefined ? {} : { rows: [...template.rows, ...rows.map(() => "auto")] }),
    cells: [...template.cells, cell],
  };
}

/** The cell gone, its slots emptied, and the rows that are now all empty gone with them (their sizes too). */
export function removeCssGridCell(template: CssGridPage, id: string): CssGridPage {
  if (!template.cells.some((cell) => cell.id === id)) return template;
  const emptied = tokensOf(template.areas).map((row) => row.map((token) => (token === id ? EMPTY : token)));
  const kept = emptied.map((row) => row.some((token) => token !== EMPTY));
  const rows = template.rows?.filter((_, r) => kept[r]);
  return {
    ...template,
    areas: areasOf(withoutEmptyRows(emptied)),
    ...(rows === undefined ? {} : { rows }),
    cells: template.cells.filter((cell) => cell.id !== id),
  };
}

/** A key set only when the change carries it: the change says what moves, the template keeps the rest. */
const given = <K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> =>
  value === undefined ? {} : ({ [key]: value } as Record<K, V>);

export function applyCssGridChange(template: CssGridPage, change: CssGridChange): CssGridPage {
  switch (change.kind) {
    case "areas":
      return {
        ...template,
        areas: change.areas,
        ...given("columns", change.columns),
        ...given("rows", change.rows),
      };
    case "tracks":
      return {
        ...template,
        ...given("columns", change.columns),
        ...given("rows", change.rows),
        ...given("gap", change.gap),
      };
  }
}

/** What `validate` reports: every rule of the picture and the tracks, as a warning above the page and an error at boot. */
export const cssGridProblems = (template: CssGridPage): string[] =>
  pictureProblems(
    template.areas,
    template.cells.map((cell) => cell.id),
    { columns: template.columns, rows: template.rows, gap: template.gap },
  );
