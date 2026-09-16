/**
 * Runs actions — business logic packaged as a factory over a host service
 * (doc/actions-design.md, "Registration"). The demo pagination's reactions
 * store the page the user asked for, then call `runs/load-page`; this
 * action REQUESTS that page and writes the answer back, so the table bound
 * to runs.data shows it.
 *
 * Results travel through the store: runs.loading while the request is in
 * flight, then runs.data, runs.total and the page actually served.
 */
import { z } from "zod";
import type { ActionDefinition } from "@wirework/schema";
import type { RunsServer } from "../api/runs-server";

/** Rows per page until the user picks another size. */
export const RUNS_PAGE_SIZE = 5;

const pageNumber = z.number().int().min(1);

export function createRunsActions(server: RunsServer): ActionDefinition[] {
  // Only the newest request may write: clicking page 2 then 3 must never
  // end on page 2 because its response arrived last.
  let latest = 0;

  return [
    {
      name: "runs/load-page",
      description: "Request the page at runs.page (runs.pageSize rows) from the server into runs.data",
      handler: async ({ store }) => {
        const request = ++latest;
        // Live store values are not validated; the inspector may hold anything.
        const query = {
          page: store.getAs("runs.page", pageNumber) ?? 1,
          pageSize: store.getAs("runs.pageSize", pageNumber) ?? RUNS_PAGE_SIZE,
        };
        store.set("runs.loading", true);
        try {
          const answer = await server.fetchPage(query);
          if (request !== latest) return;
          store.set("runs.data", answer.data);
          store.set("runs.total", answer.total);
          store.set("runs.page", answer.page);
        } finally {
          if (request === latest) store.set("runs.loading", false);
        }
      },
    },
  ];
}
