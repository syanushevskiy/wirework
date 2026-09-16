/**
 * An APPLICATION-DEFINED contract: proof that new kinds are created and
 * registered in the host exactly like the standard ones. A status badge
 * shows one word of state read from the store, with an optional prefix.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS } from "@wirework/schema";

export const statusBadgeContract = defineContract({
  kind: "status-badge",
  description: "A one-word status read from the store",
  io: {
    inputs: {
      state: { description: "Store path holding the status word", value: z.string(), default: "unknown" },
    },
  },
  events: NO_EVENTS,
  settings: z.object({
    prefix: z.string().default("").describe("Text shown before the status"),
  }),
});
