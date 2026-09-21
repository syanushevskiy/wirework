/**
 * The playground's ADDRESSES: which URL shows which page. The demo is a
 * small application under /demo; the builder is a single page. A page with
 * a parameter in its path (":runId") gets it through the router — the host
 * puts what the router matched at `route` in the page's store.
 */
import type { DemoPage } from "@wirework/view-data-models-examples";

export interface PageRoute {
  /** The page's name in the view models (`viewModels.pages.<page>`). */
  page: DemoPage | "builder";
  path: string;
  title: string;
  /** Pages of the menu; the others are reached from a page (a button, a link). */
  menu: boolean;
}

export const DEMO_HOME = "/demo";

export const PAGE_ROUTES: readonly PageRoute[] = [
  { page: "overview", path: DEMO_HOME, title: "Overview", menu: true },
  { page: "runs", path: "/demo/runs", title: "Runs", menu: true },
  { page: "run", path: "/demo/runs/:runId", title: "Run", menu: false },
  { page: "settings", path: "/demo/settings", title: "Settings", menu: true },
  { page: "builder", path: "/builder", title: "Builder", menu: true },
];
