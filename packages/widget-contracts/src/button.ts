/**
 * Button contract: the archetypal INTENT widget — no inputs, no state, one
 * `clicked` event carrying the caption. Implementations render an element
 * with role "button" and the caption as its accessible name.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

/** How much a button stands out: the page's main action, a secondary one, an outlined one, a destructive one. */
export const BUTTON_VARIANTS = ["primary", "secondary", "dashed", "danger"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const buttonContract = defineContract({
  kind: "button",
  description: "A button that emits `clicked` — wire the click to a reaction or an action",
  io: { inputs: {} },
  events: {
    clicked: {
      description: "Fired on every click, with the button's caption",
      payload: z.object({ label: z.string() }),
    },
  },
  settings: z.object({
    label: z.string().default("Click me").describe("Button caption"),
    variant: z.enum(BUTTON_VARIANTS).default("primary").describe("How much the button stands out"),
    // A destructive click asks first: `clicked` is emitted on OK only — a setting, since the event does not change.
    confirm: z.string().optional().describe("A question asked before the click counts; the click is emitted on OK"),
  }),
  preview: { viewModel: { label: "Click me" } },
});
