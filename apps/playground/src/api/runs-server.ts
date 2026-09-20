/**
 * Fake runs SERVER for the demo page: an in-memory table behind a simulated
 * network round trip, so loading and paging behave like real requests
 * (latency, responses that arrive after the user has moved on). The first
 * rows are the sample runs; the rest are generated deterministically, so
 * e2e can assert what any page holds.
 *
 * Time passes on the server BETWEEN requests: after every answer, each
 * unfinished run moves one step (queued → running → finished), so the next
 * refresh visibly brings news. `reset()` starts over — the playground calls
 * it when the demo page opens, so every visit replays the same sequence.
 */
import type { Run } from "@wirework/view-data-models-examples";

export interface RunsPageQuery {
  /** 1-based. */
  page: number;
  pageSize: number;
}

/** One page as the server answers it. */
export interface RunsPage {
  /** This page's runs, in order — the rows a table shows. */
  data: Run[];
  /** All rows on the server, not just this page. */
  total: number;
  /** The page actually served: clamped to the last one. */
  page: number;
  pageSize: number;
}

export interface RunsServer {
  /** The request: resolves with the page after the simulated latency. */
  fetchPage(query: RunsPageQuery): Promise<RunsPage>;
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

export function createRunsServer(options: { seed: readonly Run[]; total: number; latencyMs: number }): RunsServer {
  let rows = buildRows(options.seed, options.total);
  /** Bumped by `reset`: an answer from before a reset must not move the new timeline. */
  let epoch = 0;

  const pageOf = ({ page, pageSize }: RunsPageQuery): RunsPage => {
    const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
    const served = Math.min(Math.max(1, page), lastPage);
    return {
      data: rows.slice((served - 1) * pageSize, served * pageSize),
      total: rows.length,
      page: served,
      pageSize,
    };
  };

  return {
    fetchPage: (query) =>
      new Promise((resolve) => {
        const started = epoch;
        setTimeout(() => {
          const answer = pageOf(query);
          if (started === epoch) rows = rows.map(advance);
          resolve(answer);
        }, options.latencyMs);
      }),
    reset: () => {
      epoch += 1;
      rows = buildRows(options.seed, options.total);
    },
  };
}
