/**
 * `table` contract — rows of records from the store, in columns. GENERIC: it
 * knows nothing about what a row is (it replaced a runs-only table).
 *
 * - The rows are an ARRAY OF OBJECTS at the `rows` port.
 * - Each row's identity is the value of its `rowKey` property (default
 *   "id") — never its position, so a re-sorted or re-fetched page keeps
 *   rows apart. A row without that property falls back to its position.
 * - Columns come from the `columns` setting: `{ title, property }`, the
 *   property a dot path into the row ("status.state"). Without columns,
 *   one column per top-level field of the first row.
 * - A click on a row EMITS `row-selected` with the row's key and the row
 *   itself, so a reaction stores either (`from: "key"`, `from: "row.name"`).
 *
 * Implementations render a table and expose each row's key as
 * `data-row-key` and each cell's property as `data-property`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const tableColumnSchema = z
  .object({
    /** Header text. */
    title: z.string(),
    /** Dot path into the row ("name", "status.state"). */
    property: z.string().min(1),
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
      },
      loading: {
        description: "Store path that is true while rows are being fetched (optional; shows a spinner over them)",
        value: z.boolean(),
        required: false,
        default: false,
      },
    },
  },
  events: {
    "row-selected": {
      description: "Fired when the user clicks a row; carries its key and the row",
      payload: z.object({ key: z.string(), row: z.record(z.string(), z.unknown()) }),
      primary: "key",
    },
  },
  settings: z.object({
    columns: z
      .array(tableColumnSchema)
      .default([])
      .describe("Columns { title, property }; empty = one per field of the first row"),
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
    viewModel: { inputs: { rows: "preview.rows" } },
  },
});
