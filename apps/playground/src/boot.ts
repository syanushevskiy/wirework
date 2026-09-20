/**
 * One-time boot of the playground host: every registry (contracts, widgets,
 * layout engines, actions), the negative proof that broken widget
 * definitions are rejected, and the PAGES — each with the state a visit
 * starts from. Plain code, no React: `usePlayground` calls it exactly once.
 *
 * A page VISIT gets its own store and event bus (`openPage`), created from
 * the page's initial state: that page's configuration and the little data
 * it starts with — nothing of any other page, and no server data. Whatever
 * else appears in the store got there through a visible step: a widget's
 * reaction, a host action, a server answer. A request still in flight when
 * the user leaves resolves into the visit's own store, which nobody shows
 * any more.
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
import type { EventBus, Store } from "@wirework/schema";
import { createStore } from "@wirework/store";
import {
  builderViewModels,
  demoData,
  demoUserViewModels,
  demoViewModels,
  sampleRuns,
} from "@wirework/view-data-models-examples";
import { standardContracts } from "@wirework/widget-contracts";
import { antdTestWidgets, antdWidgets, brokenWidgets } from "@wirework/antd-widgets";
import { createFilterActions } from "./actions/filter-actions";
import { createRunsActions, createRunsLoader } from "./actions/runs-actions";
import { createRunsServer } from "./api/runs-server";
import { applicationOptions, suiteOptionsFor } from "./api/suites-catalog";
import { statusBadgeContract } from "./contracts/status-badge";
import { statusBadge } from "./widgets/status-badge";

interface PlaygroundPage {
  /** The state tree a visit starts from: this page's configuration and initial data. */
  initialState(): Record<string, unknown>;
  /** Host code of the page's opening, run once per visit (e.g. the first server request). */
  onOpen?(store: Store): void;
}

/** One visit of a page: its own store and bus, from the page's initial state. */
export interface PageVisit {
  /** Unique per visit — a React key for whatever must start over with it. */
  id: number;
  page: string;
  store: Store;
  bus: EventBus;
  /** Runs the page's `onOpen` — once, however often it is called (StrictMode mounts twice). */
  start(): void;
}

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
  // Server-side data for the demo table: a fake server with real latency.
  const runsServer = createRunsServer({ seed: sampleRuns, total: 23, latencyMs: 600 });
  const loadRunsPage = createRunsLoader(runsServer);
  for (const action of createRunsActions(loadRunsPage)) actions.register(action);
  // Dependent filters: the suites on offer follow the applications chosen.
  for (const action of createFilterActions(suiteOptionsFor)) actions.register(action);

  // Negative proof: every broken definition must be rejected loudly.
  const rejections = Object.entries(brokenWidgets).map(([name, definition]) => {
    try {
      registry.register(definition);
      return `${name}: was ACCEPTED — registry guard is broken!`;
    } catch (error) {
      return `${name}: rejected (${errorText(error)})`;
    }
  });

  // One state tree per page: both view-model trees live next to the data.
  const pages: Record<string, PlaygroundPage> = {
    demo: {
      initialState: () => ({
        viewModels: demoViewModels,
        userViewModels: demoUserViewModels,
        ...demoData,
        // Nothing chosen yet, so no suites on offer.
        filters: { applicationOptions: applicationOptions(), applications: [], suiteOptions: [], suites: [] },
        // No `runs`: the table is empty until the server answers.
      }),
      // The first request, exactly the one the pagination and the refresher
      // make later — against a server that starts over with every visit.
      onOpen: (store) => {
        runsServer.reset();
        void loadRunsPage(store);
      },
    },
    // Configuration of an empty page and NO data: the store fills up only
    // with what the added widgets write.
    builder: {
      initialState: () => ({ viewModels: builderViewModels, userViewModels: {} }),
    },
  };

  let visits = 0;
  const openPage = (name: string): PageVisit => {
    const page = pages[name];
    if (!page) throw new Error(`Unknown playground page "${name}" (pages: ${Object.keys(pages).join(", ")})`);
    const store = createStore(page.initialState());
    let started = false;
    return {
      id: (visits += 1),
      page: name,
      store,
      bus: createEventBus(),
      start: () => {
        if (started) return;
        started = true;
        page.onOpen?.(store);
      },
    };
  };

  return { registry, contracts, layoutEngines, actions, rejections, pageNames: Object.keys(pages), openPage };
}
