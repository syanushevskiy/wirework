/**
 * Label contract: static text, or the text at a store path, in a semantic
 * tone. Implementations render the text as visible content and expose the
 * tone as `data-tone` (never a raw colour in configuration).
 */
import { z } from "zod";
import { defineContract, NO_EVENTS } from "@wirework/schema";

/** Semantic colour roles; an implementation maps them to its design system. */
export const LABEL_TONES = ["default", "muted", "accent", "success", "danger"] as const;
export type LabelTone = (typeof LABEL_TONES)[number];

export const labelContract = defineContract({
  kind: "label",
  description: "Static text, or the text at a store path, in a semantic tone",
  io: {
    inputs: {
      text: {
        description: "Store path whose value replaces the static text",
        value: z.string(),
        required: false,
      },
    },
  },
  events: NO_EVENTS,
  settings: z.object({
    text: z.string().describe("Text to display (used when no text input is bound)"),
    tone: z.enum(LABEL_TONES).default("default").describe("Semantic colour role"),
  }),
  preview: { viewModel: { text: "Sample text", tone: "accent" } },
});
