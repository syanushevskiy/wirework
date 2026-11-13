/**
 * flex-rows page template: ROWS of cells, each row a CSS flexbox. A row
 * and a cell carry `classes` — Tailwind's flex class names (classes.ts),
 * space-separated — that say how the row lays its cells out and how a
 * cell grows, shrinks, sizes, aligns and orders itself. The names are
 * checked by the engine's `validate` (an unknown one is a warning that
 * names it), not by the schema, so a typo never takes the page down.
 *
 * The CHANGE payload is what edit mode reports: a cell's or a row's
 * classes, a cell moved to a place — `row` before the first (-1) or past
 * the last makes a new row, and `own` a new row of its own BEFORE `row`,
 * wherever that is — or two cells swapping places.
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
  z.object({
    kind: z.literal("move"),
    id: z.string(),
    row: z.number().int(),
    index: z.number().int().min(0),
    /** A new row of its own before `row` (the rows numbered before the cell left its own). */
    own: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("swap"), id: z.string(), with: z.string() }),
]);
export type FlexRowsChange = z.infer<typeof flexRowsChangeSchema>;
export type FlexRowsMove = Extract<FlexRowsChange, { kind: "move" }>;

/** Where a dragged cell is let go: on another cell — before it, after it, or in its place (the two swap) — or between two rows. */
export const DROP_SIDES = ["before", "after", "swap"] as const;
export type DropSide = (typeof DROP_SIDES)[number];
export type FlexDrop = { on: "cell"; id: string; side: DropSide } | { on: "gap"; row: number };
