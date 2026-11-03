/**
 * What the DEMO application puts into the host's registries, and the fake
 * servers it talks to: the standard contracts and the antd widgets plus this
 * app's own kind and cell renderers, the four layout engines, the host
 * actions its pages call — and the negative proof that broken widget
 * definitions are rejected. boot.ts is the host and keeps working without
 * this file; a real application replaces it with its own registrations.
 */
import { errorText } from "@wirework/engine";
import { flexRowsEngine } from "@wirework/engine-flex-rows";
import { flexLayoutEngine } from "@wirework/engine-flexlayout";
import { gridstackEngine } from "@wirework/engine-gridstack";
import { reactGridLayoutEngine } from "@wirework/engine-react-grid-layout";
import type { Store } from "@wirework/schema";
import { createTableViewActions } from "@wirework/table-view";
import { sampleRuns, type DemoPage, type Run } from "@wirework/view-data-models-examples";
import { standardContracts } from "@wirework/widget-contracts";
import { antdTestWidgets, brokenWidgets, createAntdWidgets } from "@wirework/antd-widgets";
import { createFilterActions } from "../actions/filter-actions";
import { createNavActions, type Navigator } from "../actions/nav-actions";
import { createOverviewLoader, createRunLoader, createRunsActions } from "../actions/runs-actions";
import { createSessionLoader } from "../actions/session-loader";
import { createRunsServer } from "../api/runs-server";
import { createSessionApi } from "../api/session-api";
import { suiteOptionsFor } from "../api/suites-catalog";
import { RUNS_VIEW_URL, createFakeTransport } from "../api/transport";
import type { PlaygroundPage, Registries } from "../boot";
import { statusBadgeContract } from "../contracts/status-badge";
import { CopyCell } from "../widgets/copy-cell";
import { RunStatusCell } from "../widgets/run-status-cell";
import { statusBadge } from "../widgets/status-badge";
import { builderPage, demoPages, demoSessionState } from "./pages";

/** A run record (whatever a page's `when` reads: live data) that failed and has an even id. */
function isRetryable(run: unknown): boolean {
  // The one cast: live data of any shape, every field read is checked before it is trusted.
  const record = run as Partial<Run> | null;
  return record?.status?.state === "Failed" && typeof record.id === "string" && Number(record.id) % 2 === 0;
}

/** What the host needs from the demo once everything is registered. */
export interface Demo {
  /** Every broken definition and how the registry answered — the proof the playground shows. */
  rejections: string[];
  /** The application's long-lived state a session starts from. */
  sessionState: Record<string, unknown>;
  /** A session starts: the fake servers start over and the session request goes out. */
  startSession(shared: Store): void;
  pages: Record<DemoPage, PlaygroundPage>;
  builderPage: PlaygroundPage;
}

export function installDemo(
  { contracts, registry, layoutEngines, actions, predicates, appearances }: Registries,
  navigator: Navigator,
): Demo {
  // Contracts: the standard kinds plus this app's own; widgets implement them.
  for (const contract of standardContracts) contracts.register(contract);
  contracts.register(statusBadgeContract);

  // The table offers this app's own cell renderers by name (`cell: { kind: "custom", name: "copy" }`).
  for (const widget of createAntdWidgets({ tableCells: { copy: CopyCell, "run-status": RunStatusCell } })) {
    registry.register(widget);
  }
  registry.register(statusBadge);
  // A playground is a test bench: the always-crashing widget proves isolation.
  for (const widget of antdTestWidgets) registry.register(widget);

  // Layout engines are plugins too: a page template names one.
  layoutEngines.register(reactGridLayoutEngine);
  layoutEngines.register(flexRowsEngine);
  layoutEngines.register(gridstackEngine);
  layoutEngines.register(flexLayoutEngine);

  // Host ACTIONS: what a user may attach to an event beyond a store write
  // (doc/widget-events-design.md, "Listening"). Business code lives here,
  // named and described; the builder lists them.
  actions.register({
    name: "reset-counter",
    description: "Set demo.counter back to 0",
    handler: ({ store }) => store.set("demo.counter", 0),
  });
  actions.register({
    name: "clear-selected-run",
    description: "Forget the selected run",
    handler: ({ store }) => store.set("runs.selected", undefined),
  });
  actions.register({
    name: "log-event",
    description: "console.log the event (debugging)",
    handler: ({ event, args }) => console.log("[action log-event]", event, args),
  });
  // Server-side data for the demo: a fake server with real latency.
  const runsServer = createRunsServer({ seed: sampleRuns, total: 23, latencyMs: 600 });
  const loadSession = createSessionLoader(createSessionApi({ latencyMs: 300 }));
  // What the pages' own `load` reactions call (viewModels.on.<page>): the
  // overview's numbers, one run — plus opening the selected run.
  for (const action of createRunsActions({
    loadRun: createRunLoader(runsServer),
    loadOverview: createOverviewLoader(runsServer),
    navigator,
  })) {
    actions.register(action);
  }
  // Tables the SERVER describes (@wirework/table-view): one generic
  // action, the URL comes from the page. The playground's "network" is the
  // fake server; a real host passes `fetchTransport` instead.
  const transport = createFakeTransport({ [RUNS_VIEW_URL]: (request) => runsServer.fetchView(request) });
  for (const action of createTableViewActions({ transport })) actions.register(action);
  // Dependent filters: the suites on offer follow the applications chosen.
  for (const action of createFilterActions(suiteOptionsFor)) actions.register(action);
  // Navigation: the host owns the router, pages only name where to go.
  for (const action of createNavActions(navigator)) actions.register(action);

  // A PREDICATE of this application's own (doc/conditions-design.md): what
  // no standard check can say — two properties and a rule — as code with a
  // name, which a page's `when` picks like a standard one. The rule is the
  // fake server's: a failed run with an even id would run again.
  predicates.register({
    name: "runs/retryable",
    description: "A failed run the server would accept again (its id is even)",
    phrase: "can be retried",
    test: (run) => isRetryable(run),
  });

  // An appearance of this application's own: the name here, the keyframes
  // `ww-drop` in index.css (doc/conditions-design.md, "Appearance").
  appearances.register({ name: "drop", description: "Drops in from above" });

  // Negative proof: every broken definition must be rejected loudly.
  const rejections = Object.entries(brokenWidgets).map(([name, definition]) => {
    try {
      registry.register(definition);
      return `${name}: was ACCEPTED — registry guard is broken!`;
    } catch (error) {
      return `${name}: rejected (${errorText(error)})`;
    }
  });

  return {
    rejections,
    sessionState: demoSessionState(),
    startSession: (shared) => {
      runsServer.reset();
      void loadSession(shared);
    },
    pages: demoPages(runsServer),
    builderPage,
  };
}
