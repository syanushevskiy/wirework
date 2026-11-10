/**
 * `timeline` contract — a HISTORY: entries in order, each a text with an
 * optional time, title and tone. Display only. The entries are DATA at the
 * `items` port (a run's history comes from the server); `pending` adds an
 * open last entry ("still running…"). Implementations render a list with
 * one item per entry and expose each entry's tone as `data-tone`.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS } from "@wirework/schema";
import { TAG_TONES } from "./tag";

export const timelineItemSchema = z
  .object({
    /** The entry's text. */
    text: z.string(),
    /** When: shown beside the entry as it is (text, never parsed). */
    time: z.string().optional(),
    /** A heading above the text. */
    title: z.string().optional(),
    tone: z.enum(TAG_TONES).optional(),
  })
  .strict();
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export const timelineItemsSchema = z.array(timelineItemSchema);

export const TIMELINE_MODES = ["left", "right", "alternate"] as const;
export type TimelineMode = (typeof TIMELINE_MODES)[number];

export const timelineContract = defineContract({
  kind: "timeline",
  description: "A history: entries in order, each a text with a time and a tone",
  io: {
    inputs: {
      items: {
        description: "Store path holding the entries [{ text, time?, title?, tone? }]",
        value: timelineItemsSchema,
        default: [],
      },
    },
  },
  events: NO_EVENTS,
  settings: z.object({
    mode: z.enum(TIMELINE_MODES).default("left").describe("Which side of the line the entries sit on"),
    reverse: z.boolean().default(false).describe("The latest entry first"),
    pending: z.string().optional().describe("Text of an open last entry (something still going on); none when absent"),
  }),
  preview: {
    seed: {
      preview: {
        history: [
          { time: "09:00", text: "Queued", tone: "default" },
          { time: "09:01", text: "Running on qa-1", tone: "info" },
          { time: "09:07", text: "Finished", tone: "success" },
        ],
      },
    },
    viewModel: { inputs: { items: "preview.history" } },
  },
});
