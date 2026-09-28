/** The playground as the suite sees it: its pages, and the live page view. */
import type { Page } from "@playwright/test";

/** Where each page of the menu lives (apps/playground/src/routes.ts). */
export const PAGE_PATHS: Record<string, string> = {
  overview: "/demo",
  runs: "/demo/runs",
  settings: "/demo/settings",
  builder: "/builder",
};

/**
 * The LIVE page only: the builder palette renders real widget instances as
 * previews, so widget test ids must be looked up inside the page view.
 */
export const live = (page: Page) => page.getByTestId("page");

/** A cell of the live page, by its id. */
export const cell = (page: Page, id: string) => live(page).locator(`[data-testid="cell"][data-cell="${id}"]`);
