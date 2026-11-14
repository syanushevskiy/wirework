/**
 * `dialog` contract — a LAYOUT of other widgets shown over the page, as a
 * modal or a drawer (doc/ADR/0009-containers.md: a container; the layout
 * lives in the dialog's own template, `content`). The first container with
 * a PORT: whether it is open lives at the `open` port — a button opens it
 * with a `set` reaction on that path; the close icon, the mask and Escape
 * EMIT `changed { open: false }`, written back by the default reaction.
 * One kind for a modal and a drawer: the ports, the events and the content
 * are the same, the look is the `as` setting. With `inline` the dialog
 * shows in place instead of over the page — what a palette preview and a
 * story need; a page edits the content where any container's is edited
 * ("Edit content"). Implementations render role=dialog named by `title`
 * and expose `data-open`.
 */
import { z } from "zod";
import { defineContract, pageViewModelSchema } from "@wirework/schema";

export const DIALOG_KINDS = ["modal", "drawer"] as const;
export type DialogKind = (typeof DIALOG_KINDS)[number];

export const DRAWER_PLACEMENTS = ["right", "left", "top", "bottom"] as const;
export type DrawerPlacement = (typeof DRAWER_PLACEMENTS)[number];

export const dialogContract = defineContract({
  kind: "dialog",
  description: "A layout of widgets shown over the page as a modal or a drawer while its `open` path is true",
  io: {
    inputs: {
      open: {
        description: "Store path holding whether the dialog is open (a button sets it true)",
        value: z.boolean(),
        default: false,
      },
    },
  },
  events: {
    changed: {
      description: "Fired when the user closes the dialog (the close icon, the mask, Escape)",
      payload: z.object({ open: z.boolean() }),
      primary: "open",
      writesBack: "open",
    },
  },
  settings: z.object({
    title: z.string().optional().describe("The dialog's title, also its accessible name"),
    as: z.enum(DIALOG_KINDS).default("modal").describe("A modal in the middle, or a drawer from an edge"),
    placement: z.enum(DRAWER_PLACEMENTS).default("right").describe("Which edge a drawer comes from"),
    width: z.number().positive().optional().describe("Width in pixels (a modal, or a drawer from the side)"),
    inline: z.boolean().default(false).describe("Show in place instead of over the page (previews, layout work)"),
    /** The layout inside: a page template. A builder starts it empty on the page's own engine. */
    content: pageViewModelSchema.optional(),
  }),
  contains: ["content"],
  preview: {
    seed: { preview: { open: true } },
    viewModel: {
      inputs: { open: "preview.open" },
      title: "Dialog",
      inline: true,
      content: { engine: "react-grid-layout", cells: [] },
    },
  },
});
