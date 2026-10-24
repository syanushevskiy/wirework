/**
 * `table` contract — rows of records from the store, in columns. GENERIC: it
 * knows nothing about what a row is (it replaced a runs-only table).
 *
 * - The rows are an ARRAY OF OBJECTS at the `rows` port.
 * - Each row's identity is the value of its `rowKey` property (default
 *   "id") — never its position, so a re-sorted or re-fetched page keeps
 *   rows apart. A row without that property falls back to its position.
 * - Columns are `{ title, property, cell?, filter?, sortable? }`, the
 *   property a dot path into the row ("status.state"), the cell how its
 *   value is shown (table-cell.ts: text, a tag, a link, or a renderer the
 *   host registered). `filter` says what the column can be filtered by —
 *   a list of values, or free text — and `sortable` that the server sorts
 *   by it: DATA a loader derives from the server's description. They come
 *   from the optional `columns` port — a store path, so a host can load
 *   them (a table the server describes) — and fall back to the `columns`
 *   setting. Without either, one column per top-level field of the first
 *   row.
 * - With the `headerFilters` setting on (off here, on for `infinite-table`),
 *   a column's `filter` is offered IN ITS HEADER — a list of values to tick,
 *   or, for free text, a search icon opening a box to type in — and a
 *   `sortable` column sorts on a header click: ascending, descending, then
 *   not at all. What is chosen is CONTROLLED: the values at the `filterIn`
 *   port (`{ <property>: [values] }`, the filter bar's shape), the texts at
 *   `filterLike` (`{ <property>: "text" }`), the order at `orderBy`
 *   (`{ <property>: "ASC" | "DESC" }`). Every change EMITS `filter-changed`
 *   with both filters, whole — empty ones left out, so they go into a
 *   request as they are — or `sort-changed` with the whole order; the
 *   reactions write them back and re-request.
 * - A click on a row EMITS `row-selected` with the row's key and the row
 *   itself, so a reaction stores either (`from: "key"`, `from: "row.name"`).
 * - A plain click on a LINK cell EMITS `link-clicked` with the address
 *   instead (never `row-selected`): the reaction calls the host's navigation
 *   (`{ call: "nav/follow" }`). A modifier or middle click is the browser's
 *   (a new tab), as the link carries its real address.
 * - When the table APPEARS it emits `load`, once: the moment to fetch its
 *   data. The table itself never fetches — the reaction calls an action
 *   (`{ call: "table-view/load", with: { url, into } }`), which writes the
 *   rows where the table reads them.
 *
 * Implementations render a table and expose each row's key as
 * `data-row-key`, each cell's property as `data-property` and its kind as
 * `data-cell`; a tag cell exposes its tone as `data-tone`; the filter
 * trigger of a values column shows a filter icon, that of a text column a
 * SEARCH icon. They emit `load` AFTER mounting — once the page has bound
 * its reactions — and only once per mount (React's StrictMode mounts twice).
 */
import { z } from "zod";
import { defineContract, type WidgetEvents, type WidgetIO } from "@wirework/schema";
import { filterValuesSchema } from "./filter-bar";
import { choiceOptionsSchema } from "./select";
import { appPathSchema, tableCellSchema } from "./table-cell";

/** Free text per column, the request's `filterLike`. */
export const searchValuesSchema = z.record(z.string(), z.string());
export type SearchValues = z.infer<typeof searchValuesSchema>;

/** The sort order per column, the request's `orderBy`. */
export const columnOrderSchema = z.record(z.string(), z.enum(["ASC", "DESC"]));
export type ColumnOrder = z.infer<typeof columnOrderSchema>;

/**
 * What a column can be filtered by: one or more of a list of VALUES (the
 * request's `filterIn`), or free TEXT the user types (`filterLike`) — the
 * two groups of the view table API a header can ask for.
 */
export const columnFilterSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("values"), options: choiceOptionsSchema }).strict(),
  z.object({ kind: z.literal("text") }).strict(),
]);
export type ColumnFilter = z.infer<typeof columnFilterSchema>;

