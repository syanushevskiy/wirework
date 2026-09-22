/**
 * `table` contract — rows of records from the store, in columns. GENERIC: it
 * knows nothing about what a row is (it replaced a runs-only table).
 *
 * - The rows are an ARRAY OF OBJECTS at the `rows` port.
 * - Each row's identity is the value of its `rowKey` property (default
 *   "id") — never its position, so a re-sorted or re-fetched page keeps
 *   rows apart. A row without that property falls back to its position.
 * - Columns are `{ title, property, cell? }`, the property a dot path into
 *   the row ("status.state"), the cell how its value is shown (table-cell.ts:
 *   text, a tag, a link, or a renderer the host registered). They come from
 *   the optional `columns` port — a store path, so a host can load them (a
 *   table the server describes) — and fall back to the `columns` setting.
 *   Without either, one column per top-level field of the first row.
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
 * `data-cell`; a tag cell exposes its tone as `data-tone`. They emit `load`
 * AFTER mounting — once the page has bound its reactions — and only once
 * per mount (React's StrictMode mounts twice).
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";
import { appPathSchema, tableCellSchema } from "./table-cell";

export const tableColumnSchema = z
  .object({
    /** Header text. */
    title: z.string(),
    /** Dot path into the row ("name", "status.state"). */
    property: z.string().min(1),
    /** How the value is shown; text when absent. */
    cell: tableCellSchema.optional(),
  })
  .strict();
export type TableColumn = z.infer<typeof tableColumnSchema>;

export const tableRowsSchema = z.array(z.record(z.string(), z.unknown()));
export type TableRow = z.infer<typeof tableRowsSchema>[number];

export const tableContract = defineContract({
  kind: "table",
  description: "Rows from the store in columns; emits the row a user clicks",
  io: {
    inputs: {
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
    },
  },
  events: {
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
  },
  settings: z.object({
    columns: z
      .array(tableColumnSchema)
      .default([])
      .describe(
        'Columns { title, property, cell? }; empty = one per field of the first row. cell: { "kind": "tag", "tones": { "Failed": "danger" } } or { "kind": "link", "to": "/demo/runs/{id}" }',
      ),
    rowKey: z.string().min(1).default("id").describe("Row property holding each row's stable identity"),
    emptyText: z.string().default("No rows").describe("Shown when there are no rows"),
  }),
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
