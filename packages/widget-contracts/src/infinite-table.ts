/**
 * `infinite-table` contract — the `table` as an INFINITE LIST: the rows
 * scroll inside the widget, and when the end comes into view the widget
 * asks for MORE; its filters and sorting live in the column headers (the
 * `table`'s own header filters, ON here by default), so no filter bar and
 * no pagination stand next to it.
 *
 * Everything `table` says holds (the rows, their key, the columns, the
 * cells, the header filters and their ports and events, the column menu
 * and its state, the toolbar and its `refresh`, `row-selected`,
 * `link-clicked`, `load`). On top:
 *
 * - The `total` port says how many rows the server has: while fewer are
 *   held and the end of the list is in view, the widget EMITS `more` with
 *   the offset of the next row — once per set of rows, never while loading.
 *   The reaction appends the next rows: `{ call: "table-view/load", with:
 *   { into, more: true } }`. Without a total nothing is asked for.
 * - The rows held may be thousands; the widget renders a WINDOW of them —
 *   the rows around the visible part of its box, twice the box's height in
 *   all (doc/ADR/0007-row-window-and-header-filters.md) — so it works as a virtual list. The
 *   rows above and below the window are blank space of their height, so
 *   the scrollbar and the end of the list are where they would be with
 *   every row rendered.
 * - WINDOWED (the `windowed` setting; doc/ADR/0007-row-window-and-header-filters.md, "A slice of
 *   the list"): the widget does not hold the list either — only a SLICE of
 *   it, the rows from `offset` on. Its scrollbar spans the `total`, and it
 *   EMITS `window` AHEAD OF TIME: when the rows in view passed three
 *   quarters of the ones held and the list goes on, with `edge: "after"`
 *   and the offset the next batch begins at — the rows in view are still
 *   held, so the user scrolls into rows that are already there —; the same
 *   towards the start with `edge: "before"`; and, when the rows in view are
 *   not among the ones held (a jump), `edge: "around"` with the first row
 *   wanted. Never while loading. The reactions store the request and load:
 *   `{ set: "<into>.wanted" }` (the whole payload), then `{ call:
 *   "table-view/load", with: { into, window: true } }` — a batch joins the
 *   rows held (the farthest ones dropped beyond three batches), a slice
 *   around replaces them. `more` is never emitted. Ten thousand rows on the
 *   server are a few hundred in the store and two dozen in the DOM.
 * - THE END NOT KNOWN YET (the `hasMore` port, true: a server that does not
 *   count its rows; doc/ADR/0007-row-window-and-header-filters.md, "A list
 *   whose end is not known yet"): the `total` is then the rows KNOWN so
 *   far and the list goes on past it. `more` is emitted at the end even
 *   with every known row held, and the line reads "<held> rows, more to
 *   load"; a windowed list's scrollbar spans the rows known, the batch
 *   after them is asked for the same way, and its line reads "<total>+
 *   rows". Whoever loads the rows turns `hasMore` off when the end is
 *   found. Exposed as `data-open`.
 * - WHERE THE LIST STANDS is the `position` port: the first row in view,
 *   0-based in the whole list. The widget emits `position-changed` as it
 *   scrolls (written back by default) and SCROLLS to the position when
 *   something else changes it — a `list-position` widget bound to the same
 *   path shows where the list is and jumps anywhere in it.
 *
 * Implementations render the table inside a scrolling box of `height`
 * pixels with its header staying in view, expose what `table` exposes plus
 * the box as `data-testid="infinite-table-scroll"`, the rows held as
 * `data-held` and a line under the rows reading "<held> of <total>". The
 * box itself takes the keyboard focus (a region named by that line), so End,
 * Home and Page Down scroll it — a focused ROW would leave the DOM with the
 * window and drop the focus.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";
import {
  tableCellEvents,
  tableColumnEvents,
  tableColumnPorts,
  tableEvents,
  tableHeaderEvents,
  tableHeaderPorts,
  tablePorts,
  tableRowActionEvents,
  tableSettings,
  tableToolbarEvents,
} from "./table";

/** What a windowed list asks for: the batch after the rows held, the one before them, or a slice around a row. */
export const SLICE_EDGES = ["after", "before", "around"] as const;
export type SliceEdge = (typeof SLICE_EDGES)[number];

