/**
 * The table view against the API's OWN examples (doc/tableApi/): what the
 * server describes becomes columns and filters, the page's declaration
 * changes them, and the loader writes every part of an answer to its fixed
 * place — one request when the description and the rows come together.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createStore } from "@wirework/store";
import {
  columnsOf,
  createTableViewActions,
  createTableViewLoader,
  filtersOf,
  joinedSlice,
  requestOf,
  slicePlan,
  tableMetadataSchema,
  tableViewResponseSchema,
  type TableViewRequest,
  type TableViewTransport,
} from "../index";

const example = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../doc/tableApi/${name}`, import.meta.url), "utf8"));

const exampleRequest = example("1-request-renamed.json") as TableViewRequest;
const metadataAnswer = tableViewResponseSchema.parse(example("2-metadata-response-renamed.json"));
const dataAnswer = tableViewResponseSchema.parse(example("3-data-response-renamed.json"));
const metadata = tableMetadataSchema.parse(metadataAnswer.metadata);

describe("columnsOf", () => {
  it("shows the server's columns, in the server's order, under the server's headers", () => {
    const columns = columnsOf(metadata, {});
    expect(columns).toHaveLength(12);
    expect(columns[0]).toMatchObject({ title: "Job ID", property: "job_id" });
    expect(columns[1]).toMatchObject({ title: "Host", property: "host_name" });
  });

  it("says what each column's header can filter by, and whether the server sorts by it", () => {
    const columns = columnsOf(metadata, {});
    // Filterable with values: the values, as the filter bar offers them.
    expect(columns[1]).toEqual({
      title: "Host",
      property: "host_name",
      sortable: true,
      filter: {
        kind: "values",
        options: ["DEHOSTQA401118", "local", "invalidCredentials", "DEHOSTQD401877", "FRNODEKP2XT5"].map((value) => ({
          value,
        })),
      },
    });
    // Filterable without values: free text, searched with `filterLike`.
    expect(columns[0]).toEqual({ title: "Job ID", property: "job_id", filter: { kind: "text" }, sortable: true });
    // The server says nothing: no filter, no sorting.
    expect(columns[2]).toEqual({ title: "State", property: "state" });
  });

  it("follows the page's word on filters in the headers too, and the server's on what is not filterable or sortable", () => {
    const columns = columnsOf(metadata, {
      filters: { job_id: false, state: { values: ["RUNNING", "STOPPING"] } },
    });
    expect(columns[0]).toEqual({ title: "Job ID", property: "job_id", sortable: true });
    expect(columns[2]?.filter).toEqual({ kind: "values", options: [{ value: "RUNNING" }, { value: "STOPPING" }] });
    const off = tableMetadataSchema.parse({
      columnDefinitions: [{ id: "a", filterValues: ["x"], isFilterable: true, isSortable: true }],
      enableFilter: false,
      enableSorting: false,
    });
    expect(columnsOf(off, {})).toEqual([{ title: "a", property: "a" }]);
  });

  it("filters a date column by a period by default — unless the server or the page says no, or the page gives values", () => {
    const dated = (extra: Record<string, unknown> = {}, table: Record<string, unknown> = {}) =>
      tableMetadataSchema.parse({
        columnDefinitions: [{ id: "at", type: "timestamp(p) with time zone", ...extra }],
        ...table,
      });
    const filterOf = (metadata: ReturnType<typeof dated>, view: Parameters<typeof columnsOf>[1] = {}) =>
      columnsOf(metadata, view)[0]?.filter;
    expect(filterOf(dated())).toEqual({ kind: "dates" });
    expect(filterOf(dated({ type: "DATE" }))).toEqual({ kind: "dates" });
    // The server's own values do not turn a date into a list.
    expect(filterOf(dated({ filterValues: ["2026-11-01"], isFilterable: true }))).toEqual({ kind: "dates" });
    expect(filterOf(dated({ isFilterable: false }))).toBeUndefined();
    expect(filterOf(dated({}, { enableFilter: false }))).toBeUndefined();
    expect(filterOf(dated(), { filters: { at: false } })).toBeUndefined();
    // A date and a time at each end by default; the page asks for whole days.
    expect(filterOf(dated(), { filters: { at: { time: false } } })).toEqual({ kind: "dates", time: false });
    expect(filterOf(dated(), { filters: { at: { values: ["today"] } } })).toEqual({
      kind: "values",
      options: [{ value: "today" }],
    });
    // Not a date: nothing by default.
    expect(filterOf(dated({ type: "varchar(l)" }))).toBeUndefined();
  });

  it("leaves out what the server hides, unless the page shows it", () => {
    const hidden = tableMetadataSchema.parse({
      columnDefinitions: [{ id: "a" }, { id: "secret", headerName: "Secret", isHidden: true }],
    });
    expect(columnsOf(hidden, {}).map((column) => column.property)).toEqual(["a"]);
    expect(columnsOf(hidden, { columns: { secret: { hidden: false } } }).map((column) => column.property)).toEqual([
      "a",
      "secret",
    ]);
  });

  it("lets the page hide and rename columns", () => {
    const columns = columnsOf(metadata, {
      columns: { output_path: { hidden: true }, host_name: { title: "Machine" } },
    });
    expect(columns.map((column) => column.property)).not.toContain("output_path");
    expect(columns.find((column) => column.property === "host_name")?.title).toBe("Machine");
  });

  it("falls back to the id for a column without a header", () => {
    expect(columnsOf(tableMetadataSchema.parse({ columnDefinitions: [{ id: "bare" }] }), {})).toEqual([
      { title: "bare", property: "bare" },
    ]);
  });

  it("passes the page's cell through — how a column is shown is the page's word, the server describes data only", () => {
    const columns = columnsOf(metadata, {
      columns: {
        job_id: { cell: { kind: "link", to: "/jobs/{job_id}" } },
        state: { title: "Result", cell: { kind: "tag", tones: { FAILED: "danger" } } },
      },
    });
    expect(columns.find((column) => column.property === "job_id")).toMatchObject({
      title: "Job ID",
      property: "job_id",
      cell: { kind: "link", to: "/jobs/{job_id}" },
    });
    expect(columns.find((column) => column.property === "state")).toEqual({
      title: "Result",
      property: "state",
      cell: { kind: "tag", tones: { FAILED: "danger" } },
    });
    expect(columns.find((column) => column.property === "host_name")).not.toHaveProperty("cell");
  });
});

describe("filtersOf", () => {
  it("makes a filter of every column the server gives values for — without its null, as text", () => {
    expect(filtersOf(metadata, {})).toEqual([
      {
        id: "host_name",
        label: "Host",
        options: ["DEHOSTQA401118", "local", "invalidCredentials", "DEHOSTQD401877", "FRNODEKP2XT5"].map((value) => ({
          value,
        })),
      },
    ]);
  });

  it("lets the page remove a filter, use other values, and filter a column the server offers none for", () => {
    const filters = filtersOf(metadata, {
      filters: {
        host_name: false,
        state: { label: "Job state", values: ["RUNNING", "STOPPING"] },
      },
    });
    expect(filters).toEqual([
      { id: "state", label: "Job state", options: [{ value: "RUNNING" }, { value: "STOPPING" }] },
    ]);
  });

  it("offers nothing the server says cannot be filtered", () => {
    const base = { id: "a", filterValues: ["x"] };
    expect(filtersOf(tableMetadataSchema.parse({ columnDefinitions: [{ ...base, isFilterable: false }] }), {})).toEqual(
      [],
    );
    expect(filtersOf(tableMetadataSchema.parse({ columnDefinitions: [base], enableFilter: false }), {})).toEqual([]);
  });
});

describe("requestOf", () => {
  it("builds the API's own example request", () => {
    const request = requestOf(
      {
        url: "/api/v1/view/jobs",
        request: { filterIn: exampleRequest.dataFilter.filterIn, orderBy: { job_id: "DESC" } },
      },
      { offset: 0, limit: 50, filterIn: {} },
      false,
    );
    expect(request).toEqual(exampleRequest);
  });

  it("asks by limit and offset, and what the user chose replaces the declaration's for that column", () => {
    const request = requestOf(
      {
        url: "/x",
        request: { filterIn: { state: ["RUNNING", "STOPPING"], service: ["A"] }, filterLike: { build: "3." } },
      },
      {
        offset: 40,
        limit: 20,
        filterIn: { state: ["RUNNING"] },
        filterLike: { host_name: "qa", service: "" },
        orderBy: { created_at: "ASC" },
      },
      true,
    );
    expect(request.dataFilter).toMatchObject({
      limit: 20,
      offset: 40,
      filterIn: { state: ["RUNNING"], service: ["A"] },
      // What the user typed joins the declaration's; an emptied box is not sent.
      filterLike: { build: "3.", host_name: "qa" },
      orderBy: { created_at: "ASC" },
    });
    expect(request.dataFilter.filterLike).not.toHaveProperty("service");
    expect(request.metadata).toBe(true);
  });
});

/** A server answering with the examples: description when asked for it, rows always. */
function exampleServer() {
  const requests: TableViewRequest[] = [];
  const transport: TableViewTransport = async (_url, request) => {
    requests.push(request);
    return request.metadata ? { ...metadataAnswer, ...dataAnswer } : { ...dataAnswer, totalRecords: 36 };
  };
  return { requests, transport };
}

