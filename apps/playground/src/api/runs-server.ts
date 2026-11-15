/**
 * Fake runs SERVER for the demo application: an in-memory table behind a
 * simulated network round trip, so loading and paging behave like real
 * requests (latency, responses that arrive after the user has moved on).
 * The first rows are the sample runs; the rest are generated
 * deterministically, so e2e can assert what any page holds.
 *
 * The runs LIST is served through the VIEW TABLE API (doc/tableApi/,
 * @wirework/table-view): `fetchView` answers a request's `dataFilter`
 * (filterIn, filterLike, orderBy, limit/offset) with flat rows, counts them when asked
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
import { tracked } from "./requests";

/** What the overview shows: counted over ALL runs on the server, as they are now. */
export interface RunsStats {
  total: number;
  failed: number;
  running: number;
  /** Share of successful runs among the finished ones, 0–100. */
  passRate: number;
}

/** One entry of a run's history, as the server tells it — the shape the timeline widget shows. */
export interface RunEvent {
  time?: string;
  title?: string;
  text: string;
  tone?: "default" | "info" | "success" | "warning" | "danger";
}

/** A run as its page gets it: the record plus its history. */
export type RunDetails = Run & { history: RunEvent[] };

export interface RunsServer {
  /** The view table API of the runs list: resolves after the simulated latency. */
  fetchView(request: TableViewRequest): Promise<TableViewResponse>;
  /**
   * The ADMIN's view of the list (doc/ADR/0012-roles.md): every owner's runs,
   * with an `owner` column the server offers a filter for. The same list,
   * the same clock — a page change here moves time like one on the plain view.
   */
  fetchViewAll(request: TableViewRequest): Promise<TableViewResponse>;
  /** One run as it is now, with its history, or undefined when there is none with this id. Time does not move. */
  fetchRun(id: string): Promise<RunDetails | undefined>;
  /** Delete one run (doc/ADR/0012-roles.md: the Wirework admin's button). Time does not move. */
  deleteRun(id: string): Promise<void>;
  /** Queue one run again, noting why (the run page's Retry dialog). Time does not move. */
  retryRun(id: string, reason: string): Promise<void>;
  /**
   * Mark one run as a favourite, or take the mark away (the archive's star; doc/ADR/0020-row-actions.md). The list
   * then says so in every row's `favorite` — only with `details`. Time does not move.
   */
  setFavorite(id: string, favorite: boolean): Promise<void>;
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

/**
 * Seeded rows first, then generated ones continuing the id sequence — each
 * started one day earlier than the one before, in October, so a date range
 * over the seeded runs' November days selects a known few.
 */
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
      // A real calendar day however long the list: the 25th of October 2026, minus one day per row.
      started: `${new Date(Date.UTC(2026, 9, 25 - (index - seeded))).toISOString().slice(0, 10)} 09:00`,
      status: STATUSES[index % STATUSES.length] ?? QUEUED,
    });
  }
  return rows;
}

/** `started` some minutes later, as text — the history's times; every run starts on a full hour. */
const minutesAfter = (started: string, minutes: number): string =>
  `${started.slice(0, 14)}${String(minutes).padStart(2, "0")}`;

/** A run's history as the server tells it: queued when it started, then what has happened since — and every retry. */
function historyOf(run: Run, retries: readonly string[]): RunEvent[] {
  const { state, message } = run.status;
  return [
    { time: run.started, text: "Queued", tone: "default" },
    ...(state === "Queued"
      ? []
      : [{ time: minutesAfter(run.started, 1), text: "Running on qa-1", tone: "info" as const }]),
    ...(state === "Success"
      ? [{ time: minutesAfter(run.started, 7), text: "Finished", tone: "success" as const }]
      : []),
    ...(state === "Failed"
      ? [{ time: minutesAfter(run.started, 7), title: "Failed", text: message, tone: "danger" as const }]
      : []),
    ...retries.map((reason) => ({
      title: "Retried",
      text: reason === "" ? "no reason given" : reason,
      tone: "warning" as const,
    })),
  ];
}

/** A run as the view table API serves it: one flat record, keyed by the column ids — the owner on the admin's view only. */
type ViewRow = Record<"id" | "name" | "reference" | "inbound" | "started" | "state" | "message", string> & {
  owner?: string;
  runner?: string;
  branch?: string;
  duration?: string;
};

