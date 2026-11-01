/**
 * `checkbox` contract — a yes/no choice.
 *
 * CONTROLLED: whether it is checked lives at the `checked` port; every
 * change EMITS `changed` and the default reaction writes it back (`writesBack`).
 * Implementations render role=checkbox named by `label`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const checkboxContract = defineContract({
  kind: "checkbox",
  description: "A yes/no choice; emits every change",
  io: {
    inputs: {
      checked: { description: "Store path holding whether it is checked", value: z.boolean(), default: false },
    },
  },
  events: {
    changed: {
      description: "Fired when the user checks or unchecks it",
      payload: z.object({ checked: z.boolean() }),
      primary: "checked",
      writesBack: "checked",
    },
  },
  settings: z.object({
    label: z.string().default("Checkbox").describe("Caption, also the accessible name"),
  }),
  preview: {
    seed: { preview: { checked: true } },
    viewModel: {
      inputs: { checked: "preview.checked" },
      label: "Remember me",
    },
  },
});
