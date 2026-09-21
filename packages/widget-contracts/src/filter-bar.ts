/**
 * `filter-bar` contract — a row of filters that is NOT known when the page
 * is written: which filters there are, and what each offers, comes from the
 * store (a server describes them next to its table's columns).
 *
 * - The `filters` port holds the definitions `[{ id, label?, options }]`;
 *   the id says what a filter is about (a column).
 * - CONTROLLED like `multi-select`: what is chosen lives at the `value` port
 *   as ONE object `{ <filter id>: [values] }`. Every change EMITS `changed`
 *   with the whole object — filters with nothing chosen left out, so it can
 *   go into a request as it is — and the required reaction writes it back.
 *
 * Implementations render one multi-choice combobox per filter, named by its
 * label (else its id), and expose the filter ids as `data-filters`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";
import { choiceOptionsSchema } from "./select";

export const filterDefinitionSchema = z
  .object({
    /** What the filter is about — the key of its values in the `value` object. */
    id: z.string().min(1),
    /** Shown instead of the id when present. */
    label: z.string().optional(),
    options: choiceOptionsSchema,
  })
  .strict();
export type FilterDefinition = z.infer<typeof filterDefinitionSchema>;

export const filterValuesSchema = z.record(z.string(), z.array(z.string()));
export type FilterValues = z.infer<typeof filterValuesSchema>;

export const filterBarContract = defineContract({
  kind: "filter-bar",
  description: "Filters described by the store (what a server offers); emits everything chosen",
  io: {
    inputs: {
      filters: {
        description: "Store path holding the filters [{ id, label?, options: [{ value, label? }] }]",
        value: z.array(filterDefinitionSchema),
        default: [],
      },
      value: {
        description: "Store path holding what is chosen, { <filter id>: [values] }",
        value: filterValuesSchema,
        default: {},
      },
    },
  },
  events: {
    changed: {
      description: "Fired on every change, with everything chosen: { <filter id>: [values] } (empty filters left out)",
      payload: z.object({ value: filterValuesSchema }),
      required: true,
      primary: "value",
    },
  },
  settings: z.object({
    placeholder: z.string().default("any").describe("Shown in a filter while nothing is chosen"),
    emptyText: z.string().default("No filters").describe("Shown while there are no filters"),
  }),
  preview: {
    seed: {
      preview: {
        filters: [
          { id: "state", label: "State", options: [{ value: "Running" }, { value: "Failed" }, { value: "Success" }] },
          { id: "host", label: "Host", options: [{ value: "qa-1" }, { value: "qa-2" }] },
        ],
        chosen: { state: ["Running"] },
      },
    },
    viewModel: {
      inputs: { filters: "preview.filters", value: "preview.chosen" },
      on: { changed: [{ set: "preview.chosen", from: "value" }] },
    },
  },
});
