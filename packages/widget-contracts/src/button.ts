/**
 * Button contract: the archetypal INTENT widget — no inputs, no state, one
 * `clicked` event carrying the caption. Implementations render an element
 * with role "button" and the caption as its accessible name.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

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
  }),
  preview: { viewModel: { label: "Click me" } },
});
