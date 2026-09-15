/** gridstack page template: cells on a column grid by x/y/w/h (same placement model as react-grid-layout). */
import { z } from "zod";
import { cellBaseSchema } from "@wirework/schema";

export const DEFAULT_GRIDSTACK_COLS = 12;
export const DEFAULT_GRIDSTACK_CELL_HEIGHT_PX = 40;
export const DEFAULT_GRIDSTACK_MARGIN_PX = 10;
/** Height (grid rows) given to appended cells. */
export const DEFAULT_GRIDSTACK_CELL_ROWS = 2;

export const gridstackPlacementSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
});
export type GridstackPlacement = z.infer<typeof gridstackPlacementSchema>;
/** Placements keyed by cell id — the renderer's CHANGE payload (gridstack's `change` nodes). */
export type GridstackPlacements = Record<string, GridstackPlacement>;

export const gridstackCellSchema = cellBaseSchema.extend(gridstackPlacementSchema.shape);
export type GridstackCell = z.infer<typeof gridstackCellSchema>;

export const gridstackPageSchema = z.object({
  engine: z.literal("gridstack"),
  cols: z.number().int().min(1).optional(),
  /** Row height in px. */
  cellHeight: z.number().positive().optional(),
  cells: z.array(gridstackCellSchema),
});
export type GridstackPage = z.infer<typeof gridstackPageSchema>;

export function gridstackSettings(page: GridstackPage): { cols: number; cellHeight: number } {
  return {
    cols: page.cols ?? DEFAULT_GRIDSTACK_COLS,
    cellHeight: page.cellHeight ?? DEFAULT_GRIDSTACK_CELL_HEIGHT_PX,
  };
}
