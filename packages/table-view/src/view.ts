/**
 * A TABLE VIEW as a page declares it: the URL — all that is needed — plus
 * what the page wants DIFFERENT from what the server describes. Pure data
 * and pure functions: the declaration is a reaction's `with`, and turning
 * the server's metadata into what widgets show is code, never configuration
 * (reactions and configuration only select).
 */
import { z } from "zod";
import {
  tableCellSchema,
  type ColumnFilter,
  type FilterDefinition,
  type TableColumn,
} from "@wirework/widget-contracts";
import type { ColumnDefinition, SortDirection, TableMetadata, TableViewRequest } from "./api";

const columnOverrideSchema = z
  .object({
    /** true hides a column the server shows; false shows one the server hides. */
    hidden: z.boolean().optional(),
    /** Header instead of the server's `headerName`. */
    title: z.string().optional(),
    /** How the column's cells are shown (the table's predefined kinds, or a renderer the host registered). */
    cell: tableCellSchema.optional(),
    /** The column's width in pixels instead of the table's default (110; 88 for an id). */
    width: z.number().int().min(20).optional(),
    /** true: the table always shows the column — its column menu lists it and cannot hide it. */
    required: z.boolean().optional(),
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
        'Per column id: { "id": { "required": true } } keeps a column out of reach of the column menu\'s hiding; { "inbound": { "hidden": true },"state": { "title": "Result", "cell": { "kind": "tag", "tones": { "Failed": "danger" } } }, "id": { "cell": { "kind": "link", "to": "/demo/runs/{id}" } } } — a link needs the table\'s reaction link-clicked → nav/follow',
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
    /**
     * false: the server is NOT asked to count the rows (`totalRecords:
     * false`) — counting a long list can cost more than reading a page of
     * it. The total is then unknown until the list's end is reached (an
     * answer with fewer rows than asked for); meanwhile `<into>.reached`
     * says how many rows are known to be there.
     */
    countRows: z
      .boolean()
      .optional()
      .describe(
        "Count rows: off — the server is not asked for the total; it is unknown until the end of the list is reached (for a long list a server counts slowly). On or not set: asked with every request",
      ),
  })
  .strict();
export type TableView = z.infer<typeof tableViewSchema>;

/** What the user asked for, as the widgets' reactions left it in the store under `<into>`. */
export interface TableViewQuery {
  /** Rows to skip: a page's first row, or the rows an infinite list already holds. */
  offset: number;
  /** Rows to ask for. */
  limit: number;
  /** Chosen in the filter bar or the column headers: { <column id>: [values] }. */
  filterIn: Record<string, string[]>;
  /** Typed in the column headers: { <column id>: "text" }; empty texts are not sent. */
  filterLike?: Record<string, string> | undefined;
  /** Picked in a date-range widget: { <column id>: [from, to] }; a range with both ends empty is not sent. */
  filterBetween?: Record<string, [string, string]> | undefined;
  orderBy?: Record<string, SortDirection> | undefined;
}

/** Rows per request when neither the store nor the declaration says. */
export const DEFAULT_PAGE_SIZE = 50;

/** Values a filter can offer: text, without the server's null ("no value") and without repeats. */
function offered(values: readonly unknown[] | null | undefined): string[] {
  const texts = (values ?? []).flatMap((value) =>
    value === null || value === undefined || value === "" ? [] : [String(value)],
  );
  return [...new Set(texts)];
}

/**
 * The VALUES a column can be filtered by, as the declaration changes them:
 * the page's own, else the server's `filterValues` unless it says the
 * column, or the table, is not filterable. Empty: no values filter.
 */
function valuesOf(metadata: TableMetadata, definition: ColumnDefinition, view: Pick<TableView, "filters">): string[] {
  const override = view.filters?.[definition.id];
  if (override === false) return [];
  const fromServer =
    metadata.enableFilter === false || definition.isFilterable === false ? [] : offered(definition.filterValues);
  return override?.values ?? fromServer;
}

/** Whether the server's column type is a date: `date`, `datetime`, `timestamp`, `timestamp(p) with time zone`… */
export const isDateType = (type: string | null | undefined): boolean => /^\s*(date|timestamp)/i.test(type ?? "");

