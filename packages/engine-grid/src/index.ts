/**
 * The column grid two layout engines share (@wirework/engine-react-grid-layout,
 * @wirework/engine-gridstack): cells placed by x/y/w/h in column and row
 * units, a change reported as placements by cell id, and the pure
 * operations on such a template — everything but the library that draws
 * it. An engine adds its name, the fields only its renderer reads (a row
 * height, a margin) and the renderer.
 */
import { z } from "zod";
import { cellBaseSchema, type CellBase, type PageViewModel } from "@wirework/schema";

/** Column count when the template names none. */
export const DEFAULT_GRID_COLS = 12;
/** Height (grid rows) given to appended cells. */
export const DEFAULT_GRID_CELL_ROWS = 2;

/** A placement in column/row units. */
export const gridPlacementSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
});
export type GridPlacement = z.infer<typeof gridPlacementSchema>;

/** Placements keyed by cell id — a grid renderer's CHANGE payload. */
export const gridPlacementsSchema = z.record(z.string(), gridPlacementSchema);
export type GridPlacements = z.infer<typeof gridPlacementsSchema>;

/** A cell of a grid template: its identity and binding plus its placement. */
export const gridCellSchema = cellBaseSchema.extend(gridPlacementSchema.shape);
export type GridCell = z.infer<typeof gridCellSchema>;

/** What every grid template holds; an engine's template extends it. */
export interface GridTemplate extends PageViewModel {
  cells: GridCell[];
  /** Column count; `DEFAULT_GRID_COLS` when absent. */
  cols?: number | undefined;
}

/** The column count of a template, with the default applied. */
export const gridCols = (template: GridTemplate): number => template.cols ?? DEFAULT_GRID_COLS;

export interface GridOperationsOptions<T extends GridTemplate> {
  /** A template with no cells — what a builder starts from. */
  empty: () => T;
  /** Height (grid rows) of an appended cell; `DEFAULT_GRID_CELL_ROWS` when absent. */
  cellRows?: number | undefined;
}

/**
 * The layout operations of a grid template, pure and library-free: an
 * appended cell is a full-width band below the lowest one, a change moves
 * the cells it names (unknown ids are ignored), and a cell wider than the
 * grid is a problem the renderer would otherwise clamp silently.
 */
export function gridOperations<T extends GridTemplate>({
  empty,
  cellRows = DEFAULT_GRID_CELL_ROWS,
}: GridOperationsOptions<T>) {
  return {
    empty,
    cells: (template: T): CellBase[] => template.cells,
    appendCell: (template: T, cell: CellBase): T => {
      const y = template.cells.reduce((bottom, placed) => Math.max(bottom, placed.y + placed.h), 0);
      return { ...template, cells: [...template.cells, { ...cell, x: 0, y, w: gridCols(template), h: cellRows }] };
    },
    removeCell: (template: T, cellId: string): T => ({
      ...template,
      cells: template.cells.filter((cell) => cell.id !== cellId),
    }),
    applyChange: (template: T, placements: GridPlacements): T => ({
      ...template,
      cells: template.cells.map((cell) => ({ ...cell, ...placements[cell.id] })),
    }),
    validate: (template: T): string[] => {
      const cols = gridCols(template);
      return template.cells.flatMap((cell, index) =>
        cell.x + cell.w > cols
          ? [`cells[${index}] (#${cell.id}) exceeds the grid: x ${cell.x} + w ${cell.w} > ${cols} columns`]
          : [],
      );
    },
  };
}
