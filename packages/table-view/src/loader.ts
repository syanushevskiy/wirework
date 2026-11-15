/**
 * Loads a table view into a store — THE way a server-described table
 * reaches the page. Everything lives at FIXED places under one root the
 * call names (`into`), so nobody invents paths per table:
 *
 *   <into>.view       the declaration: url and the page's changes (written by a call that has a url)
 *   <into>.columns    [{ title, property, filter?, sortable? }] -> the table's `columns` port
 *   <into>.filters    [{ id, label, options }]         -> the filter bar's `filters` port
 *   <into>.data       the rows                         -> the table's `rows` port
 *   <into>.total      all rows on the server           -> the pagination's / infinite table's `total` port
 *   <into>.hasMore    the list GOES ON past the total  -> the `hasMore` port of an infinite table and a list position;
 *                     written for an answer WITHOUT `totalRecords` (the view said `countRows: false`, or the server
 *                     does not count): the total is then the rows KNOWN so far, and exact once an answer comes back
 *                     with fewer rows than asked for — the end
 *   <into>.offset     where the rows held begin in the whole list -> a windowed infinite table's `offset` port
 *   <into>.wanted     what a windowed list asked for, { offset, edge } (its `window` reaction writes it; read by `window: true`)
 *   <into>.loading    true while a request is in flight
 *   <into>.error      what failed (the last good rows stay)
 *
 * and what the USER asked for, written by the widgets' reactions and read
 * here: <into>.page, <into>.pageSize, <into>.filterIn, <into>.filterLike,
 * <into>.filterBetween (a date-range widget bound to
 * `<into>.filterBetween.<column>` filters the table with no other wiring),
 * <into>.orderBy.
 *
 * Results travel through the store one visible step at a time. Whether the
 * server is asked to DESCRIBE the table (`metadata: true`) is the call's
 * `metadata` argument; without it: when the call declares the view (it has
 * a url) or nothing is known about the columns yet — so a plain re-request
 * (another page, a refresh, a filter) asks for rows only. A call with
 * `more: true` asks for the rows AFTER the ones held and appends them —
 * an infinite list growing as the user scrolls; the page stays what it is.
 *
 * Latest request wins, per store and view — and the superseded request is
 * ABORTED, not merely ignored: paging quickly through a table or refreshing
 * while a request is in flight never piles requests up on the server.
 */
import { z } from "zod";
import type { Store } from "@wirework/schema";
import {
  columnOrderSchema,
  dateRangeSchema,
  filterValuesSchema,
  searchValuesSchema,
  tableRowsSchema,
} from "@wirework/widget-contracts";
import { tableViewResponseSchema, type TableViewTransport } from "./api";
import {
  DEFAULT_PAGE_SIZE,
  columnsOf,
  filtersOf,
  requestOf,
  tableViewSchema,
  type TableView,
  type TableViewQuery,
} from "./view";

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
    /**
     * Per CALL too: ask for the rows AFTER the ones held and append them —
     * what an infinite list's `more` reaction does. Off or not given: the
     * rows are replaced by the page asked for.
     */
    more: z
      .boolean()
      .optional()
      .describe("More: append the rows after those held (an infinite list's `more`). Off or not set: replace them"),
    /**
     * Per CALL: ask for the rows `<into>.wanted` names — what a windowed
     * list's `window` reaction does after storing what it asked for: the
     * batch AFTER the rows held or the one BEFORE them joins them (ahead of
     * time, so the list scrolls into rows already there; beyond three
     * batches the farthest rows are dropped), a slice AROUND a row replaces
     * them. The page is not touched; `<into>.offset` says where the rows
     * held begin.
     */
    window: z
      .boolean()
      .optional()
      .describe(
        "Window: load what <into>.wanted names (a windowed list's `window`) — the batch after or before the rows held joins them, a slice around a row replaces them. Off or not set: the page asked for",
      ),
    pageSize: tableViewSchema.shape.pageSize,
    columns: tableViewSchema.shape.columns,
    filters: tableViewSchema.shape.filters,
    request: tableViewSchema.shape.request,
    countRows: tableViewSchema.shape.countRows,
  })
  .strict();
