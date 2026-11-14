/**
 * `collapse` contract — panels that fold, a layout per panel
 * (doc/ADR/0009-containers.md). Like `tabs`, with every panel on view at once
 * and `open` saying which start unfolded. Nothing bound, nothing emitted.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS, NO_IO } from "@wirework/schema";
import { layoutItemSchema } from "./tabs";

export const collapseContract = defineContract({
  kind: "collapse",
  description: "Panels that fold, a layout of widgets per panel",
  io: NO_IO,
  events: NO_EVENTS,
  settings: z.object({
    panels: z
      .array(layoutItemSchema.extend({ open: z.boolean().optional() }).strict())
      .min(1)
      .default([{ key: "first", label: "First", open: true }])
      .describe("The panels, each with its layout; `open` ones start unfolded"),
  }),
  contains: ["panels"],
  preview: {
    viewModel: {
      panels: [
        { key: "details", label: "Details", open: true, content: { engine: "react-grid-layout", cells: [] } },
        { key: "more", label: "More", content: { engine: "react-grid-layout", cells: [] } },
      ],
    },
  },
});
