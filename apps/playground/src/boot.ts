/**
 * One-time boot of the playground host: every registry (contracts, widgets,
 * layout engines, actions), the store seeded with both view-model trees and
 * the data models, the event bus, and the negative proof that broken widget
 * definitions are rejected. Plain code, no React: `usePlayground` calls it
 * exactly once.
 */
import {
  createActions,
  createContracts,
  createLayoutEngines,
  createRegistry,
  errorText,
} from "@wirework/engine";
import { flexRowsEngine } from "@wirework/engine-flex-rows";
import { flexLayoutEngine } from "@wirework/engine-flexlayout";
import { gridstackEngine } from "@wirework/engine-gridstack";
import { reactGridLayoutEngine } from "@wirework/engine-react-grid-layout";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";
import {
  seedData,
  userViewModels as fixtureUserViewModels,
  viewModels as fixtureViewModels,
} from "@wirework/view-data-models-examples";
import { standardContracts } from "@wirework/widget-contracts";
import { antdTestWidgets, antdWidgets, brokenWidgets } from "@wirework/antd-widgets";
import { createRunsActions, RUNS_PAGE_SIZE } from "./actions/runs-actions";
import { createRunsServer } from "./api/runs-server";
import { statusBadgeContract } from "./contracts/status-badge";
import { statusBadge } from "./widgets/status-badge";

export function boot() {
  // Contracts: the standard kinds plus this app's own; widgets implement them.
  const contracts = createContracts();
  for (const contract of standardContracts) contracts.register(contract);
  contracts.register(statusBadgeContract);

  // Given the contracts, a widget claiming a kind must really implement it.
  const registry = createRegistry({ contracts });
  for (const widget of antdWidgets) registry.register(widget);
  registry.register(statusBadge);
  // A playground is a test bench: the always-crashing widget proves isolation.
  for (const widget of antdTestWidgets) registry.register(widget);

  // Layout engines are plugins too: a page template names one.
  const layoutEngines = createLayoutEngines();
  layoutEngines.register(reactGridLayoutEngine);
  layoutEngines.register(flexRowsEngine);
  layoutEngines.register(gridstackEngine);
  layoutEngines.register(flexLayoutEngine);

  // Host ACTIONS: what a user may attach to an event beyond a store write
  // (doc/widget-events-design.md, "Listening"). Business code lives here,
  // named and described; the builder lists them.
  const actions = createActions();
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
    // eslint-disable-next-line no-console
    handler: ({ event, args }) => console.log("[action log-event]", event, args),
  });
  // Server-side paging for the demo table: a fake server with real latency.
  const runsServer = createRunsServer({ seed: seedData.runs.data, total: 23, latencyMs: 600 });
  for (const action of createRunsActions(runsServer)) actions.register(action);

  // Negative proof: every broken definition must be rejected loudly.
  const rejections = Object.entries(brokenWidgets).map(([name, definition]) => {
    try {
      registry.register(definition);
      return `${name}: was ACCEPTED — registry guard is broken!`;
    } catch (error) {
      return `${name}: rejected (${errorText(error)})`;
    }
  });

  // One state tree: both view-model trees live next to the data models. The
  // runs start as the first page the server rendered; paging requests more.
  const store = createStore({
    viewModels: fixtureViewModels,
    userViewModels: fixtureUserViewModels,
    ...seedData,
    runs: { ...runsServer.pageOf({ page: 1, pageSize: RUNS_PAGE_SIZE }), loading: false },
  });
  const bus = createEventBus();
  return { registry, contracts, layoutEngines, actions, store, bus, rejections };
}
