/** react-grid-layout page template: the shared column grid (@wirework/engine-grid) plus this engine's row height. */
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

export const DEFAULT_GRID_ROW_HEIGHT = 40;

export const gridPageSchema = z.object({
  engine: z.literal("react-grid-layout"),
  /** Column count; default 12. */
  cols: z.number().int().min(1).optional(),
  /** Row height in px; default 40. */
  rowHeight: z.number().positive().optional(),
  cells: z.array(gridCellSchema),
});
export type GridPage = z.infer<typeof gridPageSchema> & GridTemplate;

/** Grid settings with defaults applied. */
export function gridSettings(page: GridPage): { cols: number; rowHeight: number } {
  return { cols: gridCols(page), rowHeight: page.rowHeight ?? DEFAULT_GRID_ROW_HEIGHT };
}
