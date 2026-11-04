/**
 * The flex-rows operations, PURE (hosts replay them): what a change does
 * to a template, where an arrow moves a cell, and what `validate` says
 * about the classes a template names.
 */
import { unknownClasses } from "./classes";
import type { FlexCell, FlexRow, FlexRowsChange, FlexRowsMove, FlexRowsPage, MoveDirection } from "./schema";

/** The item with its classes set — or without the key at all when cleared: a record keeps no empty values. */
function classed<T extends { classes?: string | undefined }>(item: T, classes: string): T {
  const { classes: _previous, ...rest } = item;
  const trimmed = classes.trim();
  // The one cast: `rest` is `item` without `classes`, a key T declares optional.
  return (trimmed === "" ? rest : { ...rest, classes: trimmed }) as T;
}

const rowsWithout = (rows: readonly FlexRow[], id: string): FlexRow[] =>
  rows.map((row) => ({ ...row, cells: row.cells.filter((cell) => cell.id !== id) }));

const nonEmpty = (row: FlexRow): boolean => row.cells.length > 0;

/** The template without the cell — and without its row, when the cell was the last in it. An unknown id changes nothing. */
export const removeFlexCell = (template: FlexRowsPage, id: string): FlexRowsPage => ({
  ...template,
  rows: rowsWithout(template.rows, id).filter(nonEmpty),
});

const inserted = (cells: readonly FlexCell[], cell: FlexCell, index: number): FlexCell[] => {
  const at = Math.min(Math.max(index, 0), cells.length);
  return [...cells.slice(0, at), cell, ...cells.slice(at)];
};

/**
 * The cell at `row`/`index`, the rows numbered BEFORE it left its own:
 * a row before the first or past the last is a new one; a row left
 * empty is gone. An unknown cell changes nothing.
 */
function moved(template: FlexRowsPage, { id, row, index }: FlexRowsMove): FlexRowsPage {
  const cell = template.rows.flatMap((candidate) => candidate.cells).find((candidate) => candidate.id === id);
  if (!cell) return template;
  const rows = rowsWithout(template.rows, id);
  const placed =
    row < 0
      ? [{ cells: [cell] }, ...rows]
      : row >= rows.length
        ? [...rows, { cells: [cell] }]
        : rows.map((candidate, at) =>
            at === row ? { ...candidate, cells: inserted(candidate.cells, cell, index) } : candidate,
          );
  return { ...template, rows: placed.filter(nonEmpty) };
}

export function applyFlexRowsChange(template: FlexRowsPage, change: FlexRowsChange): FlexRowsPage {
  switch (change.kind) {
    case "cell":
      return {
        ...template,
        rows: template.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => (cell.id === change.id ? classed(cell, change.classes) : cell)),
        })),
      };
    case "row":
      return {
        ...template,
        rows: template.rows.map((row, at) => (at === change.row ? classed(row, change.classes) : row)),
      };
    case "move":
      return moved(template, change);
  }
}

/** The move an arrow asks for: a step within the row, or the end of the row above / the start of the row below. */
export function moveTarget(template: FlexRowsPage, id: string, direction: MoveDirection): FlexRowsMove | undefined {
  const row = template.rows.findIndex((candidate) => candidate.cells.some((cell) => cell.id === id));
  const index = template.rows[row]?.cells.findIndex((cell) => cell.id === id) ?? -1;
  if (index < 0) return undefined;
  const to = {
    left: { row, index: Math.max(index - 1, 0) },
    right: { row, index: index + 1 },
    up: { row: row - 1, index: template.rows[row - 1]?.cells.length ?? 0 },
    down: { row: row + 1, index: 0 },
  }[direction];
  return { kind: "move", id, ...to };
}

const problemsOf = (where: string, classes: string | undefined): string[] => {
  const unknown = unknownClasses(classes);
  return unknown.length === 0
    ? []
    : [`${where}: unknown classes ${unknown.join(", ")} (Tailwind's layout classes only)`];
};

/** What `validate` reports: every class name the vocabulary does not have, per row and per cell. */
export const flexRowsProblems = (template: FlexRowsPage): string[] =>
  template.rows.flatMap((row, at) => [
    ...problemsOf(`row ${at + 1}`, row.classes),
    ...row.cells.flatMap((cell) => problemsOf(`cell "${cell.id}"`, cell.classes)),
  ]);
