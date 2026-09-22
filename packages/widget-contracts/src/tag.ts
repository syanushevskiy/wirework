/**
 * `tag` contract — short status text in a semantic tone: what libraries call
 * a badge, tag or chip. Display only. The text
 * at the optional `text` port replaces the static text; an empty value shows
 * the static text. Implementations expose the tone as `data-tone` (never a
 * raw colour in configuration).
 */
import { z } from "zod";
import { defineContract, NO_EVENTS } from "@wirework/schema";

export const TAG_TONES = ["default", "info", "success", "warning", "danger"] as const;
export type TagTone = (typeof TAG_TONES)[number];

export const tagContract = defineContract({
  kind: "tag",
  description: "Short status text in a semantic tone (a badge or chip)",
  io: {
    inputs: {
      text: {
        description: "Store path whose value replaces the static text (an empty value shows the static text)",
        value: z.string(),
        required: false,
      },
    },
  },
  events: NO_EVENTS,
  settings: z.object({
    text: z.string().default("Tag").describe("Text while no text input is bound, or it is empty"),
    tone: z.enum(TAG_TONES).default("default").describe("Semantic colour role"),
  }),
  preview: { viewModel: { text: "Success", tone: "success" } },
});
