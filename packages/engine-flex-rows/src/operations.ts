/**
 * The flex-rows operations, PURE (hosts replay them): what a change does
 * to a template, the change a drop asks for, and what `validate` says
 * about the classes a template names.
 */
import { unknownClasses } from "./classes";
import type { FlexCell, FlexDrop, FlexRow, FlexRowsChange, FlexRowsMove, FlexRowsPage } from "./schema";

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
function moved(template: FlexRowsPage, { id, row, index, own }: FlexRowsMove): FlexRowsPage {
  const cell = cellOf(template, id);
  if (!cell) return template;
  const rows = rowsWithout(template.rows, id);
  const at = Math.min(Math.max(row, 0), rows.length);
  const placed = own
    ? [...rows.slice(0, at), { cells: [cell] }, ...rows.slice(at)]
    : row < 0
      ? [{ cells: [cell] }, ...rows]
      : row >= rows.length
        ? [...rows, { cells: [cell] }]
        : rows.map((candidate, at) =>
            at === row ? { ...candidate, cells: inserted(candidate.cells, cell, index) } : candidate,
          );
  return { ...template, rows: placed.filter(nonEmpty) };
}

const cellOf = (template: FlexRowsPage, id: string): FlexCell | undefined =>
  template.rows.flatMap((row) => row.cells).find((cell) => cell.id === id);

/** Two cells in each other's places, each keeping its own classes. An unknown cell, or a cell with itself, changes nothing. */
function swapped(template: FlexRowsPage, a: string, b: string): FlexRowsPage {
  const first = cellOf(template, a);
  const second = cellOf(template, b);
  if (!first || !second || a === b) return template;
  return {
    ...template,
    rows: template.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => (cell.id === a ? second : cell.id === b ? first : cell)),
    })),
  };
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
    case "swap":
      return swapped(template, change.id, change.with);
  }
}

/** The change a drop asks for, before it is known whether it changes anything. */
function dropOf(template: FlexRowsPage, id: string, drop: FlexDrop): FlexRowsChange | undefined {
  if (drop.on === "gap") return { kind: "move", id, row: drop.row, index: 0, own: true };
  if (drop.id === id) return undefined;
  if (drop.side === "swap") return { kind: "swap", id, with: drop.id };
  const row = template.rows.findIndex((candidate) => candidate.cells.some((cell) => cell.id === drop.id));
  // The place among the row's cells once the dragged one has left it.
  const index = (template.rows[row]?.cells ?? []).filter((cell) => cell.id !== id).findIndex((c) => c.id === drop.id);
  return index < 0 ? undefined : { kind: "move", id, row, index: drop.side === "before" ? index : index + 1 };
}

/**
 * The change a DROP asks for (useFlexRowsDrag says where the pointer was
 * let go): on another cell's middle the two swap places, on its left or
 * right edge the dragged cell goes before or after it, between two rows it
 * takes a new row of its own. Undefined when nothing would change — a cell
 * dropped where it already is.
 */
export function dropChange(template: FlexRowsPage, id: string, drop: FlexDrop): FlexRowsChange | undefined {
  const change = dropOf(template, id, drop);
  if (change === undefined) return undefined;
  return JSON.stringify(applyFlexRowsChange(template, change)) === JSON.stringify(template) ? undefined : change;
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
