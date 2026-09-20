/**
 * Runs loading — business logic packaged as a factory over a host service
 * (doc/actions-design.md, "Registration").
 *
 * `createRunsLoader` is THE way runs reach a store: it requests the page at
 * runs.page / runs.pageSize and writes the answer back. Results travel
 * through the store, one visible step at a time: runs.loading while the
 * request is in flight, then runs.data, runs.total, and the page and page
 * size actually served. The demo page calls it when it opens (its store
 * starts without any runs); the pagination's and the refresher's reactions
 * call it through the `runs/load-page` action.
 */
import { z } from "zod";
import type { ActionDefinition, Store } from "@wirework/schema";
import type { RunsServer } from "../api/runs-server";

/** Rows per page until the user picks another size. */
export const RUNS_PAGE_SIZE = 5;

export type RunsLoader = (store: Store) => Promise<void>;

const pageNumber = z.number().int().min(1);

export function createRunsLoader(server: RunsServer): RunsLoader {
  // Only the newest request of a STORE may write: clicking page 2 then 3
  // must never end on page 2 because its response arrived last. Per store,
  // because every page visit has its own.
  const latest = new WeakMap<Store, number>();

  return async (store) => {
    const request = (latest.get(store) ?? 0) + 1;
    latest.set(store, request);
    // Live store values are not validated; the inspector may hold anything.
    const query = {
      page: store.getAs("runs.page", pageNumber) ?? 1,
      pageSize: store.getAs("runs.pageSize", pageNumber) ?? RUNS_PAGE_SIZE,
    };
    store.set("runs.loading", true);
    try {
      const answer = await server.fetchPage(query);
      if (request !== latest.get(store)) return;
      store.set("runs.data", answer.data);
      store.set("runs.total", answer.total);
      store.set("runs.page", answer.page);
      store.set("runs.pageSize", answer.pageSize);
    } finally {
      if (request === latest.get(store)) store.set("runs.loading", false);
    }
  };
}

export function createRunsActions(loadPage: RunsLoader): ActionDefinition[] {
  return [
    {
      name: "runs/load-page",
      description: "Request the page at runs.page (runs.pageSize rows) from the server into runs.data",
      handler: ({ store }) => loadPage(store),
    },
  ];
}