describe("the loader", () => {
  it("needs only a url: one request brings the description, the count and the rows", async () => {
    const { requests, transport } = exampleServer();
    const store = createStore({});
    await createTableViewLoader(transport)(store, { url: "/api/v1/view/jobs", into: "jobs" });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.metadata).toBe(true);
    expect(store.get("jobs.view")).toEqual({ url: "/api/v1/view/jobs" });
    expect(store.get<unknown[]>("jobs.columns")).toHaveLength(12);
    expect(store.get<unknown[]>("jobs.filters")).toHaveLength(1);
    expect(store.get<unknown[]>("jobs.data")).toHaveLength(3);
    expect(store.get("jobs.total")).toBe(36);
    expect(store.get("jobs.page")).toBe(1);
    expect(store.get("jobs.pageSize")).toBe(50);
    expect(store.get("jobs.loading")).toBe(false);
    expect(store.get("jobs.error")).toBeUndefined();
  });

  it("makes the table of the FIRST answer (the API's own example): the columns, each with its in-table filter, and the rows", async () => {
    const urls: string[] = [];
    const transport: TableViewTransport = async (url) => {
      urls.push(url);
      return example("4-data-first-response.json");
    };
    const store = createStore({});
    await createTableViewLoader(transport)(store, { url: "api/view/v1/runs", into: "runs" });

    expect(urls).toEqual(["api/view/v1/runs"]);
    const columns =
      store.get<{ title: string; property: string; filter?: unknown; sortable?: boolean }[]>("runs.columns");
    expect(columns?.map((column) => column.title)).toEqual([
      "Job ID",
      "Host",
      "State",
      "Service",
      "Build",
      "Trace port",
      "Failure Detail",
      "Auto Restart",
      "Created At",
      "Modified At",
      "Output Path",
      "Total",
    ]);
    // Filterable without values: a search field. With values: a list of them (the server's null left out).
    expect(columns?.[0]).toEqual({ title: "Job ID", property: "job_id", filter: { kind: "text" }, sortable: true });
    expect(columns?.[1]?.filter).toEqual({
      kind: "values",
      options: ["DEHOSTQA401118", "local", "invalidCredentials", "DEHOSTQD401877", "FRNODEKP2XT5"].map((value) => ({
        value,
      })),
    });
    // A DATE column (its type a timestamp) is filtered by a period, by default: the server need not say so.
    expect(columns?.find((column) => column.property === "created_at")).toEqual({
      title: "Created At",
      property: "created_at",
      filter: { kind: "dates" },
    });
    // The server says nothing about the rest: no filter in the table for them.
    expect(
      columns
        ?.slice(2)
        .filter((column) => column.property !== "created_at")
        .every((column) => column.filter === undefined && column.sortable === undefined),
    ).toBe(true);
    expect(store.get<{ job_id: number }[]>("runs.data")?.map((row) => row.job_id)).toEqual([900341, 900340, 900298]);
    // This answer does not count the rows — and brings fewer than were asked for: that is all of them.
    expect(store.get("runs.total")).toBe(3);
    expect(store.get("runs.hasMore")).toBe(false);
    expect(store.get("runs.error")).toBeUndefined();
    expect(store.get("runs.loading")).toBe(false);
  });

  it("re-requests the declared view by name: rows only, with what the user asked for", async () => {
    const { requests, transport } = exampleServer();
    const load = createTableViewLoader(transport);
    const store = createStore({});
    await load(store, {
      url: "/api/v1/view/jobs",
      into: "jobs",
      pageSize: 10,
      columns: { output_path: { hidden: true } },
    });
    store.set("jobs.page", 2);
    store.set("jobs.filterIn", { host_name: ["local"] });
    await load(store, { into: "jobs" });

    expect(requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({
      metadata: false,
      dataFilter: { limit: 10, offset: 10, filterIn: { host_name: ["local"] } },
    });
    // The description of the first answer stays.
    expect(store.get<unknown[]>("jobs.columns")).toHaveLength(11);
  });

  it("a page size declared ANEW applies: not the size the last answer left in the store", async () => {
    const { requests, transport } = exampleServer();
    const load = createTableViewLoader(transport);
    const store = createStore({});
    await load(store, { url: "/api/v1/view/jobs", into: "jobs", pageSize: 5 });
    store.set("jobs.page", 3);
    // The same declaration again (a refresh by the declaring call): the user's page stays.
    await load(store, { url: "/api/v1/view/jobs", into: "jobs", pageSize: 5 });
    expect(requests[1]?.dataFilter).toMatchObject({ limit: 5, offset: 10 });
    // An editor changed the reaction's page size: it applies, from the first page.
    await load(store, { url: "/api/v1/view/jobs", into: "jobs", pageSize: 10 });
    expect(requests[2]?.dataFilter).toMatchObject({ limit: 10, offset: 0 });
    expect(store.get("jobs.pageSize")).toBe(10);
  });

  it("sends the metadata flag the call asks for, whatever it would have decided itself", async () => {
    const { requests, transport } = exampleServer();
    const load = createTableViewLoader(transport);

    // A declaring call WITHOUT the description: rows only; the table shows what it can on its own.
    const bare = createStore({});
    await load(bare, { url: "/api/v1/view/jobs", into: "jobs", metadata: false });
    expect(requests[0]?.metadata).toBe(false);
    expect(bare.get("jobs.columns")).toBeUndefined();
    expect(bare.get<unknown[]>("jobs.data")).toHaveLength(3);
    // The flag belongs to the call, not to the declared view.
    expect(bare.get("jobs.view")).toEqual({ url: "/api/v1/view/jobs" });

    // A re-request WITH the description: the columns are derived again, by the view's own changes.
    const described = createStore({});
    await load(described, { url: "/api/v1/view/jobs", into: "jobs", columns: { output_path: { hidden: true } } });
    described.set("jobs.columns", []);
    await load(described, { into: "jobs", metadata: true });
    expect(requests[2]?.metadata).toBe(true);
    expect(described.get<unknown[]>("jobs.columns")).toHaveLength(11);
  });

  it("refuses a view nobody declared, and arguments it does not know", async () => {
    const load = createTableViewLoader(exampleServer().transport);
    await expect(load(createStore({}), { into: "jobs" })).rejects.toThrow(/no table view is declared/);
    await expect(load(createStore({}), { url: "/x" })).rejects.toThrow(/into/);
    await expect(load(createStore({}), { url: "/x", into: "jobs", colums: {} })).rejects.toThrow(/table-view\/load/);
    // A cell kind nobody defined, or a link to another origin, never reaches the table.
    await expect(
      load(createStore({}), { url: "/x", into: "jobs", columns: { a: { cell: { kind: "badge" } } } }),
    ).rejects.toThrow(/columns\.a\.cell/);
    await expect(
      load(createStore({}), {
        url: "/x",
        into: "jobs",
        columns: { a: { cell: { kind: "link", to: "//evil.example" } } },
      }),
    ).rejects.toThrow(/columns\.a\.cell\.to/);
  });

  it("keeps the last good rows when a request fails, and says what failed", async () => {
    const { transport } = exampleServer();
    let fail = false;
    const flaky: TableViewTransport = (url, request) =>
      fail ? Promise.reject(new Error("503 Service Unavailable")) : transport(url, request);
    const load = createTableViewLoader(flaky);
    const store = createStore({});
    await load(store, { url: "/api/v1/view/jobs", into: "jobs" });
    fail = true;
    await load(store, { into: "jobs" });
    expect(store.get("jobs.error")).toBe("503 Service Unavailable");
    expect(store.get<unknown[]>("jobs.data")).toHaveLength(3);
    expect(store.get("jobs.loading")).toBe(false);
    fail = false;
    await load(store, { into: "jobs" });
    expect(store.get("jobs.error")).toBeUndefined();
  });

  it("lets only the newest request write", async () => {
    const pending: ((answer: unknown) => void)[] = [];
    const transport: TableViewTransport = () => new Promise((resolve) => pending.push(resolve));
    const load = createTableViewLoader(transport);
    const store = createStore({});
    const first = load(store, { url: "/x", into: "t" });
    const second = load(store, { into: "t" });
    pending[1]?.({ data: [{ id: "new" }], totalRecords: 1 });
    pending[0]?.({ data: [{ id: "old" }], totalRecords: 9 });
    await Promise.all([first, second]);
    expect(store.get("t.data")).toEqual([{ id: "new" }]);
    expect(store.get("t.total")).toBe(1);
  });

  it("asks for the last page when the page asked for lies behind it", async () => {
    const requests: TableViewRequest[] = [];
    const transport: TableViewTransport = async (_url, request) => {
      requests.push(request);
      return { totalRecords: 12, data: request.dataFilter.offset >= 12 ? [] : [{ id: "row" }] };
    };
    const store = createStore({ t: { page: 5, pageSize: 5, columns: [] } });
    await createTableViewLoader(transport)(store, { url: "/x", into: "t" });
    expect(requests.map((request) => request.dataFilter.offset)).toEqual([20, 10]);
    expect(store.get("t.page")).toBe(3);
    expect(store.get("t.data")).toEqual([{ id: "row" }]);
  });

  it("sends what the headers searched for, from <into>.filterLike", async () => {
    const { requests, transport } = exampleServer();
    const store = createStore({ jobs: { filterLike: { host_name: "qa" } } });
    await createTableViewLoader(transport)(store, { url: "/api/v1/view/jobs", into: "jobs" });
    expect(requests[0]?.dataFilter.filterLike).toEqual({ host_name: "qa" });
  });

  it("sends what the date ranges picked, from <into>.filterBetween — a range with both ends empty is not sent", async () => {
    const { requests, transport } = exampleServer();
    const store = createStore({
      jobs: { filterBetween: { started: ["2026-11-01", "2026-11-09"], finished: ["", ""] } },
    });
    await createTableViewLoader(transport)(store, { url: "/api/v1/view/jobs", into: "jobs" });
    expect(requests[0]?.dataFilter.filterBetween).toEqual({ started: ["2026-11-01", "2026-11-09"] });
  });

  it("with more: asks for the rows after the ones held and appends them; the page stays", async () => {
    const all = Array.from({ length: 12 }, (_, index) => ({ id: String(index + 1) }));
    const requests: TableViewRequest[] = [];
    const transport: TableViewTransport = async (_url, request) => {
      requests.push(request);
      const { offset, limit } = request.dataFilter;
      return { totalRecords: all.length, data: all.slice(offset, offset + limit) };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    await load(store, { url: "/x", into: "t", pageSize: 5 });
    expect(store.get<unknown[]>("t.data")).toHaveLength(5);
    await load(store, { into: "t", more: true });
    expect(requests[1]?.dataFilter).toMatchObject({ offset: 5, limit: 5 });
    expect(store.get<unknown[]>("t.data")).toHaveLength(10);
    await load(store, { into: "t", more: true });
    expect(store.get<unknown[]>("t.data")).toHaveLength(12);
    expect(store.get("t.total")).toBe(12);
    expect(store.get("t.page")).toBe(1);
    // Nothing more: the rows stay the very same array, so a list watching them asks no further.
    const held = store.get("t.data");
    await load(store, { into: "t", more: true });
    expect(requests[3]?.dataFilter.offset).toBe(12);
    expect(store.get("t.data")).toBe(held);
    // A plain re-request replaces them, from the first page.
    await load(store, { into: "t" });
    expect(store.get<unknown[]>("t.data")).toHaveLength(5);
  });

  it("with window: replaces the rows held with the slice at <into>.wanted and says where it begins; the page stays", async () => {
    const all = Array.from({ length: 100 }, (_, index) => ({ id: String(index + 1) }));
    const requests: TableViewRequest[] = [];
    const transport: TableViewTransport = async (_url, request) => {
      requests.push(request);
      const { offset, limit } = request.dataFilter;
      return { totalRecords: all.length, data: all.slice(offset, offset + limit) };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    await load(store, { url: "/x", into: "t", pageSize: 20 });
    // Every answer that replaces the rows says where they begin: the first page begins the list.
    expect(store.get("t.offset")).toBe(0);
    store.set("t.wanted", 40);
    await load(store, { into: "t", window: true });
    expect(requests[1]?.dataFilter).toMatchObject({ offset: 40, limit: 20 });
    expect(store.get<{ id: string }[]>("t.data")?.map((row) => row.id)).toEqual(all.slice(40, 60).map((row) => row.id));
    expect(store.get("t.offset")).toBe(40);
    expect(store.get("t.page")).toBe(1);
    // A slice asked for behind the end is the last one there is.
    store.set("t.wanted", 500);
    await load(store, { into: "t", window: true });
    expect(store.get("t.offset")).toBe(80);
    expect(store.get<unknown[]>("t.data")).toHaveLength(20);
    // Appended rows begin where the ones held did.
    store.set("t.wanted", 0);
    await load(store, { into: "t", window: true });
    await load(store, { into: "t", more: true });
    expect(store.get("t.offset")).toBe(0);
    expect(store.get<unknown[]>("t.data")).toHaveLength(40);
  });

  it("countRows: false — the server is not asked for the total: it is the rows known so far, and exact once the end is found", async () => {
    const all = Array.from({ length: 50 }, (_, index) => ({ id: String(index + 1), odd: index % 2 === 0 }));
    const requests: TableViewRequest[] = [];
    // A server that does not count: it answers with rows only.
    const transport: TableViewTransport = async (_url, request) => {
      requests.push(request);
      const { offset, limit, filterIn } = request.dataFilter;
      const chosen = filterIn.odd === undefined ? all : all.filter((row) => row.odd);
      return { data: chosen.slice(offset, offset + limit) };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    const ask = async (offset: number, edge: string) => {
      store.set("t.wanted", { offset, edge });
      await load(store, { into: "t", window: true });
    };
    /** "40+": forty rows are known and the list goes on; "50": fifty, and that is all. */
    const known = () => `${store.get("t.total")}${store.get("t.hasMore") === true ? "+" : ""}`;

    await load(store, { url: "/x", into: "t", pageSize: 20, countRows: false });
    expect(requests[0]?.totalRecords).toBe(false);
    // A full batch: the list may go on.
    expect(known()).toBe("20+");
    await ask(20, "after");
    expect(known()).toBe("40+");
    // Back along the rows known, the far ones no longer held: the mark does not shrink with them.
    await ask(5, "around");
    expect(store.get("t.offset")).toBe(0);
    expect(store.get<unknown[]>("t.data")).toHaveLength(20);
    expect(known()).toBe("40+");
    await ask(20, "after");
    // A batch that comes back short is the end: the total is exact from here on…
    await ask(40, "after");
    expect(known()).toBe("50");
    // …whatever is asked for next.
    await ask(5, "around");
    expect(known()).toBe("50");
    // Other filters are another list: nothing is known about it but what this answer says.
    store.set("t.filterIn", { odd: ["true"] });
    store.set("t.wanted", 0);
    await load(store, { into: "t", window: true });
    expect(known()).toBe("20+");
    await ask(20, "after");
    expect(known()).toBe("25");
    // A load that is neither `more` nor `window` (a refresh) starts over too.
    await load(store, { into: "t" });
    expect(known()).toBe("20+");
  });

  it("countRows: false — an infinite list's `more` raises the mark and finds the end the same way", async () => {
    const all = Array.from({ length: 25 }, (_, index) => ({ id: String(index + 1) }));
    const transport: TableViewTransport = async (_url, request) => {
      const { offset, limit } = request.dataFilter;
      return { data: all.slice(offset, offset + limit) };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    await load(store, { url: "/x", into: "t", pageSize: 10, countRows: false });
    await load(store, { into: "t", more: true });
    expect([store.get("t.total"), store.get("t.hasMore")]).toEqual([20, true]);
    await load(store, { into: "t", more: true });
    expect([store.get("t.total"), store.get("t.hasMore")]).toEqual([25, false]);
  });

  it("a server that counts only SOME answers: a counted total does not outlive its filter", async () => {
    const all = Array.from({ length: 50 }, (_, index) => ({ id: String(index + 1), odd: index % 2 === 0 }));
    // It counts a filtered list and answers the whole one with rows only.
    const transport: TableViewTransport = async (_url, request) => {
      const { offset, limit, filterIn } = request.dataFilter;
      const data = (filterIn.odd === undefined ? all : all.filter((row) => row.odd)).slice(offset, offset + limit);
      return filterIn.odd === undefined ? { data } : { data, totalRecords: 25 };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    const known = () => [store.get("t.total"), store.get("t.hasMore")];
    for (const args of [{ window: true }, { more: true }, {}]) {
      store.set("t.filterIn", {});
      await load(store, { url: "/x", into: "t", pageSize: 30 });
      expect(known()).toEqual([30, true]);
      store.set("t.filterIn", { odd: ["true"] });
      store.set("t.wanted", 0);
      await load(store, { into: "t", window: true });
      expect(known()).toEqual([25, false]);
      // The filter is taken away: the list is the one of before, and what the count said of the other is gone.
      store.set("t.filterIn", {});
      if (args.more === true) store.set("t.data", []);
      await load(store, { into: "t", ...args });
      expect(known()).toEqual([30, true]);
    }
  });

  it("a server that counts only the FIRST batch: the count stands while the next ones join under the same filters", async () => {
    const all = Array.from({ length: 50 }, (_, index) => ({ id: String(index + 1) }));
    const transport: TableViewTransport = async (_url, request) => {
      const { offset, limit } = request.dataFilter;
      const data = all.slice(offset, offset + limit);
      return offset === 0 ? { data, totalRecords: 50 } : { data };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    await load(store, { url: "/x", into: "t", pageSize: 20 });
    await load(store, { into: "t", more: true });
    expect(store.get<unknown[]>("t.data")).toHaveLength(40);
    expect(store.get("t.total")).toBe(50);
    expect(store.get("t.hasMore")).not.toBe(true);
  });

  it("countRows: false — a list that ends on a full batch is known to end when the next one comes back empty", async () => {
    const all = Array.from({ length: 40 }, (_, index) => ({ id: String(index + 1) }));
    const transport: TableViewTransport = async (_url, request) => {
      const { offset, limit } = request.dataFilter;
      return { data: all.slice(offset, offset + limit) };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    await load(store, { url: "/x", into: "t", pageSize: 20, countRows: false });
    store.set("t.wanted", { offset: 20, edge: "after" });
    await load(store, { into: "t", window: true });
    expect([store.get("t.total"), store.get("t.hasMore")]).toEqual([40, true]);
    const held = store.get("t.data");
    store.set("t.wanted", { offset: 40, edge: "after" });
    await load(store, { into: "t", window: true });
    expect([store.get("t.total"), store.get("t.hasMore")]).toEqual([40, false]);
    // Nothing came: the rows are the very same array.
    expect(store.get("t.data")).toBe(held);
  });

  it("with window: a batch after or before the rows held joins them, at most three batches kept; a slice around a row replaces them", async () => {
    const all = Array.from({ length: 200 }, (_, index) => ({ id: String(index + 1) }));
    const requests: TableViewRequest[] = [];
    const transport: TableViewTransport = async (_url, request) => {
      requests.push(request);
      const { offset, limit } = request.dataFilter;
      return { totalRecords: all.length, data: all.slice(offset, offset + limit) };
    };
    const load = createTableViewLoader(transport);
    const store = createStore({ t: { columns: [] } });
    const held = () => {
      const rows = store.get<{ id: string }[]>("t.data") ?? [];
      return `${rows[0]?.id}-${rows.at(-1)?.id} from ${store.get("t.offset")}`;
    };
    const ask = async (offset: number, edge: string) => {
      store.set("t.wanted", { offset, edge });
      await load(store, { into: "t", window: true });
    };
    await load(store, { url: "/x", into: "t", pageSize: 20 });
    // AHEAD OF TIME: the batch after the rows held is appended — the rows in view stay, and nothing says "loading"
    // over them while it is on its way.
    const loading: unknown[] = [];
    const unsubscribe = store.subscribe("t.loading", () => loading.push(store.get("t.loading")));
    await ask(20, "after");
    unsubscribe();
    expect(loading).not.toContain(true);
    expect(requests.at(-1)?.dataFilter).toMatchObject({ offset: 20, limit: 20 });
    expect(held()).toBe("1-40 from 0");
    await ask(40, "after");
    expect(held()).toBe("1-60 from 0");
    // A fourth batch: the first one, farthest from it, is dropped.
    await ask(60, "after");
    expect(held()).toBe("21-80 from 20");
    // Back towards the start: the batch before is put in front, the last one dropped.
    await ask(20, "before");
    expect(requests.at(-1)?.dataFilter).toMatchObject({ offset: 0, limit: 20 });
    expect(held()).toBe("1-60 from 0");
    expect(store.get("t.page")).toBe(1);
    // A batch asked for at an edge the slice no longer has (a filter came between) is a slice of its own.
    await ask(100, "after");
    expect(held()).toBe("101-120 from 100");
    // A jump: the slice AROUND the row wanted replaces the rows held, the row in its middle.
    await ask(150, "around");
    expect(held()).toBe("141-160 from 140");
    // Around the last rows: the last full slice.
    await ask(195, "around");
    expect(held()).toBe("181-200 from 180");
    // Nothing after the last row: the rows stay the very same.
    const before = store.get("t.data");
    await ask(200, "after");
    expect(store.get("t.data")).toBe(before);
  });

  it("slicePlan and joinedSlice: what is asked for, and what becomes of the answer", () => {
    expect(slicePlan(40, 0, 20, 20)).toEqual({ from: 40, limit: 20, join: "replace" });
    expect(slicePlan({ offset: 20, edge: "after" }, 0, 20, 20)).toEqual({ from: 20, limit: 20, join: "append" });
    // The batch before the tenth row is ten rows, not twenty.
    expect(slicePlan({ offset: 10, edge: "before" }, 10, 20, 20)).toEqual({ from: 0, limit: 10, join: "prepend" });
    expect(slicePlan({ offset: 5, edge: "around" }, 100, 20, 20)).toEqual({ from: 0, limit: 20, join: "replace" });
    const row = (id: number) => ({ id });
    // A batch shorter than asked for would leave a gap before the rows held: it stands alone.
    expect(joinedSlice({ rows: [row(20)], offset: 20 }, [row(5)], { from: 0, limit: 20, join: "prepend" }, 60)).toEqual(
      { rows: [row(5)], offset: 0 },
    );
  });
});

describe("the action", () => {
  it("is table-view/load, and hands the reaction's `with` to the loader", async () => {
    const { transport } = exampleServer();
    const [action] = createTableViewActions({ transport });
    expect(action?.name).toBe("table-view/load");
    const store = createStore({});
    await action?.handler({
      store,
      args: { url: "/api/v1/view/jobs", into: "jobs" },
      event: { widget: "w", name: "clicked", payload: {}, source: { page: "p", cell: "c" }, seq: 0 },
      signal: new AbortController().signal,
    });
    expect(store.get<unknown[]>("jobs.data")).toHaveLength(3);
  });
});
