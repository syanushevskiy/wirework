/**
 * `card` contract — a card with a title around a LAYOUT of other widgets
 * (doc/ADR/0009-containers.md). The layout lives in the card's own template
 * (`content`, a page template: engine + cells), so it travels with the
 * card; the adapter renders it with the page's machinery. Nothing bound,
 * nothing emitted: the widgets inside do that.
 */
import { z } from "zod";
import { defineContract, NO_EVENTS, NO_IO, pageViewModelSchema } from "@wirework/schema";

export const CARD_SIZES = ["default", "small"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export const cardContract = defineContract({
  kind: "card",
  description: "A card with a title around a layout of other widgets",
  io: NO_IO,
  events: NO_EVENTS,
  settings: z.object({
    title: z.string().optional().describe("The card's title"),
    size: z.enum(CARD_SIZES).default("default").describe("How much room the card takes around its content"),
    /** The layout inside: a page template. A builder starts it empty on the page's own engine. */
    content: pageViewModelSchema.optional(),
  }),
  contains: ["content"],
  preview: { viewModel: { title: "Card", content: { engine: "react-grid-layout", cells: [] } } },
});
