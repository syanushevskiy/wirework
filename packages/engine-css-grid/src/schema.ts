/**
 * css-grid page template (doc/css-grid-design.md): the page is a CSS grid
 * of SLOTS. `areas` is CSS's own `grid-template-areas`, one string per row,
 * its tokens the ids of the page's cells and "." for an empty slot — the
 * cell's id IS its area, there is no mapping. `columns` and `rows` size the
 * tracks (one size each: "1fr", "12rem", "auto", "minmax(8rem, 1fr)"),
 * `gap` the room between slots. A cell carries only `CellBase`: where it
 * sits is where its id appears in the picture; a cell named nowhere is
 * auto-placed after the grid, and `validate` says so.
 *
 * The CHANGE payload is what edit mode reports: the whole picture after a
 * drop, a pick in the slot table or a row or column added or removed (with
 * the tracks that follow the grid's new size), or one of the three sizing
 * fields.
 */
import { z } from "zod";
import { cellBaseSchema } from "@wirework/schema";

export const cssGridPageSchema = z.object({
  engine: z.literal("css-grid"),
  /** grid-template-areas, one string per row; tokens are cell ids or "." for an empty slot. */
  areas: z.array(z.string()),
  /** grid-template-columns as one track size per column; "1fr" each when absent. */
  columns: z.array(z.string()).optional(),
  /** grid-template-rows as one track size per row; "auto" each when absent. */
  rows: z.array(z.string()).optional(),
  /** The gap between slots, a CSS length; the stylesheet's when absent. */
  gap: z.string().optional(),
  cells: z.array(cellBaseSchema),
});
export type CssGridPage = z.infer<typeof cssGridPageSchema>;

export const cssGridChangeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("areas"),
    areas: z.array(z.string()),
    /** The tracks when the picture's size changed with it (a column added takes "1fr"). */
    columns: z.array(z.string()).optional(),
    rows: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal("tracks"),
    columns: z.array(z.string()).optional(),
    rows: z.array(z.string()).optional(),
    gap: z.string().optional(),
  }),
]);
export type CssGridChange = z.infer<typeof cssGridChangeSchema>;

/** A rectangle of slots, rows and columns counted from 0, both ends inclusive. */
export interface Span {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

/** The token of an empty slot, as CSS writes it. */
export const EMPTY = ".";

/** The track sizes the typed form offers: a number with one of the units, or a keyword. */
export const TRACK_UNITS = ["fr", "px", "rem", "%"] as const;
export const TRACK_KEYWORDS = ["auto", "min-content", "max-content"] as const;
