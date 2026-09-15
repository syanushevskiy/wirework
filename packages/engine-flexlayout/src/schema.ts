/**
 * FlexLayout page template: the cells (identity + widget binding) plus the
 * library's own model document, where each TAB's id is a cell id. The tree
 * is the layout; the core never looks inside it.
 */
import { z } from "zod";
import { cellBaseSchema } from "@wirework/schema";

/** FlexLayout's model JSON, validated only structurally — the library owns it. */
export const flexLayoutModelSchema = z
  .object({
    global: z.record(z.string(), z.unknown()).optional(),
    borders: z.array(z.unknown()).optional(),
    layout: z.record(z.string(), z.unknown()),
  })
  .passthrough();
export type FlexLayoutModelJson = z.infer<typeof flexLayoutModelSchema>;

export const flexLayoutPageSchema = z.object({
  engine: z.literal("flexlayout"),
  cells: z.array(cellBaseSchema),
  model: flexLayoutModelSchema,
});
export type FlexLayoutPage = z.infer<typeof flexLayoutPageSchema>;

/** The id FlexLayout uses for the tabset new cells are appended to. */
export const MAIN_TABSET_ID = "main";
