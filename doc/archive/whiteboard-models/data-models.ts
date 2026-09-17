/**
 * Data Models
 *
 * Runtime state of the application the view models are bound to:
 * current user, active filters, pagination, refresher settings and
 * the loaded/cached run data.
 */

/** Current user. */
export interface UserModel {
  name: string;
  // ...
}

/** Active filter values for the runs page. */
export interface RunsFilters {
  /** Selected applications (multi-select). */
  applications: string[];
  /** "Started" date range, ISO timestamps. */
  started: {
    from: string;
    to: string;
  };
  /** Free-text search. */
  search: string;
  /** Sort order — list of properties. */
  order: string[];
  /** Compiled query string sent to the backend. */
  query: string;
}

/** Pagination state. */
export interface RunsPagination {
  /** Page size (rows per page). */
  window: number;
  /** Current page number. */
  current: number;
}

/** Auto-refresh state ("Refresh every N seconds"). */
export interface RunsRefresher {
  enabled: boolean;
  /** Refresh interval, seconds. */
  every: number;
}

/** Status of a single run. */
export interface RunStatus {
  state: "Success" | "Failed" | string;
  message: string;
}

/** A single run (table row). */
export interface Run {
  id: string;
  name: string;
  reference: string;
  inbound: string;
  status: RunStatus;
  /** Available actions for the row. TBD. */
  actions?: unknown;
}

/** Rows keyed by their absolute row number. */
export type RunRows = Record<number, Run>;

/** Currently displayed data. */
export interface RunsData {
  /** Rows of the current page. */
  current: RunRows;
}

/**
 * Cache for pages: page number -> rows.
 * Holds the previous loaded state, the current page and
 * preloaded neighbours (e.g. pages 1, 2, 5, 6 when page 5 is current).
 */
export type RunsPagesCache = Record<number, RunRows>;

/** Data model of the runs page: component control, sorting and configuration. */
export interface RunsModel {
  filters: RunsFilters;
  pagination: RunsPagination;
  refresher: RunsRefresher;
  data: RunsData;
  pages: RunsPagesCache;
}

/** Root data model. */
export interface DataModels {
  user: UserModel;
  runs: RunsModel;
}

/* ------------------------------------------------------------------ */
/* Data (transcribed from the whiteboard sketch)                       */
/* ------------------------------------------------------------------ */

export const dataModels: DataModels = {
  user: {
    name: "user.name@db.com",
    // ...
  },

  runs: {
    filters: {
      applications: ["ABC"],
      started: {
        from: "2025-11-05T11:30:42.760Z",
        to: "2025-11-06T11:30:42.760Z",
      },
      search: "user.name@db.com",
      order: ["reference", "id"],
      query: "applications=ABC&started=...",
    },

    pagination: {
      window: 10,
      current: 5,
    },

    refresher: {
      enabled: true,
      every: 5,
    },

    data: {
      // Rows of the current page (#5)
      current: {
        51: {
          id: "123456",
          name: "E2E Run # 98765",
          reference: "REF55456735",
          inbound: "IND539363",
          status: {
            state: "Failed",
            message: "ERROR ...",
          },
          actions: undefined, // <TBD>
        },
        52: {
          id: "123457",
          name: "E2E Run # 98766",
          reference: "REF59456736",
          inbound: "IND557328",
          status: {
            state: "Success",
            message: "Finished",
          },
          actions: undefined, // <TBD>
        },
        // < ... >
      },
    },

    // Cache for pages
    pages: {
      // Cache for page #1 (previous loaded state)
      1: {
        // 1:  { <data for row #1> },
        // 2:  { <data for row #2> },
        // ...
        // 10: { <data for row #10> },
      },
      // Cache for page #2 (preload for previous)
      2: {
        // 11: { <data for row #11> },
        // 12: { <data for row #12> },
        // ...
        // 20: { <data for row #20> },
      },
      // Cache for page #5 (current)
      5: {
        // 51: { <data for row #51> },
        // 52: { <data for row #52> },
        // ...
        // 60: { <data for row #60> },
      },
      // Cache for page #6 (preload for current)
      6: {
        // 61: { <data for row #61> },
        // 62: { <data for row #62> },
        // ...
        // 70: { <data for row #70> },
      },
    },
  },
};
