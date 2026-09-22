/**
 * `select` contract — one choice from a dropdown.
 *
 * CONTROLLED like `input`: the chosen value lives at the `value` port ("" =
 * nothing chosen); every pick EMITS `changed` and the required reaction
 * writes it back. The options come from the optional `options` port — a
 * store path, so a host can load them (the applications a filter offers) —
 * and fall back to the `options` setting. Implementations render a
 * combobox named by `label` (else `placeholder`); clearing emits "".
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

/** One option of a choice widget. Shared by the choice kinds to come (radio-group, segmented). */
export const choiceOptionSchema = z
  .object({
    value: z.string().min(1),
    /** Shown instead of the value when present. */
    label: z.string().optional(),
    disabled: z.boolean().optional(),
  })
  .strict();
export const choiceOptionsSchema = z.array(choiceOptionSchema);
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;

const SAMPLE_OPTIONS: ChoiceOption[] = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" },
  { value: "three", label: "Three" },
];

export const selectContract = defineContract({
  kind: "select",
  description: "One choice from a dropdown; emits every pick",
  io: {
    inputs: {
      value: {
        description: 'Store path holding the chosen option\'s value ("" = nothing chosen)',
        value: z.string(),
        default: "",
      },
      options: {
        description: "Store path holding the options [{ value, label? }] (optional; falls back to the setting)",
        value: choiceOptionsSchema,
        required: false,
      },
    },
  },
  events: {
    changed: {
      description: 'Fired when the user picks an option, or clears the choice ("")',
      payload: z.object({ value: z.string() }),
      required: true,
      primary: "value",
    },
  },
  settings: z.object({
    label: z.string().optional().describe("Field label, also the accessible name"),
    placeholder: z.string().default("Select…").describe("Shown while nothing is chosen"),
    options: choiceOptionsSchema.default(SAMPLE_OPTIONS).describe("Options while no options input is bound"),
    allowClear: z.boolean().default(true).describe("Let the user clear the choice"),
  }),
  preview: {
    seed: { preview: { choice: "two" } },
    viewModel: {
      inputs: { value: "preview.choice" },
      on: { changed: [{ set: "preview.choice", from: "value" }] },
      label: "Choose one",
    },
  },
});
