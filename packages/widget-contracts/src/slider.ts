/**
 * `slider` contract — a number picked along a range.
 *
 * CONTROLLED: the number lives at the `value` port; every move EMITS
 * `changed` and the default reaction writes it back (`writesBack`).
 * Implementations render role=slider named by `label`, with the range as
 * `aria-valuemin` / `aria-valuemax` / `aria-valuenow`, and move by `step`
 * on the arrow keys.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const sliderContract = defineContract({
  kind: "slider",
  description: "A number picked along a range; emits every move",
  io: {
    inputs: {
      value: { description: "Store path holding the number", value: z.number().finite(), default: 0 },
    },
  },
  events: {
    changed: {
      description: "Fired when the user moves the handle",
      payload: z.object({ value: z.number() }),
      primary: "value",
      writesBack: "value",
    },
  },
  settings: z
    .object({
      label: z.string().default("Slider").describe("Caption, also the accessible name"),
      min: z.number().default(0).describe("The range's lower end"),
      max: z.number().default(100).describe("The range's upper end"),
      step: z.number().positive().default(1).describe("How far one move goes"),
      showValue: z.boolean().default(true).describe("Show the number while moving"),
    })
    .refine((settings) => settings.min < settings.max, { message: "min must be below max", path: ["max"] }),
  preview: {
    seed: { preview: { volume: 40 } },
    viewModel: { inputs: { value: "preview.volume" }, label: "Volume" },
  },
});
