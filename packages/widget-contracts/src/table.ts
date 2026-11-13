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
 *   a column's `filter` is offered IN ITS HEADER — a list of values to pick
 *   several of (every pick filters at once; Reset clears, Done closes),
 *   or, for free text, a search icon opening a box to type in — and a
 *   `sortable` column sorts on a header click: ascending, descending, then
 *   not at all. What is chosen is CONTROLLED: the values at the `filterIn`
 *   port (`{ <property>: [values] }`, the filter bar's shape), the texts at
 *   `filterLike` (`{ <property>: "text" }`), the order at `orderBy`
 *   (`{ <property>: "ASC" | "DESC" }`). Every change EMITS `filter-changed`
 *   with both filters, whole — empty ones left out, so they go into a
 *   request as they are — or `sort-changed` with the whole order; the
 *   reactions write them back and re-request.
 * - With the `filterRow` setting on, a column's `filter` is a control UNDER
 *   its header, always in view (doc/table-filters-cards-design.md): a search
 *   field with a search icon for free text — Enter or leaving the field
 *   applies it —, a list of values to pick otherwise. It reads the same
 *   `filterIn` / `filterLike` ports and emits the same `filter-changed`, so
 *   the header dropdowns, a filter bar and the row are views of one choice.
 * - A column whose `filter` is `{ kind: "dates" }` — a DATE column — is
 *   filtered by a PERIOD: its header's icon (a calendar) opens a start and
 *   an end date, either of which may stay open. What is chosen is read from
 *   the `filterBetween` port (`{ <property>: [from, to] }`, the dates as
 *   the date widgets' text) and travels in the same `filter-changed`, so a
 *   page stores it like the other two: `{ set: "<into>.filterBetween",
 *   from: "filterBetween" }`.
 * - With the `columnMenu` setting on (the default), a button above the table opens the
 *   COLUMN MENU: every column with a checkbox (shown or hidden), in an
 *   order the user changes by dragging, and Reset, which brings back the
 *   columns as configured. What the user chose is the COLUMN STATE
 *   (`{ order, hidden }`, by property; both empty = as configured). WHERE
 *   it lives is configuration: bound, the `columnState` port — a store
 *   path, so the host keeps it where it keeps anything; unbound, the
 *   browser's local storage under `columnStateKey` (or a key made from the
 *   `rows` path), so it is still there after a reload. Every change EMITS
 *   `columns-changed` with the whole state, written back to the port by
 *   default. The state only shows and orders what the table already has:
 *   a column it does not name stands after the ones it does, shown.
 * - The TOOLBAR (the `toolbar` setting) is a row of tools above the table,
 *   beside the column menu's button: a list of `{ name, params? }`, each
 *   NAME an item the implementation knows — as a custom cell's name is a
 *   renderer. Two are standard: `reset-filters` EMITS `filter-changed` with
 *   nothing chosen (disabled while nothing is), and `refresh` EMITS
 *   `refresh` — the reaction asks for the rows again (`{ call:
 *   "table-view/load", with: { into } }`). A HOST registers items of its
 *   own by name, and one registered under a standard name REPLACES it — its
 *   own refresher under `refresh`.
 * - A table SCROLLS SIDEWAYS when its box is narrower than its columns need:
 *   a column is `COLUMN_WIDTH.default` (110) px wide, an id column
 *   (`isIdColumn`: the rows' key, or a property named like one) 88, unless
 *   it says its own `width`; the sum over the columns shown (`tableWidth`)
 *   is the least the table needs. In a wider box it stretches to fill it.
 * - CELLS ARE SELECTED as in a spreadsheet (the `cellSelection` setting,
 *   on by default): a click selects a cell, a drag from it — or from the
 *   small square at the selection's bottom-right corner — or a Shift+click
 *   a RECTANGLE of cells. A right click opens a menu: Copy and Copy with
 *   headers put the rectangle on the clipboard, a line per row, the cells
 *   tab-separated (Ctrl/Cmd+C copies too) and EMIT `cells-copied`; Export
 *   as CSV saves EVERY row the table holds, in the columns shown, as
 *   `<exportName>.csv` and EMITS `rows-exported`. What a cell copies is its
 *   text — a tag's too — and for a LINK cell the address it leads to.
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
 * SEARCH icon; a control of the filter row is `data-testid="table-filter"`
 * with its column's title as `data-column`, what is chosen as `data-values`
 * and the role searchbox or combobox, named "Filter <title>"; the column
 * menu's button is named "Column settings", each column in it a checkbox
 * named by its title, and Reset a button, disabled while nothing is
 * changed; the toolbar is a toolbar named "Table tools", each item in it
 * `data-testid="table-toolbar-item"` with its name as `data-name`, the
 * standard ones buttons named "Reset filters" and "Reload". They emit `load` AFTER mounting — once the page has bound
 * its reactions — and only once per mount (React's StrictMode mounts twice).
 */
import { z } from "zod";
import { defineContract, type WidgetEvents, type WidgetIO } from "@wirework/schema";
import { dateRangeSchema } from "./date-range";
import { filterValuesSchema } from "./filter-bar";
import { choiceOptionsSchema } from "./select";
import { appPathSchema, tableCellSchema } from "./table-cell";

/** Free text per column, the request's `filterLike`. */
export const searchValuesSchema = z.record(z.string(), z.string());
export type SearchValues = z.infer<typeof searchValuesSchema>;

/** The sort order per column, the request's `orderBy`. */
export const columnOrderSchema = z.record(z.string(), z.enum(["ASC", "DESC"]));
export type ColumnOrder = z.infer<typeof columnOrderSchema>;

/** A PERIOD per column, the request's `filterBetween`: [from, to] as the date widgets' text, either end "" for open. */
export const periodValuesSchema = z.record(z.string(), dateRangeSchema);
export type PeriodValues = z.infer<typeof periodValuesSchema>;

/**
 * What a column can be filtered by: one or more of a list of VALUES (the
 * request's `filterIn`), free TEXT the user types (`filterLike`), or — a
 * date column — a PERIOD, a start and an end date (`filterBetween`): the
 * three groups of the view table API a header can ask for.
 */
export const columnFilterSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("values"), options: choiceOptionsSchema }).strict(),
  z.object({ kind: z.literal("text") }).strict(),
  z.object({ kind: z.literal("dates") }).strict(),
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
    /** The column's width in pixels; without it `columnWidth` decides (110, an id column 88). */
    width: z.number().int().min(20).optional(),
  })
  .strict();
