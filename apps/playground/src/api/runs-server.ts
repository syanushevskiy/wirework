/**
 * Fake runs SERVER for the demo page: an in-memory table behind a simulated
 * network round trip, so paging behaves like a real request (latency,
 * responses that arrive after the user has moved on). The first rows are
 * the seeded runs; the rest are generated deterministically, so e2e can
 * assert what any page holds.
 *
 * Time passes on the server: every request moves each unfinished run one
 * step (queued → running → finished), so a refresh visibly brings news.
 */
import type { Run, RunsData } from "@wirework/schema";

export interface RunsPageQuery {
  /** 1-based. */
  page: number;
  pageSize: number;
}

/** One page as the server answers it. */
export interface RunsPage {
  data: RunsData;
  /** All rows on the server, not just this page. */
  total: number;
  /** The page actually served: clamped to the last one. */
  page: number;
  pageSize: number;
}

export interface RunsServer {
  /** Synchronous read: the page the server rendered into the initial state. */
  pageOf(query: RunsPageQuery): RunsPage;
  /** The request: resolves with the page after the simulated latency. */
  fetchPage(query: RunsPageQuery): Promise<RunsPage>;
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
function buildRows(seed: RunsData, total: number): Run[] {
  const rows = seed.order.flatMap((id) => {
    const row = seed.byId[id];
    return row ? [row] : [];
  });
  const seeded = rows.length;
  const lastId = Math.max(0, ...rows.map((row) => Number(row.id) || 0));
  for (let index = seeded; index < total; index += 1) {
    rows.push({
      id: String(lastId + index - seeded + 1),
      name: `E2E Run # ${98765 + index}`,
      reference: `REF${59456735 + index}`,
      inbound: `IND${557327 + index}`,
      status: STATUSES[index % STATUSES.length]!,
    });
  }
  return rows;
}

export function createRunsServer(options: { seed: RunsData; total: number; latencyMs: number }): RunsServer {
  let rows = buildRows(options.seed, options.total);

  const pageOf = ({ page, pageSize }: RunsPageQuery): RunsPage => {
    const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
    const served = Math.min(Math.max(1, page), lastPage);
    const slice = rows.slice((served - 1) * pageSize, served * pageSize);
    return {
      data: {
        order: slice.map((row) => row.id),
        byId: Object.fromEntries(slice.map((row) => [row.id, row])),
      },
      total: rows.length,
      page: served,
      pageSize,
    };
  };

  return {
    pageOf,
    fetchPage: (query) =>
      new Promise((resolve) =>
        setTimeout(() => {
          rows = rows.map(advance);
          resolve(pageOf(query));
        }, options.latencyMs),
      ),
  };
}
