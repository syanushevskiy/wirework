/**
 * `list-position` contract — where a long list STANDS, and a way to jump:
 * what a pagination is for pages, for a list that scrolls. It reads the
 * first row in view (`position`, 0-based), how many rows are in view
 * (`visible`) and how many there are (`total`), says so — "401–425 of
 * 2 000 · 21%" — and offers a scale over the whole list: moving its handle
 * EMITS `changed` with the position asked for, written back by default.
 *
 * Bound to the paths an `infinite-table` writes its `position` to and reads
 * it from, the two follow each other: the list scrolls and the scale moves;
 * the scale is moved and the list scrolls there — and, windowed, asks for
 * the slice of rows at that place. The widget itself knows no list.
 *
 * Implementations render the scale as a role=slider named by the `label`
 * setting, over the positions 0 … total − visible, moving in whole rows,
 * and show the percent as how far the LAST row in view is into the list
 * (the end of the list is 100%). With `vertical` the scale stands upright
 * (aria-orientation "vertical"), the START of the list at its top — as a
 * scrollbar beside the list would — and the texts sit under it.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

/** How far into a list its last row in view is, 0–100 — one rule for every implementation. */
export function listPercent(position: number, visible: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Math.min(total, position + Math.max(1, visible)) / total) * 100));
}

export const listPositionContract = defineContract({
  kind: "list-position",
  description: "Where a scrolling list stands — rows in view, of how many, as a percent — and a scale to jump along it",
  io: {
    inputs: {
      position: {
        description: "Store path holding the first row in view, 0-based (what an infinite-table writes as it scrolls)",
        value: z.number().int().min(0),
        default: 0,
      },
      total: {
        description: "Store path holding how many rows the list has",
        value: z.number().int().min(0),
        default: 0,
      },
      visible: {
        description: "Store path holding how many rows are in view (optional; one without it)",
        value: z.number().int().min(0),
        required: false,
      },
    },
  },
  events: {
    changed: {
      description: "Fired when the user moves the scale; carries the first row to show",
      payload: z.object({ position: z.number().int().min(0) }),
      // The position asked for is state the list depends on: written back by default.
      primary: "position",
      writesBack: "position",
    },
  },
  settings: z.object({
    label: z.string().default("Position in the list").describe("Names the scale for screen readers"),
    showRange: z.boolean().default(true).describe('Show the rows in view and the total: "401–425 of 2 000"'),
    showPercent: z.boolean().default(true).describe("Show how far into the list the rows in view are, in percent"),
    vertical: z
      .boolean()
      .default(false)
      .describe("Stand the scale upright, the start of the list at its top — for a place beside the list"),
  }),
  preview: {
    seed: { preview: { position: 400, visible: 25, total: 2000 } },
    viewModel: {
      inputs: { position: "preview.position", visible: "preview.visible", total: "preview.total" },
    },
  },
});
