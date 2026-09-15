/**
 * Data Model layer — runtime state the widgets bind to through the Store.
 *
 * The engine is agnostic to the shape of this tree; these types document the
 * reference domain (test runs) used by fixtures and examples. Rows are keyed
 * by STABLE run id (team-tiger: identity, not position).
 */

export interface RunStatus {
  state: "Success" | "Failed" | (string & {});
  message: string;
}

/** A single run (table row) — identity is `id`, unique. */
export interface Run {
  id: string;
  name: string;
  reference: string;
  inbound: string;
  status: RunStatus;
}

export interface RunsData {
  /** Ordered ids of the rows currently displayed. */
  order: string[];
  /** Rows keyed by run id. */
  byId: Record<string, Run>;
}
