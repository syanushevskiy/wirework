/**
 * `infinite-table` contract — the `table` as an INFINITE LIST: the rows
 * scroll inside the widget, and when the end comes into view the widget
 * asks for MORE; its filters and sorting live in the column headers (the
 * `table`'s own header filters, ON here by default), so no filter bar and
 * no pagination stand next to it.
 *
 * Everything `table` says holds (the rows, their key, the columns, the
 * cells, the header filters and their ports and events, `row-selected`,
 * `link-clicked`, `load`). On top:
 *
 * - The `total` port says how many rows the server has: while fewer are
 *   held and the end of the list is in view, the widget EMITS `more` with
 *   the offset of the next row — once per set of rows, never while loading.
 *   The reaction appends the next rows: `{ call: "table-view/load", with:
 *   { into, more: true } }`. Without a total nothing is asked for.
 * - The rows held may be thousands; the widget renders a WINDOW of them —
 *   the rows around the visible part of its box, twice the box's height in
 *   all (doc/row-window-design.md) — so it works as a virtual list. The
 *   rows above and below the window are blank space of their height, so
 *   the scrollbar and the end of the list are where they would be with
 *   every row rendered.
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
import { tableEvents, tableHeaderEvents, tableHeaderPorts, tablePorts, tableSettings } from "./table";

export const infiniteTableContract = defineContract({
  kind: "infinite-table",
  description: "A scrolling list that asks for more rows at its end; filters and sorting in the column headers",
  io: {
    inputs: {
      ...tablePorts,
      ...tableHeaderPorts,
      total: {
        description: "Store path holding how many rows the server has (optional; without it nothing more is asked for)",
        value: z.number().int().min(0),
        required: false,
      },
    },
  },
  events: {
    ...tableEvents,
    ...tableHeaderEvents,
    more: {
      description:
        "Fired when the end of the list comes into view and the server has more rows; carries the offset of the next one — call table-view/load with more: true",
      payload: z.object({ offset: z.number().int().min(0) }),
      primary: "offset",
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
