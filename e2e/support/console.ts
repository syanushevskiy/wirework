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
  wirework?: { requests: () => RequestCounts; releaseAnswers: () => void };
};

export const requests = (page: Page): Promise<RequestCounts> =>
  page.evaluate(
    (): RequestCounts => (window as Console).wirework?.requests() ?? { pending: 0, answered: 0, asked: [] },
  );
