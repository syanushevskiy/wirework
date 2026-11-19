/** The playground's console API (`wirework.*`, apps/playground/src/devtools.ts), as the steps see it. */
import type { Page } from "@playwright/test";

/** What the playground reports as `wirework.requests()` (apps/playground/src/api/requests.ts). */
export interface RequestCounts {
  pending: number;
  answered: number;
  /** The URLs the view table API was asked for since the application started, in order. */
  asked: readonly string[];
}

export type Console = Window & {
  wireworkHoldAnswers?: boolean;
  /** While true, a lazy widget's code cannot be fetched (doc/ADR/0018-lazy-widgets.md). */
  wireworkFailCode?: boolean;
  /** How many runs both fake servers hold — a long list for the performance scenarios. */
  wireworkListSize?: number;
  wirework?: {
    requests: () => RequestCounts;
    releaseAnswers: () => void;
    /** The lazy widgets whose code arrived, in order — one entry per fetch. */
    loaded: () => readonly string[];
  };
};

export const requests = (page: Page): Promise<RequestCounts> =>
  page.evaluate(
    (): RequestCounts => (window as Console).wirework?.requests() ?? { pending: 0, answered: 0, asked: [] },
  );
