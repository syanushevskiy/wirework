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
  requestOf,
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
    expect(columns[0]).toEqual({ title: "Job ID", property: "job_id" });
    expect(columns[1]).toEqual({ title: "Host", property: "host_name" });
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
    expect(filtersOf(tableMetadataSchema.parse({ columnDefinitions: [{ ...base, isFilterable: false }] }), {})).toEqual([]);
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
      { page: 1, pageSize: 50, filterIn: {} },
      false,
    );
    expect(request).toEqual(exampleRequest);
  });

  it("pages by limit and offset, and what the user chose replaces the declaration's for that column", () => {
    const request = requestOf(
      { url: "/x", request: { filterIn: { state: ["RUNNING", "STOPPING"], service: ["A"] } } },
      { page: 3, pageSize: 20, filterIn: { state: ["RUNNING"] }, orderBy: { created_at: "ASC" } },
      true,
    );
    expect(request.dataFilter).toMatchObject({
      limit: 20,
      offset: 40,
      filterIn: { state: ["RUNNING"], service: ["A"] },
      orderBy: { created_at: "ASC" },
    });
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

  it("re-requests the declared view by name: rows only, with what the user asked for", async () => {
    const { requests, transport } = exampleServer();
    const load = createTableViewLoader(transport);
    const store = createStore({});
    await load(store, { url: "/api/v1/view/jobs", into: "jobs", pageSize: 10, columns: { output_path: { hidden: true } } });
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
    const pending: Array<(answer: unknown) => void> = [];
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