/** Who a run belongs to: the server's knowledge, by the id's parity so a scenario can assert it. */
const ownerOf = (run: Run): string => (Number(run.id) % 2 === 0 ? "alice" : "bob");

const RUNNERS = ["qa-1", "qa-2", "qa-3", "qa-4"];
const BRANCHES = ["main", "release", "hotfix"];

/**
 * What a long list's view tells on top (the archive): the machine a run ran
 * on, its branch and how long it took — all by the id, so a scenario can
 * assert them: `123456` ran on qa-1 from main for 9 min.
 */
const detailsOf = (run: Run): Pick<ViewRow, "runner" | "branch" | "duration"> => {
  const id = Number(run.id) || 0;
  return {
    runner: RUNNERS[id % RUNNERS.length] ?? "qa-1",
    branch: BRANCHES[id % BRANCHES.length] ?? "main",
    duration: `${3 + (id % 17)} min`,
  };
};

const DETAIL_COLUMNS: NonNullable<TableViewResponse["metadata"]>["columnDefinitions"] = [
  {
    id: "runner",
    headerName: "Runner",
    type: "varchar(l)",
    description: null,
    filterValues: RUNNERS,
    isFilterable: true,
    isHidden: false,
    isSortable: true,
  },
  {
    id: "branch",
    headerName: "Branch",
    type: "varchar(l)",
    description: null,
    filterValues: BRANCHES,
    isFilterable: true,
    isHidden: false,
    isSortable: true,
  },
  {
    id: "duration",
    headerName: "Duration",
    type: "varchar(l)",
    description: null,
    filterValues: null,
    isFilterable: false,
    isHidden: false,
    isSortable: true,
  },
];

const toViewRow = (run: Run, withOwner: boolean): ViewRow => ({
  id: run.id,
  name: run.name,
  reference: run.reference,
  inbound: run.inbound,
  started: run.started,
  state: run.status.state,
  message: run.status.message,
  ...(withOwner ? { owner: ownerOf(run) } : {}),
});

/** The description of the runs table. `null` among filter values is the API's "rows without a value". */
const describeRuns = (rows: readonly ViewRow[], withOwner: boolean): NonNullable<TableViewResponse["metadata"]> => ({
  columnDefinitions: [
    // The admin's view alone has an owner, and offers a filter for it (the page may still keep it out of the bar).
    ...(withOwner
      ? [
          {
            id: "owner",
            headerName: "Owner",
            type: "varchar(l)",
            description: null,
            filterValues: ["alice", "bob"],
            isFilterable: true,
            isHidden: false,
            isSortable: true,
          },
        ]
      : []),
    {
      id: "id",
      headerName: "#",
      type: "varchar(l)",
      description: null,
      filterValues: null,
      isFilterable: false,
      isHidden: false,
      isSortable: true,
    },
    {
      id: "name",
      headerName: "Name",
      type: "varchar(l)",
      description: null,
      filterValues: null,
      isFilterable: true,
      isHidden: false,
      isSortable: true,
    },
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
    // The server itself hides these two: a page shows them only by asking to — and filters by `started` with a range.
    { id: "message", headerName: "Message", type: "clob", description: null, filterValues: null, isHidden: true },
    { id: "started", headerName: "Started", type: "timestamp", description: null, filterValues: null, isHidden: true },
  ],
  enableFilter: true,
  enableSorting: true,
});

/** A `filterBetween` value as the date-range widget sends it: [from, to], either end "" for open. Anything else is ignored. */
const rangeOf = (value: unknown): [string, string] | undefined =>
  Array.isArray(value) && value.length === 2 && value.every((end) => typeof end === "string")
    ? // The one cast: the two checks above are exactly what the tuple type says.
      (value as [string, string])
    : undefined;

/**
 * The rows a request's `dataFilter` selects, in its order — before paging.
 * `filterLike` is a case-blind "contains"; `filterBetween` compares the
 * column's text with the ends as text (ISO dates sort as text), the `to`
 * end over the column's first characters so a day includes its whole day.
 */
