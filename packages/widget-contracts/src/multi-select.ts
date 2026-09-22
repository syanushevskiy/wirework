/**
 * `multi-select` contract — several choices from a dropdown.
 *
 * CONTROLLED like `select`: the chosen values live at the `value` port (an
 * array, default []); every change EMITS `changed` with ALL chosen values
 * and the required reaction writes them back. The options come from the
 * optional `options` port — a store path, so they can depend on another
 * widget's choice — and fall back to the `options` setting. A chosen value
 * that is no longer among the options is shown as it is; removing it is the
 * job of whoever changed the options (an action), not the widget's.
 * Implementations render a combobox named by `label` (else `placeholder`).
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";
import { choiceOptionsSchema, type ChoiceOption } from "./select";

const SAMPLE_OPTIONS: ChoiceOption[] = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" },
  { value: "three", label: "Three" },
];

export const multiSelectContract = defineContract({
  kind: "multi-select",
  description: "Several choices from a dropdown; emits every change with all chosen values",
  io: {
    inputs: {
      value: {
        description: "Store path holding the chosen options' values",
        value: z.array(z.string()),
        default: [],
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
      description: "Fired when the user adds or removes a choice; carries every chosen value",
      payload: z.object({ value: z.array(z.string()) }),
      required: true,
      primary: "value",
    },
  },
  settings: z.object({
    label: z.string().optional().describe("Field label, also the accessible name"),
    placeholder: z.string().default("Select…").describe("Shown while nothing is chosen"),
    options: choiceOptionsSchema.default(SAMPLE_OPTIONS).describe("Options while no options input is bound"),
    collapseTags: z.boolean().default(true).describe("Collapse chosen values that do not fit into +N"),
  }),
  preview: {
    seed: { preview: { choices: ["one", "three"] } },
    viewModel: {
      inputs: { value: "preview.choices" },
      on: { changed: [{ set: "preview.choices", from: "value" }] },
      label: "Choose several",
    },
  },
});