export type TableColumn = z.infer<typeof tableColumnSchema>;

/** A column's width in pixels unless it says its own: an id column's, and everything else's. */
export const COLUMN_WIDTH = { id: 88, default: 110 } as const;

/** Whether a column holds an identity: the rows' key, or a property named like one ("id", "run.id", "user_id", "ownerId"). */
export const isIdColumn = (property: string, rowKey: string): boolean =>
  property === rowKey || /(^|[._-])id$/i.test(property) || /[a-z0-9]Id$/.test(property);

/** The width of one column, in pixels: its own, or the default for what it holds. */
export const columnWidth = (column: Pick<TableColumn, "property" | "width">, rowKey: string): number =>
  column.width ?? (isIdColumn(column.property, rowKey) ? COLUMN_WIDTH.id : COLUMN_WIDTH.default);

/**
 * The least width a table needs, in pixels: the sum of its columns' widths.
 * A table in a narrower box SCROLLS sideways; in a wider one it stretches to
 * fill it.
 */
export const tableWidth = (columns: Pick<TableColumn, "property" | "width">[], rowKey: string): number =>
  columns.reduce((sum, column) => sum + columnWidth(column, rowKey), 0);

/**
 * What the user made of the columns in the column menu, by property: the
 * order they stand in (empty = as configured) and the ones hidden.
 */
export const columnStateSchema = z
  .object({
    order: z.array(z.string()).default([]),
    hidden: z.array(z.string()).default([]),
  })
  .strict();
export type ColumnState = z.infer<typeof columnStateSchema>;

/**
 * One item of the TOOLBAR above a table: the name an implementation — or
 * the host — registered it under, and `params` passed to it as they are.
 */
