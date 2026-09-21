/**
 * Runs — business logic packaged as factories over host services
 * (doc/actions-design.md, "Registration").
 *
 * The runs LIST needs no code here any more: it is a table the server
 * describes, loaded by `table-view/load` (@wirework/table-view) from the
 * URL the table declares. What is left is what only this application knows:
 *  - `run/load` (`createRunLoader`): ONE run — the id comes from the router,
 *    which the host put at route.params.runId.
 *  - `overview/load` (`createOverviewLoader`): the overview's numbers.
 *  - `runs/open-selected`: open the page of the run the user selected.
 * The two loaders are what those pages' own `load` reactions call
 * (`viewModels.on.<page>.load`) — nothing in the host starts them.
 * Results travel through the store, one visible step at a time:
 * `<root>.loading` while the request is in flight, then the answer.
 */
import { z } from "zod";
import type { ActionDefinition, Store } from "@wirework/schema";
import type { RunsServer } from "../api/runs-server";
import type { Navigator } from "./nav-actions";

export type Loader = (store: Store) => Promise<void>;

const runId = z.string().min(1);

/**
 * Only the newest request of a STORE may write: a slow answer must never
 * overwrite a newer one. Per store, because every page visit has its own.
 */
function latestWins(): (store: Store) => () => boolean {
  const latest = new WeakMap<Store, number>();
  return (store) => {
    const request = (latest.get(store) ?? 0) + 1;
    latest.set(store, request);
    return () => request === latest.get(store);
  };
}

export function createRunLoader(server: RunsServer): Loader {
  const begin = latestWins();

  return async (store) => {
    const isLatest = begin(store);
    const id = store.getAs("route.params.runId", runId);
    if (id === undefined) {
      store.set("run.error", "This page needs a run id in its address: /demo/runs/<id>");
      return;
    }
    store.set("run.loading", true);
    try {
      const run = await server.fetchRun(id);
      if (!isLatest()) return;
      if (run === undefined) store.set("run.error", `There is no run ${id}`);
      else store.set("run.data", run);
    } finally {
      if (isLatest()) store.set("run.loading", false);
    }
  };
}

export function createOverviewLoader(server: RunsServer): Loader {
  const begin = latestWins();

  return async (store) => {
    const isLatest = begin(store);
    store.set("overview.loading", true);
    try {
      const stats = await server.fetchStats();
      if (!isLatest()) return;
      store.set("overview.stats", {
        ...stats,
        // Text for a widget to show: widgets and reactions never compute.
        notice: `${stats.failed} of ${stats.total} runs failed, ${stats.running} still running`,
      });
    } finally {
      if (isLatest()) store.set("overview.loading", false);
    }
  };
}

export function createRunsActions(services: {
  loadRun: Loader;
  loadOverview: Loader;
  navigator: Navigator;
}): ActionDefinition[] {
  const { loadRun, loadOverview, navigator } = services;
  return [
    {
      name: "overview/load",
      description: "Request the overview's numbers into overview.stats — for the page's load reaction",
      handler: ({ store }) => loadOverview(store),
    },
    {
      name: "run/load",
      description: "Request the run named by the address (route.params.runId) into run.data — for the page's load reaction",
      handler: ({ store }) => loadRun(store),
    },
    {
      name: "runs/open-selected",
      description: "Open the page of the run at runs.selected (nothing happens while none is selected)",
      handler: ({ store }) => {
        const id = store.getAs("runs.selected", runId);
        if (id !== undefined) navigator.go(`/demo/runs/${encodeURIComponent(id)}`);
      },
    },
  ];
}
