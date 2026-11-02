/**
 * `statistic` contract — one number that matters, large, with its title.
 * Display only. The value at the `value` port is shown with its digits
 * grouped and the given precision; text is shown as it is. Implementations
 * expose the value as `data-value`.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS } from "@wirework/schema";

export const statisticContract = defineContract({
  kind: "statistic",
  description: "One number that matters, large, with its title",
  io: {
    inputs: {
      value: {
        description: "Store path holding the number (or text) to show",
        value: z.union([z.number(), z.string()]),
        default: 0,
      },
    },
  },
  events: NO_EVENTS,
  settings: z.object({
    title: z.string().default("Total").describe("What the number is"),
    prefix: z.string().optional().describe("Shown before the number (a currency sign)"),
    suffix: z.string().optional().describe("Shown after the number (a unit)"),
    precision: z.number().int().min(0).max(6).optional().describe("Decimal places; the number's own when absent"),
  }),
  preview: {
    seed: { preview: { total: 1128 } },
    viewModel: { inputs: { value: "preview.total" }, title: "Active runs" },
  },
});
