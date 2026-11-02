/**
 * `divider` contract — a line between parts of a page, with a title on it
 * or not. Display only, nothing bound. Implementations render
 * role=separator.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS, NO_IO } from "@wirework/schema";

export const DIVIDER_ORIENTATIONS = ["left", "center", "right"] as const;
export type DividerOrientation = (typeof DIVIDER_ORIENTATIONS)[number];

export const dividerContract = defineContract({
  kind: "divider",
  description: "A line between parts of a page, with a title on it or not",
  io: NO_IO,
  events: NO_EVENTS,
  settings: z.object({
    text: z.string().optional().describe("Title on the line (none: a plain line)"),
    orientation: z.enum(DIVIDER_ORIENTATIONS).default("center").describe("Where the title sits on the line"),
    dashed: z.boolean().default(false).describe("A dashed line"),
  }),
  preview: { viewModel: { text: "Section" } },
});
