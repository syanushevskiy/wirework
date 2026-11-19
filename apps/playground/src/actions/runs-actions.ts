/**
 * Runs — business logic packaged as factories over host services
 * (doc/ADR/0005-actions.md, "Registration").
 *
 * The runs LIST needs no code here any more: it is a table the server
 * describes, loaded by `table-view/load` (@wirework/table-view) from the
 * URL the table declares. What is left is what only this application knows:
 *  - `run/load` (`createRunLoader`): ONE run — the id comes from the router,
 *    which the host put at route.params.runId — with its PIPELINE position
 *    at run.pipeline, derived here for the steps widget (widgets and
 *    reactions never compute; actions do).
 *  - `runs/open-selected`: open the page of the run the user selected.
 *  - `runs/retry`: run the page's run again on the server, with the reason
 *    typed at run.retry.reason, then load it again.
 * The loader is what the run page's own `load` reaction calls
 * (`viewModels.on.run.load`) — nothing in the host starts it.
 * Results travel through the store, one visible step at a time:
 * `<root>.loading` while the request is in flight, then the answer.
 */
import { z } from "zod";
import type { ActionDefinition, Store } from "@wirework/schema";
import { errorText } from "@wirework/engine";
import type { Run } from "@wirework/view-data-models-examples";
import type { RunsServer } from "../api/runs-server";
import type { Navigator } from "./nav-actions";

export type Loader = (store: Store) => Promise<void>;

const runId = z.string().min(1);

/** Where a run stands in its pipeline — the steps widget's `current` key and `failed` flag, from the run's state. */
export function pipelineOf(run: Run): { step: "queued" | "running" | "finished"; failed: boolean } {
  const { state } = run.status;
  return {
    step: state === "Queued" ? "queued" : state === "Running" ? "running" : "finished",
    failed: state === "Failed",
  };
}

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
      if (run === undefined) {
        store.set("run.error", `There is no run ${id}`);
      } else {
        store.set("run.data", run);
        store.set("run.pipeline", pipelineOf(run));
      }
    } catch (error) {
      // A failed request is an answer too: the page says so instead of loading forever.
      if (isLatest()) store.set("run.error", errorText(error));
    } finally {
      if (isLatest()) store.set("run.loading", false);
    }
  };
}

export function createRunsActions(services: {
  loadRun: Loader;
  /** Run a run again on the server, with the reason the user gave. */
  retryRun: (id: string, reason: string) => Promise<void>;
  navigator: Navigator;
}): ActionDefinition[] {
  const { loadRun, retryRun, navigator } = services;
  return [
    {
      name: "runs/retry",
      description:
        "Run the page's run (route.params.runId) again on the server with the reason at run.retry.reason, then load it again",
      handler: async ({ store }) => {
        const id = store.getAs("route.params.runId", runId);
        if (id === undefined) return;
        await retryRun(id, store.getAs("run.retry.reason", z.string()) ?? "");
        await loadRun(store);
      },
    },
    {
      name: "run/load",
      description:
        "Request the run named by the address (route.params.runId) into run.data — for the page's load reaction",
      handler: ({ store }) => loadRun(store),
    },
    {
      name: "runs/open-selected",
      description: "Open the page of the run at pagination.selected (nothing happens while none is selected)",
      handler: ({ store }) => {
        const id = store.getAs("pagination.selected", runId);
        if (id !== undefined) navigator.go(`/demo/runs/${encodeURIComponent(id)}`);
      },
    },
  ];
}
