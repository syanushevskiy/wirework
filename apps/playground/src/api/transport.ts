/**
 * The playground's "network" for the view table API: requests go to the
 * in-memory fake servers by URL, so the demo needs no backend. A real host
 * passes `fetchTransport` (@wirework/table-view) instead — the actions and
 * the pages stay exactly the same.
 */
import type { TableViewRequest, TableViewTransport } from "@wirework/table-view";

export const RUNS_VIEW_URL = "/api/v1/view/runs";

export function createFakeTransport(endpoints: Record<string, (request: TableViewRequest) => Promise<unknown>>): TableViewTransport {
  return (url, request) => {
    const endpoint = endpoints[url];
    return endpoint ? endpoint(request) : Promise.reject(new Error(`${url} answered 404 Not Found`));
  };
}
