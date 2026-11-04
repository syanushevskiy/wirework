/**
 * flex-rows page template: ROWS of cells, each row a CSS flexbox. A row
 * and a cell carry `classes` — Tailwind's flex class names (classes.ts),
 * space-separated — that say how the row lays its cells out and how a
 * cell grows, shrinks, sizes, aligns and orders itself. The names are
 * checked by the engine's `validate` (an unknown one is a warning that
 * names it), not by the schema, so a typo never takes the page down.
 *
 * The CHANGE payload is what edit mode reports: a cell's or a row's
 * classes, or a cell moved to a place — `row` before the first (-1) or
 * past the last makes a new row.
 */
import { z } from "zod";
import { cellBaseSchema } from "@wirework/schema";

export const flexCellSchema = cellBaseSchema.extend({ classes: z.string().optional() });
export type FlexCell = z.infer<typeof flexCellSchema>;

export const flexRowSchema = z.object({ classes: z.string().optional(), cells: z.array(flexCellSchema) });
export type FlexRow = z.infer<typeof flexRowSchema>;

export const flexRowsPageSchema = z.object({
  engine: z.literal("flex-rows"),
  rows: z.array(flexRowSchema),
});
export type FlexRowsPage = z.infer<typeof flexRowsPageSchema>;

export const flexRowsChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cell"), id: z.string(), classes: z.string() }),
  z.object({ kind: z.literal("row"), row: z.number().int().min(0), classes: z.string() }),
  z.object({ kind: z.literal("move"), id: z.string(), row: z.number().int(), index: z.number().int().min(0) }),
]);
export type FlexRowsChange = z.infer<typeof flexRowsChangeSchema>;
export type FlexRowsMove = Extract<FlexRowsChange, { kind: "move" }>;

/** Where edit mode's arrows move a cell: within its row, or into the row above or below. */
export const MOVE_DIRECTIONS = ["left", "right", "up", "down"] as const;
export type MoveDirection = (typeof MOVE_DIRECTIONS)[number];