export const infiniteTableContract = defineContract({
  kind: "infinite-table",
  description: "A scrolling list that asks for more rows at its end; filters and sorting in the column headers",
  io: {
    inputs: {
      ...tablePorts,
      ...tableHeaderPorts,
      ...tableColumnPorts,
      total: {
        description: "Store path holding how many rows the server has (optional; without it nothing more is asked for)",
        value: z.number().int().min(0),
        required: false,
      },
      hasMore: {
        description:
          "Store path holding whether the list GOES ON past the total — the total is then the rows known so far, not all of them (optional; a server that does not count its rows — the loader writes it)",
        value: z.boolean(),
        required: false,
        default: false,
      },
      offset: {
        description:
          "Store path holding where in the whole list the rows held begin, 0-based (optional; a windowed list's slice — the loader writes it)",
        value: z.number().int().min(0),
        required: false,
        default: 0,
      },
      position: {
        description:
          "Store path holding the first row in view, 0-based in the whole list (optional; the list writes it as it scrolls and scrolls to it when something else changes it — a list-position widget)",
        value: z.number().int().min(0),
        required: false,
      },
    },
  },
  events: {
    ...tableEvents,
    ...tableHeaderEvents,
    ...tableColumnEvents,
    ...tableToolbarEvents,
    ...tableCellEvents,
    ...tableRowActionEvents,
    more: {
      description:
        "Fired when the end of the list comes into view and the server has more rows; carries the offset of the next one — call table-view/load with more: true",
      payload: z.object({ offset: z.number().int().min(0) }),
      primary: "offset",
    },
    window: {
      description:
        'Windowed list: fired AHEAD OF TIME, when the rows in view passed three quarters of the ones held — edge "after" (offset: where the next batch begins) or "before" (offset: the first row held) — and when they are not among the ones held — edge "around" (offset: the first row wanted). Store the whole payload ({ set: "<into>.wanted" }) and call table-view/load with window: true',
      payload: z.object({ offset: z.number().int().min(0), edge: z.enum(SLICE_EDGES) }),
      primary: "offset",
    },
    "position-changed": {
      description:
        "Fired as the list scrolls, with the first row in view (0-based in the whole list) and how many rows are in view",
      payload: z.object({ position: z.number().int().min(0), visible: z.number().int().min(0) }),
      // Where the list stands is state a list-position widget reads: written back by default when the port is bound.
      primary: "position",
      writesBack: "position",
    },
  },
  settings: z.object({
    ...tableSettings,
    // The one table kind whose headers are its only filters: on unless the page says otherwise.
    headerFilters: z
      .boolean()
      .default(true)
      .describe("Offer each column's filter and sorting in its header (what the column's filter and sortable say)"),
    height: z.number().int().min(100).default(400).describe("Height of the scrolling list, in pixels"),
    windowed: z
      .boolean()
      .default(false)
      .describe(
        "Hold only a SLICE of a long list: the scrollbar spans the total, and scrolling out of the rows held asks for the slice there (the `window` event) instead of appending — needs the total and offset ports",
      ),
  }),
  preview: {
    seed: {
      preview: {
        rows: [
          { id: "1", name: "Nightly", status: "Success" },
          { id: "2", name: "Smoke", status: "Failed" },
        ],
        total: 2,
      },
    },
    viewModel: {
      inputs: { rows: "preview.rows", total: "preview.total" },
      columns: [
        { title: "#", property: "id", sortable: true },
        { title: "Name", property: "name", filter: { kind: "text" } },
        {
          title: "Status",
          property: "status",
          cell: { kind: "tag", tones: { Success: "success", Failed: "danger" } },
          filter: { kind: "values", options: [{ value: "Success" }, { value: "Failed" }] },
        },
      ],
      height: 160,
    },
  },
});
