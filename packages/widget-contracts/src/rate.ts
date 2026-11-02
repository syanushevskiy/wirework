/**
 * `rate` contract — a score as stars.
 *
 * CONTROLLED: the score lives at the `value` port (0 = none); every pick
 * EMITS `changed` and the default reaction writes it back (`writesBack`).
 * Implementations render a group named by `label` holding one radio per
 * star, the chosen ones checked.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const rateContract = defineContract({
  kind: "rate",
  description: "A score as stars; emits every pick",
  io: {
    inputs: {
      value: { description: "Store path holding the score (0 = none)", value: z.number().min(0), default: 0 },
    },
  },
  events: {
    changed: {
      description: "Fired when the user picks a star, or clears the score (0)",
      payload: z.object({ value: z.number() }),
      primary: "value",
      writesBack: "value",
    },
  },
  settings: z.object({
    label: z.string().default("Rating").describe("Caption, also the accessible name"),
    count: z.number().int().min(1).max(10).default(5).describe("How many stars"),
    allowHalf: z.boolean().default(false).describe("Let the user pick half a star"),
    allowClear: z.boolean().default(true).describe("Picking the chosen star again clears the score"),
  }),
  preview: {
    seed: { preview: { stars: 4 } },
    viewModel: { inputs: { value: "preview.stars" }, label: "Quality" },
  },
});
