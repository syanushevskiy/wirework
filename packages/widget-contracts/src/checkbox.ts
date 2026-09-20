/**
 * `checkbox` contract — a yes/no choice (doc/widget-catalog.md, #3).
 *
 * CONTROLLED: whether it is checked lives at the `checked` port; every
 * change EMITS `changed` and the required reaction writes it back.
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
      required: true,
      primary: "checked",
    },
  },
  settings: z.object({
    label: z.string().default("Checkbox").describe("Caption, also the accessible name"),
  }),
  preview: {
    seed: { preview: { checked: true } },
    viewModel: {
      inputs: { checked: "preview.checked" },
      on: { changed: [{ set: "preview.checked", from: "checked" }] },
      label: "Remember me",
    },
  },
});
