/**
 * `pagination` contract — page navigation over a known total.
 *
 * The widget OWNS nothing: the current page (and optionally the page size)
 * live at store paths it reads, and every user interaction is a `changed`
 * event carrying the page the user asked for. A reaction writes it back,
 * exactly like the input contract's text — so a table, a URL and a fetch
 * can all react to the same change (doc/widget-contracts-design.md).
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

/** Sizes an implementation must offer. */
export const PAGINATION_SIZES = ["default", "small"] as const;
export type PaginationSize = (typeof PAGINATION_SIZES)[number];

export const paginationContract = defineContract({
  kind: "pagination",
  description: "Page navigation over a total number of items; emits every page change",
  io: {
    inputs: {
      page: {
        description: "Store path holding the current page (1-based)",
        value: z.number().int().min(1),
        default: 1,
      },
      total: {
        description: "Store path holding the total number of items",
        value: z.number().int().min(0),
        default: 0,
      },
      pageSize: {
        description: "Store path holding the page size (optional; falls back to the setting)",
        value: z.number().int().min(1),
        required: false,
      },
    },
  },
  events: {
    changed: {
      description: "Fired when the user picks a page or changes the page size",
      payload: z.object({ page: z.number().int().min(1), pageSize: z.number().int().min(1) }),
      // The page the user asked for is state others depend on.
      required: true,
      primary: "page",
    },
  },
  settings: z.object({
    pageSize: z.number().int().min(1).default(10).describe("Items per page while no page-size input is bound"),
    showSizeChanger: z.boolean().default(false).describe("Let the user change the page size"),
    showTotal: z.boolean().default(true).describe("Show the item range and the total"),
    size: z.enum(PAGINATION_SIZES).default("default").describe("Visual density"),
  }),
  preview: {
    seed: { preview: { page: 2, total: 50 } },
    viewModel: {
      inputs: { page: "preview.page", total: "preview.total" },
      on: { changed: [{ set: "preview.page", from: "page" }] },
      size: "small",
      showTotal: false,
    },
  },
});