export const toolbarItemSchema = z
  .object({
    name: z.string().min(1),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type ToolbarItem = z.infer<typeof toolbarItemSchema>;

/** The toolbar items every implementation has. */
export const TOOLBAR_ITEMS = ["reset-filters", "refresh"] as const;

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
  filterBetween: {
    description:
      "Store path holding the periods chosen in the headers of date columns, { <property>: [from, to] } (optional)",
    value: periodValuesSchema,
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

/** Where the COLUMN MENU's state lives when the host keeps it (shared by every table kind); unbound, local storage. */
export const tableColumnPorts = {
  columnState: {
    description:
      "Store path holding the column menu's state, { order: [properties], hidden: [properties] } (optional; unbound, the browser's local storage keeps it)",
    value: columnStateSchema,
    required: false,
  },
} satisfies WidgetIO["inputs"];

/** What the COLUMN MENU emits: the whole state (shared by every table kind). */
export const tableColumnEvents = {
  "columns-changed": {
    description:
      "Fired when the user shows, hides or reorders columns in the column menu, or resets them; carries the whole state { order, hidden }",
    payload: z.object({ columnState: columnStateSchema }),
    // The state is what the table itself reads: written back by default when the port is bound.
    primary: "columnState",
    writesBack: "columnState",
  },
} satisfies WidgetEvents;

/** What the TOOLBAR emits beside the headers' `filter-changed` (shared by every table kind). */
export const tableToolbarEvents = {
  refresh: {
    description:
      "Fired when the toolbar's refresh item is used — call the action that asks for the rows again (table-view/load with into)",
    payload: z.object({}),
  },
} satisfies WidgetEvents;

/** What the CELL SELECTION's menu emits: what was copied, what was exported (shared by every table kind). */
export const tableCellEvents = {
  "cells-copied": {
    description:
      "Fired when the selected cells are copied (the context menu's Copy or Copy with headers, or Ctrl/Cmd+C); carries the text put on the clipboard — a line per row, the cells tab-separated — and its size",
    payload: z.object({
      text: z.string(),
      rows: z.number().int().min(0),
      columns: z.number().int().min(0),
      headers: z.boolean(),
    }),
    primary: "text",
  },
  "rows-exported": {
    description:
      "Fired when the context menu's Export as CSV saved the rows the table holds; carries the file's name and its size",
    payload: z.object({ file: z.string(), rows: z.number().int().min(0), columns: z.number().int().min(0) }),
    primary: "file",
  },
} satisfies WidgetEvents;

/** What a table's HEADERS emit: the whole filter choice, the whole order (shared by every table kind). */
export const tableHeaderEvents = {
  "filter-changed": {
    description:
      "Fired when a header filter changes, with everything chosen: filterIn { <property>: [values] }, filterLike { <property>: text } and filterBetween { <property>: [from, to] } (empty ones left out)",
    payload: z.object({
      filterIn: filterValuesSchema,
      filterLike: searchValuesSchema,
      filterBetween: periodValuesSchema,
    }),
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
  filterRow: z
    .boolean()
    .default(false)
    .describe(
      "Show each column's filter IN the table, under its header: a search field for text, a list of values otherwise — always visible, so the table says what it shows",
    ),
  columnMenu: z
    .boolean()
    .default(true)
    .describe(
      "Offer the column menu above the table: show, hide and reorder the columns, and Reset to bring them back as configured",
    ),
  toolbar: z
    .array(toolbarItemSchema)
    .default([])
    .describe(
      'Tools above the table, in order: [{ "name": "reset-filters" }, { "name": "refresh" }] — the standard two — or names the host registered',
    ),
  columnStateKey: z
    .string()
    .default("")
    .describe(
      "The local-storage key the column menu's state is kept under while the columnState port is unbound; empty = one made from the rows path",
    ),
  cellSelection: z
    .boolean()
    .default(true)
    .describe(
      "Select cells as in a spreadsheet — a click selects one, a drag or Shift+click a rectangle — and offer the right-click menu: Copy, Copy with headers, Export as CSV",
    ),
  exportName: z
    .string()
    .default("")
    .describe("The name of the CSV file the menu's export saves, without .csv; empty = one made from the rows path"),
};

export const tableContract = defineContract({
  kind: "table",
  description:
    "Rows from the store in columns; emits the row a user clicks; filters and sorting in the headers on request",
  io: { inputs: { ...tablePorts, ...tableHeaderPorts, ...tableColumnPorts } },
  events: { ...tableEvents, ...tableHeaderEvents, ...tableColumnEvents, ...tableToolbarEvents, ...tableCellEvents },
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