export type TableViewArgs = z.infer<typeof tableViewArgsSchema>;

export type TableViewLoader = (store: Store, args: unknown) => Promise<void>;

const positiveInt = z.number().int().min(1);
const offsetSchema = z.number().int().min(0);
const chosenSchema = filterValuesSchema;
const searchedSchema = searchValuesSchema;
/** What the date-range widgets wrote: a [from, to] pair of texts per column. */
const rangedSchema = z.record(z.string(), dateRangeSchema);
const orderSchema = columnOrderSchema;
const rowsSchema = tableRowsSchema;

/**
 * What a windowed list asked for (`<into>.wanted`, its `window` event's
 * payload): a batch AFTER the rows held, the one BEFORE them, or a slice
 * AROUND a row. A bare number is a slice that BEGINS there.
 */
const wantedSchema = z.union([
  offsetSchema,
  z.object({ offset: offsetSchema, edge: z.enum(["after", "before", "around"]) }),
]);
type Wanted = z.infer<typeof wantedSchema>;

/** How many batches (page sizes) of rows a windowed list keeps as it scrolls on; the farthest are dropped. */
export const KEEP_BATCHES = 3;

/** The rows to ask for, and what becomes of the answer: it replaces the slice held, or joins it at one end. */
export interface SlicePlan {
  from: number;
  limit: number;
  join: "replace" | "append" | "prepend";
}

/**
 * The request a windowed list's wish becomes, given the slice held
 * (`length` rows from `offset`) and the batch size. A batch joins the slice
 * only when it is asked for at the slice's own edge — a wish made for other
 * rows than the ones now held (a filter came between) is a slice of its own.
 */
export function slicePlan(
  wanted: Wanted,
  offset: number,
  length: number,
  pageSize: number,
  /** The rows the server has, when known: a slice around the last rows is the last full one. */
  total?: number,
): SlicePlan {
  if (typeof wanted === "number") return { from: wanted, limit: pageSize, join: "replace" };
  if (wanted.edge === "after" && length > 0 && wanted.offset === offset + length) {
    return { from: wanted.offset, limit: pageSize, join: "append" };
  }
  if (wanted.edge === "before" && length > 0 && wanted.offset === offset && offset > 0) {
    const from = Math.max(0, offset - pageSize);
    return { from, limit: offset - from, join: "prepend" };
  }
  if (wanted.edge === "around") {
    // The row wanted in the slice's middle: as many rows held before the view as after it.
    const last = total === undefined ? Infinity : Math.max(0, total - pageSize);
    const from = Math.max(0, Math.min(wanted.offset - Math.floor(pageSize / 2), last));
    return { from, limit: pageSize, join: "replace" };
  }
  return { from: wanted.offset, limit: pageSize, join: "replace" };
}

/** The slice held with a batch joined to it, at most `keep` rows: the ones farthest from the batch are dropped. */
export function joinedSlice(
  held: { rows: Record<string, unknown>[]; offset: number },
  batch: Record<string, unknown>[],
  plan: SlicePlan,
  keep: number,
): { rows: Record<string, unknown>[]; offset: number } {
  if (plan.join === "prepend") {
    // Fewer rows than asked for would leave a gap before the ones held: the batch stands alone then.
    if (batch.length !== plan.limit) return { rows: batch, offset: plan.from };
    return { rows: [...batch, ...held.rows].slice(0, keep), offset: plan.from };
  }
  const rows = [...held.rows, ...batch];
  const dropped = Math.max(0, rows.length - keep);
  return { rows: rows.slice(dropped), offset: held.offset + dropped };
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Structural equality of plain JSON data — key order does not matter, as it must not for a declaration. */
function equalJson(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => equalJson(item, b[index]))
    );
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && equalJson(left[key], right[key]))
  );
}

/** One request of a view: the newest of its store and `into` is the only one that may write. */
interface Request {
  isLatest: () => boolean;
  signal: AbortSignal;
}

