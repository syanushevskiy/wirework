/**
 * A TABLE VIEW as a page declares it: the URL — all that is needed — plus
 * what the page wants DIFFERENT from what the server describes. Pure data
 * and pure functions: the declaration is a reaction's `with`, and turning
 * the server's metadata into what widgets show is code, never configuration
 * (reactions and configuration only select).
 */
import { z } from "zod";
import { tableCellSchema, type FilterDefinition, type TableColumn } from "@wirework/widget-contracts";
import type { SortDirection, TableMetadata, TableViewRequest } from "./api";

const columnOverrideSchema = z
  .object({
    /** true hides a column the server shows; false shows one the server hides. */
    hidden: z.boolean().optional(),
    /** Header instead of the server's `headerName`. */
    title: z.string().optional(),
    /** How the column's cells are shown (the table's predefined kinds, or a renderer the host registered). */
    cell: tableCellSchema.optional(),
  })
  .strict();

const filterOverrideSchema = z.union([
  /** No filter for this column, whatever the server offers. */
  z.literal(false),
  z
    .object({
      label: z.string().optional(),
      /** Offer THESE values instead of the server's — also for a column the server offers none for. */
      values: z.array(z.string()).optional(),
    })
    .strict(),
]);

const filterGroup = z.record(z.string(), z.unknown());

/* The descriptions are what a builder shows next to each field. */
export const tableViewSchema = z
  .object({
    /** Where the view table API of this table lives. */
    url: z.string().min(1).describe("Address of the table's view API, e.g. /api/v1/view/runs"),
    /** Per column id: what to change about the server's column, and how to show its cells. */
    columns: z
      .record(z.string(), columnOverrideSchema)
      .optional()
      .describe(
        'Per column id: { "inbound": { "hidden": true }, "state": { "title": "Result", "cell": { "kind": "tag", "tones": { "Failed": "danger" } } }, "id": { "cell": { "kind": "link", "to": "/demo/runs/{id}" } } } — a link needs the table\'s reaction link-clicked → nav/follow',
      ),
    /** Per column id: what to change about the server's filter. */
    filters: z
      .record(z.string(), filterOverrideSchema)
      .optional()
      .describe('Per column id: false for no filter, or { "label": "Suite", "values": ["a", "b"] }'),
    /** Sent with EVERY request: the rows this table is about, and their order until the user sorts. */
    request: z
      .object({
        filterBetween: filterGroup.optional(),
        filterEqual: filterGroup.optional(),
        filterIn: z.record(z.string(), z.array(z.unknown())).optional(),
        filterLike: filterGroup.optional(),
        filterTimeDiffGt: filterGroup.optional(),
        orderBy: z.record(z.string(), z.enum(["ASC", "DESC"])).optional(),
      })
      .strict()
      .optional()
      .describe('Sent with every request: { "filterIn": { "state": ["RUNNING"] }, "orderBy": { "job_id": "DESC" } }'),
    /** Rows per request until `<into>.pageSize` says otherwise. */
    pageSize: z.number().int().min(1).optional().describe("Rows per request (default 50)"),
  })
  .strict();
export type TableView = z.infer<typeof tableViewSchema>;

/** What the user asked for, as the widgets' reactions left it in the store under `<into>`. */
export interface TableViewQuery {
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Chosen in the filter bar: { <column id>: [values] }. */
  filterIn: Record<string, string[]>;
  orderBy?: Record<string, SortDirection> | undefined;
}

/** Rows per request when neither the store nor the declaration says. */
export const DEFAULT_PAGE_SIZE = 50;

/** The columns a table shows: the server's, in the server's order, as the declaration changes them. */
export function columnsOf(metadata: TableMetadata, view: Pick<TableView, "columns">): TableColumn[] {
  return metadata.columnDefinitions
    .filter((definition) => !(view.columns?.[definition.id]?.hidden ?? definition.isHidden === true))
    .map((definition) => {
      const override = view.columns?.[definition.id];
      return {
        title: override?.title ?? definition.headerName ?? definition.id,
        // The table reads a row by dot path; a column id is a plain field name.
        property: definition.id,
        // How the cells are shown is the page's word alone: the server describes data, not looks.
        ...(override?.cell === undefined ? {} : { cell: override.cell }),
      };
    });
}

/** Values a filter can offer: text, without the server's null ("no value") and without repeats. */
function offered(values: readonly unknown[] | null | undefined): string[] {
  const texts = (values ?? []).flatMap((value) =>
    value === null || value === undefined || value === "" ? [] : [String(value)],
  );
  return [...new Set(texts)];
}

/**
 * The filters a filter bar shows: one per column the server gives
 * `filterValues` for (unless it says the column, or the table, is not
 * filterable), as the declaration changes them — removed, relabelled, or
 * with values of the page's own (also where the server offers none).
 */
export function filtersOf(metadata: TableMetadata, view: Pick<TableView, "columns" | "filters">): FilterDefinition[] {
  return metadata.columnDefinitions.flatMap((definition) => {
    const override = view.filters?.[definition.id];
    if (override === false) return [];
    const fromServer =
      metadata.enableFilter === false || definition.isFilterable === false ? [] : offered(definition.filterValues);
    const values = override?.values ?? fromServer;
    if (values.length === 0) return [];
    return [
      {
        id: definition.id,
        label: override?.label ?? view.columns?.[definition.id]?.title ?? definition.headerName ?? definition.id,
        options: values.map((value) => ({ value })),
      },
    ];
  });
}

/** The request for one page of the view. What the user chose for a column replaces the declaration's for it. */
export function requestOf(view: TableView, query: TableViewQuery, withMetadata: boolean): TableViewRequest {
  const base = view.request ?? {};
  return {
    dataFilter: {
      filterBetween: base.filterBetween ?? {},
      filterEqual: base.filterEqual ?? {},
      filterIn: { ...base.filterIn, ...query.filterIn },
      filterLike: base.filterLike ?? {},
      filterTimeDiffGt: base.filterTimeDiffGt ?? {},
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      orderBy: query.orderBy ?? base.orderBy ?? {},
    },
    metadata: withMetadata,
    totalRecords: true,
  };
}
