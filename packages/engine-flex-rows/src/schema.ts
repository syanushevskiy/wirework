/** flex-rows page template: rows of cells with responsive width tokens. */
import { z } from "zod";
import { cellBaseSchema } from "@wirework/schema";

/**
 * Cell width: "full" | "auto" | responsive spec like "m-8/12 s-1/2"
 * (8/12 on medium screens, 1/2 on small). Validated by pattern so the
 * micro-grammar fails loudly at boot instead of silently mis-rendering.
 */
export const cellWidthSchema = z
  .string()
  .regex(
    /^(full|auto|(?:[sml]-[1-9]\d*(?:\/[1-9]\d*)?)(?:\s+[sml]-[1-9]\d*(?:\/[1-9]\d*)?)*)$/,
    "width must be 'full', 'auto' or a responsive spec like 'm-8/12 s-1/2' (breakpoints s|m|l, nonzero fractions)",
  );
export type CellWidth = z.infer<typeof cellWidthSchema>;

export const flexCellSchema = cellBaseSchema.extend({
  width: cellWidthSchema.optional(),
  height: z.string().optional(),
});
export type FlexCell = z.infer<typeof flexCellSchema>;

export const flexRowsPageSchema = z.object({
  engine: z.literal("flex-rows"),
  rows: z.array(z.array(flexCellSchema)),
});
export type FlexRowsPage = z.infer<typeof flexRowsPageSchema>;
