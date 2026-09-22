/**
 * `progress` contract — a percentage as a bar.
 * Display only. The value at the `percent` port is shown clamped to 0–100
 * (a store may overshoot; the bar must not). Implementations render
 * role=progressbar named by `label`, and expose the shown value as
 * `data-percent`.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS } from "@wirework/schema";

export const PROGRESS_TONES = ["default", "success", "danger"] as const;
export type ProgressTone = (typeof PROGRESS_TONES)[number];

export const progressContract = defineContract({
  kind: "progress",
  description: "A percentage as a bar",
  io: {
    inputs: {
      percent: {
        description: "Store path holding the percentage (shown clamped to 0–100)",
        value: z.number().finite(),
        default: 0,
      },
    },
  },
  events: NO_EVENTS,
  settings: z.object({
    label: z.string().optional().describe("Caption, also the accessible name"),
    tone: z.enum(PROGRESS_TONES).default("default").describe("Semantic colour role"),
    showValue: z.boolean().default(true).describe("Show the percentage next to the bar"),
  }),
  preview: {
    seed: { preview: { percent: 60 } },
    viewModel: { inputs: { percent: "preview.percent" }, label: "Upload" },
  },
});
