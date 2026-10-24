/**
 * `infinite-table` contract — the `table` as an INFINITE LIST: the rows
 * scroll inside the widget, and when the end comes into view the widget
 * asks for MORE; filtering and sorting live in the column headers, so no
 * filter bar and no pagination stand next to it.
 *
 * Everything `table` says holds (the rows, their key, the columns, the
 * cells, `row-selected`, `link-clicked`, `load`). On top:
 *
 * - The `total` port says how many rows the server has: while fewer are
 *   held and the end of the list is in view, the widget EMITS `more` with
 *   the offset of the next row — once per set of rows, never while loading.
 *   The reaction appends the next rows: `{ call: "table-view/load", with:
 *   { into, more: true } }`. Without a total nothing is asked for.
 * - A column's `filter` (see table.ts) is offered IN ITS HEADER: a list of
 *   values to tick, or — for free text — a search icon opening a box to
 *   type in. What is chosen is CONTROLLED: the values at the `filterIn`
 *   port (`{ <property>: [values] }`, the filter bar's shape), the texts at
 *   `filterLike` (`{ <property>: "text" }`). Every change EMITS
 *   `filter-changed` with both, whole — empty ones left out, so they go
 *   into a request as they are — and the reactions write them back and
 *   re-request.
 * - A `sortable` column sorts on a header click: ascending, descending,
 *   then not at all. The order is controlled through the `orderBy` port
 *   (`{ <property>: "ASC" | "DESC" }`); a click EMITS `sort-changed`.
 *
 * Implementations render the table inside a scrolling box of `height`
 * pixels with its header staying in view, expose what `table` exposes plus
 * the box as `data-testid="infinite-table-scroll"` and a line under the
 * rows reading "<held> of <total>"; the filter trigger of a values column
 * shows a filter icon, that of a text column a SEARCH icon.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";
import { filterValuesSchema } from "./filter-bar";
import { tableEvents, tablePorts, tableSettings } from "./table";

/** Free text per column, the request's `filterLike`. */
export const searchValuesSchema = z.record(z.string(), z.string());
export type SearchValues = z.infer<typeof searchValuesSchema>;

/** The sort order per column, the request's `orderBy`. */
export const columnOrderSchema = z.record(z.string(), z.enum(["ASC", "DESC"]));
export type ColumnOrder = z.infer<typeof columnOrderSchema>;

export const infiniteTableContract = defineContract({
  kind: "infinite-table",
  description: "A scrolling list that asks for more rows at its end; filters and sorting in the column headers",
  io: {
    inputs: {
      ...tablePorts,
      total: {
        description: "Store path holding how many rows the server has (optional; without it nothing more is asked for)",
        value: z.number().int().min(0),
        required: false,
      },
      filterIn: {
        description: "Store path holding the values chosen in the headers, { <property>: [values] } (optional)",
        value: filterValuesSchema,
        required: false,
        default: {},
      },
      filterLike: {
        description: "Store path holding the texts searched for in the headers, { <property>: text } (optional)",
        value: searchValuesSchema,
        required: false,
        default: {},
      },
      orderBy: {
        description: 'Store path holding the sort order, { <property>: "ASC" | "DESC" } (optional)',
        value: columnOrderSchema,
        required: false,
        default: {},
      },
    },
  },
  events: {
    ...tableEvents,
    more: {
      description:
        "Fired when the end of the list comes into view and the server has more rows; carries the offset of the next one — call table-view/load with more: true",
      payload: z.object({ offset: z.number().int().min(0) }),
      primary: "offset",
    },
    "filter-changed": {
      description:
        "Fired when a header filter changes, with everything chosen: filterIn { <property>: [values] } and filterLike { <property>: text } (empty ones left out)",
      payload: z.object({ filterIn: filterValuesSchema, filterLike: searchValuesSchema }),
      primary: "filterIn",
    },
    "sort-changed": {
      description:
        'Fired when a header is clicked to sort, with the whole order: { <property>: "ASC" | "DESC" } ({} = none)',
      payload: z.object({ orderBy: columnOrderSchema }),
      primary: "orderBy",
    },
  },
  settings: z.object({
    ...tableSettings,
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
