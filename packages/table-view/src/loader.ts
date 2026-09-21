/**
 * Loads a table view into a store — THE way a server-described table
 * reaches the page. Everything lives at FIXED places under one root the
 * call names (`into`), so nobody invents paths per table:
 *
 *   <into>.view       the declaration: url and the page's changes (written by a call that has a url)
 *   <into>.columns    [{ title, property }]            -> the table's `columns` port
 *   <into>.filters    [{ id, label, options }]         -> the filter bar's `filters` port
 *   <into>.data       the rows                         -> the table's `rows` port
 *   <into>.total      all rows on the server           -> the pagination's `total` port
 *   <into>.loading    true while a request is in flight
 *   <into>.error      what failed (the last good rows stay)
 *
 * and what the USER asked for, written by the widgets' reactions and read
 * here: <into>.page, <into>.pageSize, <into>.filterIn, <into>.orderBy.
 *
 * Results travel through the store one visible step at a time. Whether the
 * server is asked to DESCRIBE the table (`metadata: true`) is the call's
 * `metadata` argument; without it: when the call declares the view (it has
 * a url) or nothing is known about the columns yet — so a plain re-request
 * (another page, a refresh, a filter) asks for rows only.
 */
import { z } from "zod";
import type { Store } from "@wirework/schema";
import { tableViewResponseSchema, type TableViewTransport } from "./api";
import { DEFAULT_PAGE_SIZE, columnsOf, filtersOf, requestOf, tableViewSchema, type TableView } from "./view";

/**
 * A call's arguments: where in the store, whether to ask for the table's
 * description, and — to declare the view — the url with the page's changes.
 * Spelled out field by field (not `.extend`): this order is the order of the
 * builder's form — what everybody fills in first, the JSON overrides last.
 */
export const tableViewArgsSchema = z
  .object({
    url: tableViewSchema.shape.url.optional(),
    /** The store path this table view lives under, e.g. "runs" or "builder.table". */
    into: z
      .string()
      .min(1)
      .describe(
        "Where this table view lives in the store, e.g. builder.table — the table then reads builder.table.data, .columns and .loading (its suggested paths)",
      ),
    /**
     * The request's `metadata` flag, per CALL (it is not part of the declared
     * view): true asks the server to describe the table — its columns and
     * the values to filter by — false asks for rows only. Not given: asked
     * when the call declares the view (it has a url) or no columns are
     * known yet.
     */
    metadata: z
      .boolean()
      .optional()
      .describe(
        "Send metadata: true — the server describes the table (columns, filter values). Off: rows only. Not set: automatic (asked with a url, or while no columns are known)",
      ),
    pageSize: tableViewSchema.shape.pageSize,
    columns: tableViewSchema.shape.columns,
    filters: tableViewSchema.shape.filters,
    request: tableViewSchema.shape.request,
  })
  .strict();
export type TableViewArgs = z.infer<typeof tableViewArgsSchema>;

export type TableViewLoader = (store: Store, args: unknown) => Promise<void>;

const positiveInt = z.number().int().min(1);
const chosenSchema = z.record(z.string(), z.array(z.string()));
const orderSchema = z.record(z.string(), z.enum(["ASC", "DESC"]));

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function createTableViewLoader(transport: TableViewTransport): TableViewLoader {
  // Only the newest request of a table view may write: page 2 then 3 must
  // never end on page 2 because its answer arrived last. Per store, because
  // a host may give every page visit its own.
  const latest = new WeakMap<Store, Map<string, number>>();
  const begin = (store: Store, into: string): (() => boolean) => {
    const requests = latest.get(store) ?? new Map<string, number>();
    latest.set(store, requests);
    const request = (requests.get(into) ?? 0) + 1;
    requests.set(into, request);
    return () => requests.get(into) === request;
  };

  return async (store, rawArgs) => {
    const parsed = tableViewArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new Error(`table-view/load: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    }
    // `metadata` belongs to this call; everything else but `into` declares the view.
    const { into, metadata, ...declared } = parsed.data;
    const at = (name: string): string => `${into}.${name}`;

    // A call with a url DECLARES the view; one without re-requests the declared one.
    let view: TableView | undefined;
    if (declared.url !== undefined) {
      view = { ...declared, url: declared.url };
      const previous = store.getAs(at("view"), tableViewSchema);
      if (JSON.stringify(previous) !== JSON.stringify(view)) store.set(at("view"), view);
      // The page size was DECLARED anew (an editor changed the reaction): the
      // declaration speaks again — not the size the last answer left in the
      // store, which would silently win — and the list starts at its first page.
      if (previous !== undefined && previous.pageSize !== view.pageSize) {
        store.set(at("pageSize"), undefined);
        store.set(at("page"), undefined);
      }
    } else {
      view = store.getAs(at("view"), tableViewSchema);
    }
    if (view === undefined) {
      throw new Error(`table-view/load: no table view is declared at "${at("view")}" — call it once with a url`);
    }
    // The call's own word wins; without one: when the view is being declared, or nothing describes it yet.
    const describe = metadata ?? (declared.url !== undefined || store.get(at("columns")) === undefined);

    const isLatest = begin(store, into);
    store.set(at("loading"), true);
    try {
      // Live store values are not validated; an inspector may hold anything.
      const query = {
        page: store.getAs(at("page"), positiveInt) ?? 1,
        pageSize: store.getAs(at("pageSize"), positiveInt) ?? view.pageSize ?? DEFAULT_PAGE_SIZE,
        filterIn: store.getAs(at("filterIn"), chosenSchema) ?? {},
        orderBy: store.getAs(at("orderBy"), orderSchema),
      };
      let answer = tableViewResponseSchema.parse(await transport(view.url, requestOf(view, query, describe)));
      if (!isLatest()) return;

      // The page asked for lies behind the last one (a filter shrank the
      // table): ask once more, for the last page there is.
      const total = answer.totalRecords ?? undefined;
      if (total !== undefined && total > 0 && (query.page - 1) * query.pageSize >= total) {
        query.page = Math.ceil(total / query.pageSize);
        const again = tableViewResponseSchema.parse(await transport(view.url, requestOf(view, query, false)));
        if (!isLatest()) return;
        answer = { ...answer, ...again, metadata: answer.metadata ?? again.metadata };
      }

      if (answer.metadata) {
        store.set(at("columns"), columnsOf(answer.metadata, view));
        store.set(at("filters"), filtersOf(answer.metadata, view));
      }
      if (answer.data) store.set(at("data"), answer.data);
      if (answer.totalRecords !== undefined && answer.totalRecords !== null) store.set(at("total"), answer.totalRecords);
      store.set(at("page"), query.page);
      store.set(at("pageSize"), query.pageSize);
      store.set(at("error"), undefined);
    } catch (error) {
      // The last good rows stay; the page can show what failed.
      if (isLatest()) store.set(at("error"), messageOf(error));
    } finally {
      if (isLatest()) store.set(at("loading"), false);
    }
  };
}
