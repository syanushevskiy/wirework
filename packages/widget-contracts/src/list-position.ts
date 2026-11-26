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
 * A list whose END IS NOT KNOWN yet (`hasMore` true: `total` is the rows
 * known so far) is shown as "401–425 of 800+": the scale runs over the
 * rows known and grows with them — but keeps its length while its handle
 * is held —, and no percent is shown: a share of an unknown whole would be
 * a guess. Exposed as `data-open`.
 *
 * Implementations render the scale as a role=slider named by the `label`
 * setting, over the positions 0 … total − visible, moving in whole rows,
 * and show the percent as how far the LAST row in view is into the list
 * (the end of the list is 100%). With `vertical` the scale stands upright
 * (aria-orientation "vertical"), the START of the list at its top — as a
 * scrollbar beside the list would — and the texts sit under it.
 *
 * AS PAGES (`mode: "pages"`): the same position, said and moved in PAGES of
 * `pageSize` rows — a pagination in place of the scale, its current page
 * the one the list stands in (`listPage`), following the list as it
 * scrolls; choosing a page EMITS the same `changed` with that page's first
 * row. The list is not cut into pages — it scrolls on as it did; the pages
 * are a way to say where it stands and to go somewhere. Exposed as
 * `data-mode`, `data-page`, `data-pages`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

/** How far into a list its last row in view is, 0–100 — one rule for every implementation. */
export function listPercent(position: number, visible: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Math.min(total, position + Math.max(1, visible)) / total) * 100));
}

/** How many pages of `pageSize` rows a list of `total` rows is — one at least: an empty list stands on page 1 of 1. */
export function listPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/**
 * The page a list STANDS in, from 1 — one rule for every implementation: the
 * page of its first row in view, and the LAST page once its last row is in
 * view (the end of a list is rarely the start of a page: without this the
 * last page would never be the current one).
 */
export function listPage(position: number, visible: number, total: number, pageSize: number): number {
  const pages = listPages(total, pageSize);
  if (total > 0 && position + Math.max(1, visible) >= total) return pages;
  return Math.min(pages, Math.floor(position / Math.max(1, pageSize)) + 1);
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
      hasMore: {
        description:
          'Store path holding whether the list GOES ON past the total — the total is then the rows known so far (optional; shown as "of 800+", no percent)',
        value: z.boolean(),
        required: false,
        default: false,
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
    mode: z
      .enum(["scale", "pages"])
      .default("scale")
      .describe(
        "How the position is shown and moved: scale — a slider over the whole list —, or pages — a pagination whose current page follows the list as it scrolls",
      ),
    pageSize: z
      .number()
      .int()
      .min(1)
      .default(50)
      .describe("Rows a page, with mode pages (the list still scrolls: a page is only a way to say where it stands)"),
    showQuickJumper: z
      .boolean()
      .default(false)
      .describe(
        'With mode pages, offer a "Go to" field: a page number typed and entered is where the list goes, however far it is',
      ),
  }),
  preview: {
    seed: { preview: { position: 400, visible: 25, total: 2000 } },
    viewModel: {
      inputs: { position: "preview.position", visible: "preview.visible", total: "preview.total" },
    },
  },
});