export function createTableViewLoader(transport: TableViewTransport): TableViewLoader {
  // Per store, because a host may give every page visit its own; per view,
  // because two tables on a page must not supersede each other.
  const inFlight = new WeakMap<Store, Map<string, AbortController>>();
  const begin = (store: Store, into: string): Request => {
    const requests = inFlight.get(store) ?? new Map<string, AbortController>();
    inFlight.set(store, requests);
    requests.get(into)?.abort();
    const controller = new AbortController();
    requests.set(into, controller);
    return { isLatest: () => requests.get(into) === controller, signal: controller.signal };
  };
  // A view the server does not count: the filters its end was (or is being) looked for under. Other filters are
  // another list — what was learned about this one says nothing about it.
  const learnedUnder = new WeakMap<Store, Map<string, string>>();
  /**
   * An answer of a view NOBODY COUNTS (doc/ADR/0007-row-window-and-header-filters.md,
   * "A list whose end is not known yet"): `<into>.total` is the high-water
   * mark of the rows known to be there and `<into>.hasMore` says the list
   * goes on past it — until an answer comes back with fewer rows than asked
   * for: the END, from where the total is exact. A list that ends on a full
   * batch is found out by the empty one after it. The mark starts over with
   * `afresh` (a load that is neither `more` nor `window`) and with other
   * filters; a batch joined BEFORE the rows held says nothing about the end.
   */
  const learn = (
    store: Store,
    into: string,
    query: TableViewQuery,
    rows: number,
    join: SlicePlan["join"],
    afresh: boolean,
    at: (name: string) => string,
  ): void => {
    const lists = learnedUnder.get(store) ?? new Map<string, string>();
    learnedUnder.set(store, lists);
    const filters = JSON.stringify([query.filterIn, query.filterLike ?? {}, query.filterBetween ?? {}]);
    const startsOver = afresh || lists.get(into) !== filters;
    lists.set(into, filters);
    // The end was found under these filters: the total is exact, and no later answer makes it a guess again.
    if (!startsOver && store.get(at("hasMore")) === false) return;
    if (join === "prepend" && !startsOver) return;
    const mark = startsOver ? 0 : (store.getAs(at("total"), offsetSchema) ?? 0);
    const end = query.offset + rows;
    // Nothing at all from a row in the middle of the list (a slice asked for past its end) says only that it ends before.
    const ended = rows < query.limit && (rows > 0 || query.offset === 0 || join === "append");
    store.set(at("total"), ended ? end : Math.max(mark, end));
    store.set(at("hasMore"), !ended);
  };

  return async (store, rawArgs) => {
    const parsed = tableViewArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new Error(
        `table-view/load: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      );
    }
    // `metadata` and `more` belong to this call; everything else but `into` declares the view.
    const { into, metadata, more, window: slice, ...declared } = parsed.data;
    const at = (name: string): string => `${into}.${name}`;

    // A call with a url DECLARES the view; one without re-requests the declared one.
    let view: TableView | undefined;
    if (declared.url !== undefined) {
      view = { ...declared, url: declared.url };
      const previous = store.getAs(at("view"), tableViewSchema);
      if (!equalJson(previous, view)) store.set(at("view"), view);
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

    const { isLatest, signal } = begin(store, into);
    try {
      // Live store values are not validated; an inspector may hold anything.
      let page = store.getAs(at("page"), positiveInt) ?? 1;
      const pageSize = store.getAs(at("pageSize"), positiveInt) ?? view.pageSize ?? DEFAULT_PAGE_SIZE;
      // MORE: the rows after the ones held, which the answer is appended to.
      const held = more ? (store.getAs(at("data"), rowsSchema) ?? []) : undefined;
      // WINDOW: the rows the list asked for — a batch that joins the slice held, or a slice that replaces it.
      const sliceHeld = slice
        ? { rows: store.getAs(at("data"), rowsSchema) ?? [], offset: store.getAs(at("offset"), offsetSchema) ?? 0 }
        : undefined;
      const plan =
        sliceHeld === undefined
          ? undefined
          : slicePlan(
              store.getAs(at("wanted"), wantedSchema) ?? 0,
              sliceHeld.offset,
              sliceHeld.rows.length,
              pageSize,
              store.getAs(at("total"), offsetSchema),
            );
      const replaces = held === undefined && (plan === undefined || plan.join === "replace");
      // A batch that joins a windowed list's slice is fetched AHEAD OF TIME, under rows the user is reading: it is
      // not "loading" — a table would lay its spinner over them. Everything else is.
      if (plan === undefined || plan.join === "replace") store.set(at("loading"), true);
      const query: TableViewQuery = {
        offset: held !== undefined ? held.length : (plan?.from ?? (page - 1) * pageSize),
        limit: plan?.limit ?? pageSize,
        filterIn: store.getAs(at("filterIn"), chosenSchema) ?? {},
        filterLike: store.getAs(at("filterLike"), searchedSchema),
        filterBetween: store.getAs(at("filterBetween"), rangedSchema),
        orderBy: store.getAs(at("orderBy"), orderSchema),
      };
      let answer = tableViewResponseSchema.parse(await transport(view.url, requestOf(view, query, describe), signal));
      if (!isLatest()) return;

      // The page asked for lies behind the last one (a filter shrank the
      // table): ask once more, for the last page there is.
      const total = answer.totalRecords ?? undefined;
      if (replaces && total !== undefined && total > 0 && query.offset >= total) {
        page = Math.ceil(total / pageSize);
        // A slice asked for behind the end is the last one there is; a page, the last page.
        query.offset = plan === undefined ? (page - 1) * pageSize : Math.max(0, total - pageSize);
        const again = tableViewResponseSchema.parse(await transport(view.url, requestOf(view, query, false), signal));
        if (!isLatest()) return;
        answer = { ...answer, ...again, metadata: answer.metadata ?? again.metadata };
      }

      if (answer.metadata) {
        store.set(at("columns"), columnsOf(answer.metadata, view));
        store.set(at("filters"), filtersOf(answer.metadata, view));
      }
      if (answer.data) {
        // Nothing more to append leaves the rows as they are — the same
        // array, so a list watching them knows nothing came.
        if (replaces) {
          store.set(at("data"), answer.data);
        } else if (answer.data.length > 0) {
          // The rows are joined to the ones held NOW: no other load wrote since this one began (the latest wins), so
          // they are the same rows — but an action may have changed one meanwhile (a row marked as a favourite), and
          // the copy read before the request would bring the old one back.
          const now = store.getAs(at("data"), rowsSchema) ?? [];
          if (held !== undefined) {
            store.set(at("data"), [...now, ...answer.data]);
          } else if (sliceHeld !== undefined && plan !== undefined) {
            // A BATCH joins the slice held; beyond KEEP_BATCHES of them the rows farthest from it are dropped.
            const joined = joinedSlice({ ...sliceHeld, rows: now }, answer.data, plan, KEEP_BATCHES * pageSize);
            store.set(at("data"), joined.rows);
            store.set(at("offset"), joined.offset);
          }
        }
      }
      // Where in the whole list the rows held begin: a windowed list reads it; appended rows begin where they did.
      if (replaces) store.set(at("offset"), query.offset);
      if (answer.totalRecords !== undefined && answer.totalRecords !== null) {
        store.set(at("total"), answer.totalRecords);
        // Counted: the total is the whole list. (Said only where an uncounted answer said otherwise before.)
        if (store.get(at("hasMore")) !== undefined) store.set(at("hasMore"), false);
      } else if (answer.data) {
        const join = held !== undefined ? "append" : (plan?.join ?? "replace");
        learn(store, into, query, answer.data.length, join, held === undefined && plan === undefined, at);
      }
      if (held === undefined && plan === undefined) store.set(at("page"), page);
      store.set(at("pageSize"), pageSize);
      store.set(at("error"), undefined);
    } catch (error) {
      // The last good rows stay; the page can show what failed. A superseded
      // request (aborted, or answered late) says nothing: it is not the latest.
      if (isLatest()) store.set(at("error"), messageOf(error));
    } finally {
      if (isLatest()) store.set(at("loading"), false);
    }
  };
}
