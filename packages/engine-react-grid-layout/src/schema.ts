/** react-grid-layout page template: cells on a column grid by x/y/w/h. */
import { z } from "zod";
import { cellBaseSchema } from "@wirework/schema";

export const DEFAULT_GRID_COLS = 12;
export const DEFAULT_GRID_ROW_HEIGHT = 40;
/** Height (grid rows) given to appended cells. */
export const DEFAULT_GRID_CELL_HEIGHT = 2;

/** Grid placement in column/row units (react-grid-layout's x/y/w/h). */
export const gridPlacementSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
});
export type GridPlacement = z.infer<typeof gridPlacementSchema>;
/** Placements keyed by cell id — the renderer's CHANGE payload. */
export type GridPlacements = Record<string, GridPlacement>;

export const gridCellSchema = cellBaseSchema.extend(gridPlacementSchema.shape);
export type GridCell = z.infer<typeof gridCellSchema>;

export const gridPageSchema = z.object({
  engine: z.literal("react-grid-layout"),
  /** Column count; default 12. */
  cols: z.number().int().min(1).optional(),
  /** Row height in px; default 40. */
  rowHeight: z.number().positive().optional(),
  cells: z.array(gridCellSchema),
});
export type GridPage = z.infer<typeof gridPageSchema>;

/** Grid settings with defaults applied. */
export function gridSettings(page: GridPage): { cols: number; rowHeight: number } {
  return {
    cols: page.cols ?? DEFAULT_GRID_COLS,
    rowHeight: page.rowHeight ?? DEFAULT_GRID_ROW_HEIGHT,
  };
}