export const tableColumnSchema = z
  .object({
    /** Header text. */
    title: z.string(),
    /** Dot path into the row ("name", "status.state"). */
    property: z.string().min(1),
    /** How the value is shown; text when absent. */
    cell: tableCellSchema.optional(),
    /** What the column can be filtered by; nothing when absent. */
    filter: columnFilterSchema.optional(),
    /** Whether the server sorts by this column; not when absent. */
    sortable: z.boolean().optional(),
  })
  .strict();
export type TableColumn = z.infer<typeof tableColumnSchema>;

export const tableRowsSchema = z.array(z.record(z.string(), z.unknown()));
export type TableRow = z.infer<typeof tableRowsSchema>[number];

/**
 * What every table kind READS — shared with `infinite-table`, which adds
 * ports of its own, so a loader pointed at one root fills either.
 */
export const tablePorts = {
  rows: {
    description: "Store path holding the rows (an array of objects)",
    value: tableRowsSchema,
    default: [],
    // A generated path ends in `data`, not `rows`: loaders put rows at
    // `<into>.data` (next to `.columns` and `.loading`, which already
    // match), so a loader pointed at `<page>.table` fills this table.
    suggestedName: "data",
  },
  loading: {
    description: "Store path that is true while rows are being fetched (optional; shows a spinner over them)",
    value: z.boolean(),
    required: false,
    default: false,
  },
  columns: {
    description:
      "Store path holding the columns [{ title, property }] (optional; falls back to the setting) — for a table the SERVER describes",
    value: z.array(tableColumnSchema),
    required: false,
  },
} satisfies WidgetIO["inputs"];

/** What a table's HEADERS read when they filter and sort: the choice, controlled (shared by every table kind). */
export const tableHeaderPorts = {
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
} satisfies WidgetIO["inputs"];

/** What a table's HEADERS emit: the whole filter choice, the whole order (shared by every table kind). */
export const tableHeaderEvents = {
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
} satisfies WidgetEvents;

/** What every table kind EMITS: its appearance, a row click, a link click. */
export const tableEvents = {
  load: {
    description: "Fired once when the table appears — call the action that loads its data",
    payload: z.object({}),
  },
  "row-selected": {
    description: "Fired when the user clicks a row; carries its key and the row",
    payload: z.object({ key: z.string(), row: z.record(z.string(), z.unknown()) }),
    primary: "key",
  },
  "link-clicked": {
    description: "Fired when the user clicks a link cell; carries the address — call nav/follow",
    payload: z.object({
      href: appPathSchema,
      key: z.string(),
      property: z.string(),
      row: z.record(z.string(), z.unknown()),
    }),
    primary: "href",
  },
} satisfies WidgetEvents;

/** The settings every table kind has. */
export const tableSettings = {
  columns: z
    .array(tableColumnSchema)
    .default([])
    .describe(
      'Columns { title, property, cell? }; empty = one per field of the first row. cell: { "kind": "tag", "tones": { "Failed": "danger" } } or { "kind": "link", "to": "/demo/runs/{id}" }',
    ),
  rowKey: z.string().min(1).default("id").describe("Row property holding each row's stable identity"),
  emptyText: z.string().default("No rows").describe("Shown when there are no rows"),
  headerFilters: z
    .boolean()
    .default(false)
    .describe("Offer each column's filter and sorting in its header (what the column's filter and sortable say)"),
};

export const tableContract = defineContract({
  kind: "table",
  description:
    "Rows from the store in columns; emits the row a user clicks; filters and sorting in the headers on request",
  io: { inputs: { ...tablePorts, ...tableHeaderPorts } },
  events: { ...tableEvents, ...tableHeaderEvents },
  settings: z.object(tableSettings),
  preview: {
    seed: {
      preview: {
        rows: [
          { id: "1", name: "Nightly", status: "Success" },
          { id: "2", name: "Smoke", status: "Failed" },
        ],
      },
    },
    viewModel: {
      inputs: { rows: "preview.rows" },
      columns: [
        { title: "#", property: "id" },
        { title: "Name", property: "name" },
        { title: "Status", property: "status", cell: { kind: "tag", tones: { Success: "success", Failed: "danger" } } },
      ],
    },
  },
});
