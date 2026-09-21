/**
 * The VIEW TABLE API on the wire (doc/tableApi/): one POST endpoint per
 * table. The request says which rows (`dataFilter`) and whether the answer
 * should DESCRIBE the table (`metadata: true`: the column definitions, each
 * with the values it can be filtered by) and count it (`totalRecords`).
 * Description, count and rows may come in one answer or in several — every
 * part of the response is optional, and the loader writes what arrived.
 */
import { z } from "zod";

export type SortDirection = "ASC" | "DESC";

/** What is asked of the server. Every filter group is always sent, empty or not. */
export interface TableViewRequest {
  dataFilter: {
    filterBetween: Record<string, unknown>;
    filterEqual: Record<string, unknown>;
    filterIn: Record<string, unknown[]>;
    filterLike: Record<string, unknown>;
    filterTimeDiffGt: Record<string, unknown>;
    limit: number;
    offset: number;
    orderBy: Record<string, SortDirection>;
  };
  metadata: boolean;
  totalRecords: boolean;
}

/** One column as the server describes it. Servers leave fields out or send null: all but `id` are optional. */
export const columnDefinitionSchema = z
  .object({
    id: z.string().min(1),
    headerName: z.string().nullish(),
    type: z.string().nullish(),
    description: z.string().nullish(),
    /** The values this column can be filtered by; may hold null (a row without a value). */
    filterValues: z.array(z.unknown()).nullish(),
    isFilterable: z.boolean().nullish(),
    isHidden: z.boolean().nullish(),
    isSortable: z.boolean().nullish(),
  })
  .passthrough();
export type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;

export const tableMetadataSchema = z
  .object({
    columnDefinitions: z.array(columnDefinitionSchema),
    enableFilter: z.boolean().nullish(),
    enableSorting: z.boolean().nullish(),
  })
  .passthrough();
export type TableMetadata = z.infer<typeof tableMetadataSchema>;

export const tableViewResponseSchema = z
  .object({
    metadata: tableMetadataSchema.nullish(),
    totalRecords: z.number().int().min(0).nullish(),
    data: z.array(z.record(z.string(), z.unknown())).nullish(),
  })
  .passthrough();
export type TableViewResponse = z.infer<typeof tableViewResponseSchema>;

/**
 * How a request reaches the server. The HOST provides it: `fetchTransport`
 * for a real endpoint, an in-memory fake in tests and playgrounds.
 * Resolves with the parsed JSON body; rejects when the request failed.
 */
export type TableViewTransport = (url: string, request: TableViewRequest, signal?: AbortSignal) => Promise<unknown>;

/** POST the request as JSON, answer with the JSON body; a non-2xx status is a failure. */
export const fetchTransport: TableViewTransport = async (url, request, signal) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(request),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`.trim());
  return response.json();
};
