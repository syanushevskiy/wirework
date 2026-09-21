/**
 * The router and the playground behind it — created ONCE, outside React.
 *
 * Every page route has a LOADER, and the loader is what opens a page visit
 * (boot.ts): the router runs it on every navigation to the route — a menu
 * click, Back, a link, an action calling `nav/go`, and also a click on the
 * page you are already on. So "a visit starts from the page's initial
 * state" holds however the user got there, and the visit is created outside
 * rendering (StrictMode renders twice; a loader runs once).
 *
 * The actions get a Navigator instead of the router: pages name where to
 * go (`nav/go`), the host decides how.
 */
import { createBrowserRouter, redirect, useLoaderData, type RouteObject } from "react-router";
import { App } from "./App";
import { boot, type PageVisit } from "./boot";
import { PageVisitView } from "./components/page-visit-view";
import { DEMO_HOME, PAGE_ROUTES } from "./routes";

/** The route's element: the view of the visit its loader opened. Keyed — a new visit starts all UI state over. */
function PageRouteElement({ playground }: { playground: ReturnType<typeof boot> }) {
  const visit = useLoaderData<PageVisit>();
  return <PageVisitView key={visit.id} playground={playground} visit={visit} />;
}

export function createPlaygroundRouter() {
  const playground = boot({
    // Called from actions, long after the router below exists.
    navigator: { go: (to) => void router.navigate(to) },
  });

  const pages: RouteObject[] = PAGE_ROUTES.map(({ page, path }) => ({
    path,
    loader: ({ params, request }): PageVisit => {
      const route = {
        path: new URL(request.url).pathname,
        params: Object.fromEntries(Object.entries(params).map(([name, value]) => [name, value ?? ""])),
      };
      return page === "builder" ? playground.openBuilder(route) : playground.openDemoPage(page, route);
    },
    element: <PageRouteElement playground={playground} />,
  }));

  const router = createBrowserRouter([
    {
      path: "/",
      element: <App />,
      hydrateFallbackElement: <p className="pg-main">Opening the playground…</p>,
      children: [
        { index: true, loader: () => redirect(DEMO_HOME) },
        ...pages,
        // An address nobody knows: back to the demo's first page.
        { path: "*", loader: () => redirect(DEMO_HOME) },
      ],
    },
  ]);
  return router;
}
