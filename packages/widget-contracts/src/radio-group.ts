/**
 * `radio-group` contract — one choice from a few shown side by side (what a
 * `select` is for a long list).
 *
 * CONTROLLED like `select`: the chosen value lives at the `value` port ("" =
 * nothing chosen); every pick EMITS `changed` and the default reaction
 * writes it back. The options come from the optional `options` port and
 * fall back to the `options` setting. Implementations render role=radiogroup
 * named by `label`, each option a radio named by its label.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";
import { choiceOptionsSchema, type ChoiceOption } from "./select";

const SAMPLE_OPTIONS: ChoiceOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const radioGroupContract = defineContract({
  kind: "radio-group",
  description: "One choice from a few shown side by side; emits every pick",
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
      description: "Fired when the user picks an option",
      payload: z.object({ value: z.string() }),
      primary: "value",
      writesBack: "value",
    },
  },
  settings: z.object({
    label: z.string().default("Choose").describe("Caption, also the accessible name"),
    options: choiceOptionsSchema.default(SAMPLE_OPTIONS).describe("Options while no options input is bound"),
    buttons: z.boolean().default(false).describe("Show the options as a row of buttons instead of radios"),
  }),
  preview: {
    seed: { preview: { priority: "medium" } },
    viewModel: { inputs: { value: "preview.priority" }, label: "Priority" },
  },
});