function select(
  rows: readonly ViewRow[],
  { filterBetween, filterIn, filterLike, orderBy }: TableViewRequest["dataFilter"],
): ViewRow[] {
  const field = (row: ViewRow, column: string): string | undefined =>
    (row as Record<string, string | undefined>)[column];
  const between = (row: ViewRow, column: string, range: [string, string]): boolean => {
    const [from, to] = range;
    const value = field(row, column) ?? "";
    return (from === "" || value >= from) && (to === "" || value.slice(0, to.length) <= to);
  };
  const selected = rows.filter(
    (row) =>
      Object.entries(filterIn).every(
        ([column, values]) => values.length === 0 || values.map(String).includes(field(row, column) ?? ""),
      ) &&
      Object.entries(filterLike).every(([column, text]) =>
        (field(row, column) ?? "").toLowerCase().includes(String(text).toLowerCase()),
      ) &&
      Object.entries(filterBetween).every(([column, value]) => {
        const range = rangeOf(value);
        return range === undefined || between(row, column, range);
      }),
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

export function createRunsServer(options: {
  seed: readonly Run[];
  total: number;
  latencyMs: number;
  /** Three more columns on every view — Runner, Branch, Duration (the archive's list). */
  details?: boolean;
}): RunsServer {
  const details = options.details === true;
  let rows = buildRows(options.seed, options.total);
  /** Why each run was queued again, in order — told in its history. */
  let retries = new Map<string, string[]>();
  /** The runs marked as favourites, by id. */
  let favorites = new Set<string>();
  /** Bumped by `reset`: an answer from before a reset must not move the new timeline. */
  let epoch = 0;

  const answerView = (request: TableViewRequest, withOwner: boolean): TableViewResponse => {
    // `favorite` is a fact of the row no column shows: the star at the row's start reads it.
    const all = rows.map((run) => ({
      ...toViewRow(run, withOwner),
      ...(details ? { ...detailsOf(run), favorite: favorites.has(run.id) } : {}),
    }));
    const selected = select(all, request.dataFilter);
    const { limit, offset } = request.dataFilter;
    const described = describeRuns(all, withOwner);
    return {
      ...(request.metadata
        ? {
            metadata: details
              ? { ...described, columnDefinitions: [...described.columnDefinitions, ...DETAIL_COLUMNS] }
              : described,
          }
        : {}),
      ...(request.totalRecords ? { totalRecords: selected.length } : {}),
      data: selected.slice(offset, offset + limit),
    };
  };

  /** One simulated round trip: the answer computed after the latency, and the request counted as pending until then. */
  const roundTrip = <T>(answer: () => T): Promise<T> =>
    tracked(
      new Promise((resolve) => {
        setTimeout(() => resolve(answer()), options.latencyMs);
      }),
    );

  /** One answer of the list, moving time one step after it — unless a reset came in between. */
  const listView = (request: TableViewRequest, withOwner: boolean): Promise<TableViewResponse> => {
    const started = epoch;
    return roundTrip(() => {
      const answer = answerView(request, withOwner);
      if (started === epoch) rows = rows.map(advance);
      return answer;
    });
  };

  return {
    fetchView: (request) => listView(request, false),
    fetchViewAll: (request) => listView(request, true),
    fetchRun: (id) =>
      roundTrip(() => {
        const run = rows.find((row) => row.id === id);
        return run === undefined ? undefined : { ...run, history: historyOf(run, retries.get(id) ?? []) };
      }),
    deleteRun: (id) =>
      roundTrip(() => {
        rows = rows.filter((row) => row.id !== id);
      }),
    retryRun: (id, reason) =>
      roundTrip(() => {
        rows = rows.map((row) => (row.id === id ? { ...row, status: QUEUED } : row));
        retries.set(id, [...(retries.get(id) ?? []), reason]);
      }),
    setFavorite: (id, favorite) =>
      roundTrip(() => {
        // The server decides by the id alone: a run it does not have is nobody's favourite.
        if (favorite && rows.some((row) => row.id === id)) favorites.add(id);
        else favorites.delete(id);
      }),
    fetchStats: () =>
      roundTrip(() => {
        const count = (state: string): number => rows.filter((row) => row.status.state === state).length;
        const finished = count("Success") + count("Failed");
        return {
          total: rows.length,
          failed: count("Failed"),
          running: count("Running"),
          passRate: finished === 0 ? 0 : Math.round((count("Success") / finished) * 100),
        };
      }),
    reset: () => {
      epoch += 1;
      rows = buildRows(options.seed, options.total);
      retries = new Map();
      favorites = new Set();
    },
  };
}
