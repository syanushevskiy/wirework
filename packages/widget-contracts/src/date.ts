/**
 * `date` contract — a day (or a moment) picked from a calendar or typed.
 *
 * CONTROLLED: the value lives at the `value` port as TEXT — `YYYY-MM-DD`
 * for a day, an ISO date-time with its offset when `withTime` — and "" is
 * "nothing picked". The store, the page file and the overlay are JSON, so a
 * date is a string and never a Date; `format` is what the user SEES and
 * never changes what is stored; the server decides what a day means.
 * Every pick EMITS `changed` and the default reaction writes it back.
 * Implementations render a textbox named by `label` that takes the date
 * typed in the shown format (Enter picks it), and a calendar beside it.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

/** What the calendar picks: a day, a week, a month or a year — stored as the day the period starts. */
export const DATE_PICKERS = ["date", "week", "month", "year"] as const;
export type DatePicker = (typeof DATE_PICKERS)[number];

/** How a day is stored, whatever the user sees. */
export const DATE_FORMAT = "YYYY-MM-DD";

export const dateContract = defineContract({
  kind: "date",
  description: 'A day or a moment, stored as text ("YYYY-MM-DD", or ISO with time); emits every pick',
  io: {
    inputs: {
      value: {
        description: 'Store path holding the date as text ("" = nothing picked)',
        value: z.string(),
        default: "",
      },
    },
  },
  events: {
    changed: {
      description: 'Fired when the user picks or clears a date ("")',
      payload: z.object({ value: z.string() }),
      primary: "value",
      writesBack: "value",
    },
  },
  settings: z.object({
    label: z.string().default("Date").describe("Field label, also the accessible name"),
    placeholder: z.string().optional().describe("Shown while nothing is picked"),
    withTime: z.boolean().default(false).describe("Pick a time of day too; stored as ISO date-time"),
    picker: z.enum(DATE_PICKERS).default("date").describe("What the calendar picks"),
    format: z.string().optional().describe("How the date is SHOWN (dayjs format); what is stored never changes"),
    allowClear: z.boolean().default(true).describe("Let the user clear the date"),
  }),
  preview: {
    seed: { preview: { day: "2026-11-09" } },
    viewModel: { inputs: { value: "preview.day" }, label: "Report day" },
  },
});
