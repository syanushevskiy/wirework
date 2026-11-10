/**
 * `date-range` contract — two dates, from and to, picked together.
 *
 * CONTROLLED like `date`: the value at the `value` port is a pair of texts
 * `[from, to]` in the same form (`YYYY-MM-DD`, ISO with time when
 * `withTime`), `["", ""]` while nothing is picked. Every pick EMITS
 * `changed` with the whole pair and the default reaction writes it back —
 * bound to `<view>.filterBetween.<column>`, a table the server describes
 * filters by it with no other wiring (@wirework/table-view). Implementations
 * render a group named by `label` holding two textboxes that take typed
 * dates, and a calendar.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const dateRangeSchema = z.tuple([z.string(), z.string()]);
export type DateRange = z.infer<typeof dateRangeSchema>;

export const NO_DATES: DateRange = ["", ""];

export const dateRangeContract = defineContract({
  kind: "date-range",
  description: 'Two dates, from and to, stored as a pair of texts (["", ""] = nothing picked); emits every pick',
  io: {
    inputs: {
      value: {
        description: 'Store path holding [from, to] as text (["", ""] = nothing picked)',
        value: dateRangeSchema,
        default: NO_DATES,
      },
    },
  },
  events: {
    changed: {
      description: "Fired when the user picks or clears the range, with both dates",
      payload: z.object({ value: dateRangeSchema }),
      primary: "value",
      writesBack: "value",
    },
  },
  settings: z.object({
    label: z.string().default("Between").describe("Caption of the pair, also the accessible name"),
    withTime: z.boolean().default(false).describe("Pick times of day too; stored as ISO date-times"),
    format: z.string().optional().describe("How the dates are SHOWN (dayjs format); what is stored never changes"),
    allowClear: z.boolean().default(true).describe("Let the user clear the range"),
  }),
  preview: {
    seed: { preview: { window: ["2026-11-01", "2026-11-09"] } },
    viewModel: { inputs: { value: "preview.window" }, label: "Started between" },
  },
});
