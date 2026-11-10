/**
 * `number` contract — a number typed or stepped in a field (what `input`
 * with `type: number` cannot be: it emits text).
 *
 * CONTROLLED like `input`: the number lives at the `value` port — `null`
 * when the field is EMPTY, which is not 0: a form's "nothing" and a form's
 * zero are different answers. Every change EMITS `changed` and the default
 * reaction writes it back (`writesBack`). Implementations render
 * role=spinbutton named by `label`, with `min` / `max` as `aria-valuemin`
 * / `aria-valuemax`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const numberContract = defineContract({
  kind: "number",
  description: "A number typed or stepped in a field; emits every change (empty = null, not 0)",
  io: {
    inputs: {
      value: {
        description: "Store path holding the number (null while the field is empty)",
        value: z.number().finite().nullable(),
        default: null,
      },
    },
  },
  events: {
    changed: {
      description: "Fired on every change with the number, or null when the field was emptied",
      payload: z.object({ value: z.number().nullable() }),
      primary: "value",
      writesBack: "value",
    },
  },
  settings: z
    .object({
      label: z.string().default("Number").describe("Field label, also the accessible name"),
      placeholder: z.string().optional().describe("Shown while the field is empty"),
      min: z.number().optional().describe("The smallest number allowed"),
      max: z.number().optional().describe("The largest number allowed"),
      step: z.number().positive().default(1).describe("How far one step goes"),
      precision: z.number().int().min(0).max(6).optional().describe("Decimal places; any when absent"),
      prefix: z.string().optional().describe("Shown before the number (a currency sign)"),
      suffix: z.string().optional().describe("Shown after the number (a unit)"),
    })
    .refine((settings) => settings.min === undefined || settings.max === undefined || settings.min < settings.max, {
      message: "min must be below max",
      path: ["max"],
    }),
  preview: {
    seed: { preview: { seconds: 30 } },
    viewModel: { inputs: { value: "preview.seconds" }, label: "Refresh every", suffix: "s", min: 1 },
  },
});
