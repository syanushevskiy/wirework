/**
 * The playground's ADDRESSES: which URL shows which page. The demo is a
 * small application under /demo, its pages' routes read from their folders
 * (`pages/<page>/page.json`, src/pages/index.ts); the builder is a single
 * page of the host's own. A page with a parameter in its path (":runId")
 * gets it through the router — the host puts what the router matched at
 * `route` in the page's store.
 */
import type { DemoPage } from "@wirework/view-data-models-examples";
import { demoPageRoutes } from "./pages";

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
  ...demoPageRoutes,
  { page: "builder", path: "/builder", title: "Builder", menu: true },
];
