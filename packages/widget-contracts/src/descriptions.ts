/**
 * `descriptions` contract — ONE record as a fact sheet: labelled fields,
 * each a property of the object at the `record` port, shown in the TABLE's
 * cell kinds (table-cell.ts: text, a tag in a tone, a link, a renderer the
 * host registered) — one row of a table shown as fields, in the vocabulary
 * the table already taught. Its `items` are the table's columns without
 * what only a table needs (a filter, sorting), so the two never drift.
 *
 * Display, with one intent: a plain click on a link cell EMITS
 * `link-clicked` for a reaction to follow (`nav/follow`), as the table
 * does. Implementations render each item as a term and its definition;
 * each definition exposes `data-property` and `data-cell`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";
import { tableColumnSchema } from "./table";

export const descriptionItemSchema = tableColumnSchema.omit({ filter: true, sortable: true });
export type DescriptionItem = z.infer<typeof descriptionItemSchema>;

export const descriptionRecordSchema = z.record(z.string(), z.unknown());
export type DescriptionRecord = z.infer<typeof descriptionRecordSchema>;

export const DESCRIPTIONS_SIZES = ["default", "middle", "small"] as const;
export type DescriptionsSize = (typeof DESCRIPTIONS_SIZES)[number];

const SAMPLE_ITEMS: DescriptionItem[] = [
  { title: "Name", property: "name" },
  { title: "Status", property: "state", cell: { kind: "tag", tones: { Success: "success", Failed: "danger" } } },
  { title: "Reference", property: "reference" },
];

export const descriptionsContract = defineContract({
  kind: "descriptions",
  description: "One record as labelled fields, in the table's cell kinds; a link cell emits link-clicked",
  io: {
    inputs: {
      record: {
        description: "Store path holding the record (an object) whose properties the items show",
        value: descriptionRecordSchema,
        default: {},
      },
      loading: {
        description: "Store path holding whether the record is being loaded",
        value: z.boolean(),
        required: false,
      },
    },
  },
  events: {
    "link-clicked": {
      description: "Fired on a plain click on a link cell, with its address and the item's property",
      payload: z.object({ href: z.string(), property: z.string(), record: descriptionRecordSchema }),
    },
  },
  settings: z.object({
    title: z.string().optional().describe("Heading above the fields"),
    items: z
      .array(descriptionItemSchema)
      .default(SAMPLE_ITEMS)
      .describe(
        'Fields { title, property, cell? } — the table\'s columns without filter and sorting; cell: { "kind": "tag", "tones": { "Failed": "danger" } }, { "kind": "link", "to": "/demo/runs/{id}" } or { "kind": "custom", "name": "copy" }',
      ),
    columns: z.number().int().min(1).max(4).default(2).describe("Fields side by side"),
    size: z.enum(DESCRIPTIONS_SIZES).default("small").describe("How much room each field takes"),
    bordered: z.boolean().default(true).describe("Lines between the fields"),
  }),
  preview: {
    seed: { preview: { run: { name: "Nightly regression", state: "Success", reference: "REF59456738" } } },
    viewModel: { inputs: { record: "preview.run" }, title: "Run", columns: 1 },
  },
});
