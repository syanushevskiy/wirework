/**
 * Fake runs SERVER for the demo application: an in-memory table behind a
 * simulated network round trip, so loading and paging behave like real
 * requests (latency, responses that arrive after the user has moved on).
 * The first rows are the sample runs; the rest are generated
 * deterministically, so e2e can assert what any page holds.
 *
 * The runs LIST is served through the VIEW TABLE API (doc/tableApi/,
 * @wirework/table-view): `fetchView` answers a request's `dataFilter`
 * (filterIn, orderBy, limit/offset) with flat rows, counts them when asked
 * (`totalRecords`) and DESCRIBES the table when asked (`metadata: true`):
 * the columns, which of them the server hides, and the values some can be
 * filtered by — all in ONE answer.
 *
 * Time passes on the server BETWEEN requests: after every answer of the
 * list, each unfinished run moves one step (queued → running → finished),
 * so the next refresh visibly brings news. `reset()` starts over — the
 * playground calls it when the runs page opens, so every visit of the list
 * replays the same sequence. Reading one run or the overview's numbers does
 * not move time.
 */
import type { TableViewRequest, TableViewResponse } from "@wirework/table-view";
import type { Run } from "@wirework/view-data-models-examples";

/** What the overview shows: counted over ALL runs on the server, as they are now. */
export interface RunsStats {
  total: number;
  failed: number;
  running: number;
  /** Share of successful runs among the finished ones, 0–100. */
  passRate: number;
}

export interface RunsServer {
  /** The view table API of the runs list: resolves after the simulated latency. */
  fetchView(request: TableViewRequest): Promise<TableViewResponse>;
  /** One run as it is now, or undefined when there is none with this id. Time does not move. */
  fetchRun(id: string): Promise<Run | undefined>;
  /** The overview's numbers. Time does not move. */
  fetchStats(): Promise<RunsStats>;
  /** Back to the initial runs. Requests still in flight no longer move time. */
  reset(): void;
}

const SUCCESS: Run["status"] = { state: "Success", message: "Finished" };
const FAILED: Run["status"] = { state: "Failed", message: "1 assertion failed" };
const RUNNING: Run["status"] = { state: "Running", message: "Step 2 of 5" };
const QUEUED: Run["status"] = { state: "Queued", message: "Waiting for a runner" };
const STATUSES = [SUCCESS, FAILED, RUNNING, QUEUED];

/** One step of server time. The outcome depends on the id, so e2e can assert it. */
function advance(run: Run): Run {
  switch (run.status.state) {
    case "Queued":
      return { ...run, status: RUNNING };
    case "Running":
      return { ...run, status: Number(run.id) % 2 === 0 ? SUCCESS : FAILED };
    default:
      return run;
  }
}

/** Seeded rows first, then generated ones continuing the id sequence. */
function buildRows(seed: readonly Run[], total: number): Run[] {
  const rows = [...seed];
  const seeded = rows.length;
  const lastId = Math.max(0, ...rows.map((row) => Number(row.id) || 0));
  for (let index = seeded; index < total; index += 1) {
    rows.push({
      id: String(lastId + index - seeded + 1),
      name: `E2E Run # ${98765 + index}`,
      reference: `REF${59456735 + index}`,
      inbound: `IND${557327 + index}`,
      status: STATUSES[index % STATUSES.length] ?? QUEUED,
    });
  }
  return rows;
}

/** A run as the view table API serves it: one flat record, keyed by the column ids. */
type ViewRow = Record<"id" | "name" | "reference" | "inbound" | "state" | "message", string>;

const toViewRow = (run: Run): ViewRow => ({
  id: run.id,
  name: run.name,
  reference: run.reference,
  inbound: run.inbound,
  state: run.status.state,
  message: run.status.message,
});

/** The description of the runs table. `null` among filter values is the API's "rows without a value". */
const describeRuns = (rows: readonly ViewRow[]): NonNullable<TableViewResponse["metadata"]> => ({
  columnDefinitions: [
    { id: "id", headerName: "#", type: "varchar(l)", description: null, filterValues: null, isFilterable: false, isHidden: false, isSortable: true },
    { id: "name", headerName: "Name", type: "varchar(l)", description: null, filterValues: null, isFilterable: true, isHidden: false, isSortable: true },
    { id: "reference", headerName: "Reference", type: "varchar(l)", description: null },
    {
      id: "inbound",
      headerName: "Inbound",
      type: "varchar(l)",
      description: null,
      filterValues: [...new Set(rows.map((row) => row.inbound))].slice(0, 6),
      isFilterable: true,
      isHidden: false,
      isSortable: true,
    },
    {
      id: "state",
      headerName: "Status",
      type: "varchar(l)",
      description: null,
      filterValues: ["Queued", "Running", null, "Success", "Failed"],
      isFilterable: true,
      isHidden: false,
      isSortable: true,
    },
    // The server itself hides this one: a page shows it only by asking to.
    { id: "message", headerName: "Message", type: "clob", description: null, filterValues: null, isHidden: true },
  ],
  enableFilter: true,
  enableSorting: true,
});

/** The rows a request's `dataFilter` selects, in its order — before paging. */
function select(rows: readonly ViewRow[], { filterIn, orderBy }: TableViewRequest["dataFilter"]): ViewRow[] {
  const field = (row: ViewRow, column: string): string | undefined => (row as Record<string, string | undefined>)[column];
  const selected = rows.filter((row) =>
    Object.entries(filterIn).every(
      ([column, values]) => values.length === 0 || values.map(String).includes(field(row, column) ?? ""),
    ),
  );
  // Later keys break the ties of earlier ones; the sort is stable.
  return Object.entries(orderBy).reduceRight<ViewRow[]>(
    (sorted, [column, direction]) =>
      [...sorted].sort(
        (a, b) =>
          (field(a, column) ?? "").localeCompare(field(b, column) ?? "", undefined, { numeric: true }) *
          (direction === "DESC" ? -1 : 1),
      ),
    selected,
  );
}

export function createRunsServer(options: { seed: readonly Run[]; total: number; latencyMs: number }): RunsServer {
  let rows = buildRows(options.seed, options.total);
  /** Bumped by `reset`: an answer from before a reset must not move the new timeline. */
  let epoch = 0;

  const answerView = (request: TableViewRequest): TableViewResponse => {
    const all = rows.map(toViewRow);
    const selected = select(all, request.dataFilter);
    const { limit, offset } = request.dataFilter;
    return {
      ...(request.metadata ? { metadata: describeRuns(all) } : {}),
      ...(request.totalRecords ? { totalRecords: selected.length } : {}),
      data: selected.slice(offset, offset + limit),
    };
  };

  return {
    fetchView: (request) =>
      new Promise((resolve) => {
        const started = epoch;
        setTimeout(() => {
          const answer = answerView(request);
          if (started === epoch) rows = rows.map(advance);
          resolve(answer);
        }, options.latencyMs);
      }),
    fetchRun: (id) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(rows.find((row) => row.id === id)), options.latencyMs);
      }),
    fetchStats: () =>
      new Promise((resolve) => {
        setTimeout(() => {
          const count = (state: string): number => rows.filter((row) => row.status.state === state).length;
          const finished = count("Success") + count("Failed");
          resolve({
            total: rows.length,
            failed: count("Failed"),
            running: count("Running"),
            passRate: finished === 0 ? 0 : Math.round((count("Success") / finished) * 100),
          });
        }, options.latencyMs);
      }),
    reset: () => {
      epoch += 1;
      rows = buildRows(options.seed, options.total);
    },
  };
}
