/**
 * `tabs` contract — a layout per tab (doc/ADR/0009-containers.md). Each tab
 * holds a page template as its `content`, in the tabs widget's own
 * template; a tab's widgets mount when the tab is first shown and keep
 * what they had after. Nothing bound, nothing emitted.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS, NO_IO, pageViewModelSchema, PATH_SEGMENT } from "@wirework/schema";

/** One tab, one panel: a key (one path segment, unique within the widget), a label, a layout. */
export const layoutItemSchema = z
  .object({
    key: z.string().regex(PATH_SEGMENT, "A key is one path segment"),
    label: z.string().min(1),
    content: pageViewModelSchema.optional(),
  })
  .strict();
export type LayoutItem = z.infer<typeof layoutItemSchema>;

export const tabsContract = defineContract({
  kind: "tabs",
  description: "Tabs, a layout of widgets per tab",
  io: NO_IO,
  events: NO_EVENTS,
  settings: z.object({
    tabs: z
      .array(layoutItemSchema)
      .min(1)
      .default([{ key: "first", label: "First" }])
      .describe("The tabs, each with its layout"),
  }),
  contains: ["tabs"],
  preview: {
    viewModel: {
      tabs: [
        { key: "runs", label: "Runs", content: { engine: "react-grid-layout", cells: [] } },
        { key: "history", label: "History", content: { engine: "react-grid-layout", cells: [] } },
      ],
    },
  },
});
