/**
 * The playground's "network" for the view table API: requests go to the
 * in-memory fake servers by URL, so the demo needs no backend. A real host
 * passes `fetchTransport` (@wirework/table-view) instead — the actions and
 * the pages stay exactly the same.
 *
 * Every request carries the SESSION the way a browser would carry a cookie
 * (`session()`: the roles of whoever is signed in), and an endpoint decides
 * what it answers from that — never from what the page asked for. The
 * admin's view of the runs refuses a session without the admin role
 * (doc/ADR/0012-roles.md): the role layer decides what the page SHOWS and
 * ASKS, the server what it ANSWERS — and `app.user.roles` in the store is
 * what the page shows by, never what the server trusts.
 */
import type { TableViewRequest, TableViewTransport } from "@wirework/table-view";
import { tracked } from "./requests";

export const RUNS_VIEW_URL = "/api/v1/view/runs";
/** The archive: the runs of years, a list too long to hold — served in slices to a windowed list. */
export const ARCHIVE_VIEW_URL = "/api/v1/view/archive";
export const ARCHIVE_TOTAL = 2000;
/** The admin's view: every owner's runs, with an `owner` column. */
export const RUNS_ALL_VIEW_URL = "/api/v1/view/runs/all";
/** The signed-in users — the Wirework admin's Sessions card. */
export const SESSIONS_VIEW_URL = "/api/v1/view/sessions";

/** What the fake servers know about the caller: the roles the session holds. */
export interface FakeSession {
  roles: readonly string[];
}

export type FakeEndpoint = (request: TableViewRequest, session: FakeSession) => Promise<unknown>;

/** A 403 as the fake servers answer it: an endpoint's refusal, in the words the page shows. */
export const forbidden = (url: string): Promise<never> =>
  Promise.reject(new Error(`${url} answered 403 Forbidden: your session may not see this view`));

export function createFakeTransport(
  endpoints: Record<string, FakeEndpoint>,
  session: () => FakeSession,
): TableViewTransport {
  return (url, request) => {
    const endpoint = endpoints[url];
    return tracked(
      endpoint ? endpoint(request, session()) : Promise.reject(new Error(`${url} answered 404 Not Found`)),
      url,
    );
  };
}