/**
 * What a column's HEADER can filter by: the page's own values where it
 * gives any; a PERIOD (`filterBetween`: a start and an end date) for a
 * DATE column — by default, the server need not call it filterable, only
 * not say that it is not —; else the server's values where there are any;
 * else free text where the server calls the column filterable without
 * offering values (`filterLike`); else nothing. The page's `false` and the
 * table's `enableFilter: false` drop every one of them.
 */
function headerFilterOf(
  metadata: TableMetadata,
  definition: ColumnDefinition,
  view: Pick<TableView, "filters">,
): ColumnFilter | undefined {
  const override = view.filters?.[definition.id];
  const values = valuesOf(metadata, definition, view);
  const own = override !== false && override?.values !== undefined;
  const allowed = override !== false && metadata.enableFilter !== false && definition.isFilterable !== false;
  if (!own && allowed && isDateType(definition.type)) return { kind: "dates" };
  if (values.length > 0) return { kind: "values", options: values.map((value) => ({ value })) };
  return allowed && definition.isFilterable === true ? { kind: "text" } : undefined;
}

/**
 * The columns a table shows: the server's, in the server's order, as the
 * declaration changes them — each saying what its header can filter by and
 * whether the server sorts by it, for a table that offers both there.
 */
export function columnsOf(metadata: TableMetadata, view: Pick<TableView, "columns" | "filters">): TableColumn[] {
  return metadata.columnDefinitions
    .filter((definition) => !(view.columns?.[definition.id]?.hidden ?? definition.isHidden === true))
    .map((definition) => {
      const override = view.columns?.[definition.id];
      const filter = headerFilterOf(metadata, definition, view);
      const sortable = metadata.enableSorting !== false && definition.isSortable === true;
      return {
        title: override?.title ?? definition.headerName ?? definition.id,
        // The table reads a row by dot path; a column id is a plain field name.
        property: definition.id,
        // How the cells are shown is the page's word alone: the server describes data, not looks.
        ...(override?.cell === undefined ? {} : { cell: override.cell }),
        ...(override?.width === undefined ? {} : { width: override.width }),
        ...(override?.required === true ? { required: true } : {}),
        ...(filter === undefined ? {} : { filter }),
        ...(sortable ? { sortable } : {}),
      };
    });
}

/**
 * The filters a filter bar shows: one per column the server gives
 * `filterValues` for (unless it says the column, or the table, is not
 * filterable), as the declaration changes them — removed, relabelled, or
 * with values of the page's own (also where the server offers none). A
 * text filter has no place in a bar: it lives in a column header.
 */
export function filtersOf(metadata: TableMetadata, view: Pick<TableView, "columns" | "filters">): FilterDefinition[] {
  return metadata.columnDefinitions.flatMap((definition) => {
    const values = valuesOf(metadata, definition, view);
    if (values.length === 0) return [];
    const override = view.filters?.[definition.id];
    return [
      {
        id: definition.id,
        label:
          (override === false ? undefined : override?.label) ??
          view.columns?.[definition.id]?.title ??
          definition.headerName ??
          definition.id,
        options: values.map((value) => ({ value })),
      },
    ];
  });
}

/** The request for some rows of the view. What the user chose for a column replaces the declaration's for it. */
export function requestOf(view: TableView, query: TableViewQuery, withMetadata: boolean): TableViewRequest {
  const base = view.request ?? {};
  const searched = Object.fromEntries(Object.entries(query.filterLike ?? {}).filter(([, text]) => text !== ""));
  const ranged = Object.fromEntries(
    Object.entries(query.filterBetween ?? {}).filter(([, [from, to]]) => from !== "" || to !== ""),
  );
  return {
    dataFilter: {
      filterBetween: { ...base.filterBetween, ...ranged },
      filterEqual: base.filterEqual ?? {},
      filterIn: { ...base.filterIn, ...query.filterIn },
      filterLike: { ...base.filterLike, ...searched },
      filterTimeDiffGt: base.filterTimeDiffGt ?? {},
      limit: query.limit,
      offset: query.offset,
      orderBy: query.orderBy ?? base.orderBy ?? {},
    },
    metadata: withMetadata,
    totalRecords: view.countRows !== false,
  };
}
