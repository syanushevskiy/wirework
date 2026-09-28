/** gridstack page template: the shared column grid (@wirework/engine-grid) plus this engine's cell height. */
import { z } from "zod";
import { gridCellSchema, gridCols, type GridTemplate } from "@wirework/engine-grid";

export {
  DEFAULT_GRID_CELL_ROWS,
  DEFAULT_GRID_COLS,
  gridCellSchema,
  gridPlacementSchema,
  gridPlacementsSchema,
  type GridCell,
  type GridPlacement,
  type GridPlacements,
} from "@wirework/engine-grid";

export const DEFAULT_GRIDSTACK_CELL_HEIGHT_PX = 40;
export const DEFAULT_GRIDSTACK_MARGIN_PX = 10;

export const gridstackPageSchema = z.object({
  engine: z.literal("gridstack"),
  cols: z.number().int().min(1).optional(),
  /** Row height in px. */
  cellHeight: z.number().positive().optional(),
  cells: z.array(gridCellSchema),
});
export type GridstackPage = z.infer<typeof gridstackPageSchema> & GridTemplate;

export function gridstackSettings(page: GridstackPage): { cols: number; cellHeight: number } {
  return { cols: gridCols(page), cellHeight: page.cellHeight ?? DEFAULT_GRIDSTACK_CELL_HEIGHT_PX };
}
