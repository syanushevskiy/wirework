/**
 * `alert` contract — a message with a severity (doc/widget-catalog.md, #5).
 * Display only. The text at the optional `title` port replaces the static
 * title; an empty value shows the static title. Implementations render
 * role=alert and expose the tone as `data-tone`.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS } from "@wirework/schema";

export const ALERT_TONES = ["info", "success", "warning", "danger"] as const;
export type AlertTone = (typeof ALERT_TONES)[number];

export const alertContract = defineContract({
  kind: "alert",
  description: "A message with a severity",
  io: {
    inputs: {
      title: {
        description: "Store path whose value replaces the static title (an empty value shows the static title)",
        value: z.string(),
        required: false,
      },
    },
  },
  events: NO_EVENTS,
  settings: z.object({
    title: z.string().default("Notice").describe("Title while no title input is bound, or it is empty"),
    description: z.string().optional().describe("Second line with details"),
    tone: z.enum(ALERT_TONES).default("info").describe("Severity"),
    showIcon: z.boolean().default(true).describe("Show the severity icon"),
  }),
  preview: {
    viewModel: { title: "Saved", description: "All changes are stored.", tone: "success" },
  },
});
