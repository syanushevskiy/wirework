/**
 * `switch` contract — an on/off toggle (what a checkbox is for a setting
 * that takes effect at once).
 *
 * CONTROLLED: whether it is on lives at the `checked` port; every change
 * EMITS `changed` and the default reaction writes it back (`writesBack`).
 * Implementations render role=switch named by `label`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const switchContract = defineContract({
  kind: "switch",
  description: "An on/off toggle; emits every change",
  io: {
    inputs: {
      checked: { description: "Store path holding whether it is on", value: z.boolean(), default: false },
    },
  },
  events: {
    changed: {
      description: "Fired when the user turns it on or off",
      payload: z.object({ checked: z.boolean() }),
      primary: "checked",
      writesBack: "checked",
    },
  },
  settings: z.object({
    label: z.string().default("Switch").describe("Caption, also the accessible name"),
    onText: z.string().optional().describe("Text inside the switch while on"),
    offText: z.string().optional().describe("Text inside the switch while off"),
  }),
  preview: {
    seed: { preview: { on: true } },
    viewModel: { inputs: { checked: "preview.on" }, label: "Notifications" },
  },
});
