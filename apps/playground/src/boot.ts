/**
 * One-time boot of the playground host: every registry (contracts, widgets,
 * layout engines, actions), the negative proof that broken widget
 * definitions are rejected, and the PAGES — each with the state a visit
 * starts from. Plain code, no React and no router: the router calls
 * `openPage` from its loaders and hands the actions a Navigator.
 *
 * Two kinds of state:
 *  - The demo APPLICATION's state outlives its pages: the configuration
 *    (`viewModels`, `userViewModels`) and the GLOBAL data at `app` — who the
 *    user is, what they may do, their settings, lists every page needs. It
 *    lives in one store for as long as the user stays in the application,
 *    and starts over when they come back from the builder (or reload).
 *  - A page VISIT gets its own store and event bus, created from the page's
 *    initial state: the little data it starts with and the `route` the
 *    router matched — nothing of any other page, and no server data.
 *    Whatever else appears got there through a visible step: a widget's
 *    reaction, a host action, a server answer. A request still in flight
 *    when the user leaves resolves into the visit's own store, which nobody
 *    shows any more.
 * `layerStores` puts the two behind ONE tree, so a view model binds
 * "app.user.name" exactly like "runs.data". The builder is a single page
 * with a plain store of its own and no global state.
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
import { z } from "zod";
import { createEventBus } from "@wirework/events";
import type { EventBus, Store } from "@wirework/schema";
import { createStore, layerStores } from "@wirework/store";
import { createTableViewActions } from "@wirework/table-view";
import {
  builderViewModels,
  demoAppState,
  demoPageData,
  demoUserViewModels,
  demoViewModels,
  sampleRuns,
  type DemoPage,
} from "@wirework/view-data-models-examples";
import { standardContracts } from "@wirework/widget-contracts";
import { antdTestWidgets, brokenWidgets, createAntdWidgets } from "@wirework/antd-widgets";
import { createFilterActions } from "./actions/filter-actions";
import { createNavActions, type Navigator } from "./actions/nav-actions";
import { createOverviewLoader, createRunLoader, createRunsActions } from "./actions/runs-actions";
import { createSessionLoader } from "./actions/session-loader";
import { createRunsServer } from "./api/runs-server";
import { createSessionApi } from "./api/session-api";
import { suiteOptionsFor } from "./api/suites-catalog";
import { RUNS_VIEW_URL, createFakeTransport } from "./api/transport";
import { statusBadgeContract } from "./contracts/status-badge";
import { CopyCell } from "./widgets/copy-cell";
import { RunStatusCell } from "./widgets/run-status-cell";
import { statusBadge } from "./widgets/status-badge";

/** The user's page-size setting is a select's value: text. */
const pageSizeSetting = z.coerce.number().int().min(1);

/** The roots of the demo application's store that outlive a page visit. */
export const APP_ROOTS = ["app", "viewModels", "userViewModels"] as const;

/** What the router matched: put at `route` in a demo page's store, so widgets can bind to it. */
export interface RouteInfo {
  path: string;
  params: Record<string, string>;
}

interface PlaygroundPage {
  /** The state tree a visit's OWN store starts from. */
  initialState(route: RouteInfo): Record<string, unknown>;
  /** Whether a visit starts with the user overlay applied (the visitor can toggle it). */
  userOverlayOnOpen: boolean;
  /**
   * Host code of the page's opening, run once per visit — BEFORE the page's
   * `load` event and its widgets' (they fire in a later task): what only
   * this application knows, e.g. seeding the page from the user's settings.
   * What a page LOADS is configuration: `viewModels.on.<page>.load`, or a
   * table's own `load` reaction.
   */
  onOpen?(store: Store): void;
}

/** One visit of a page: its own store and bus, from the page's initial state. */
export interface PageVisit {
  /** Unique per visit — a React key for whatever must start over with it. */
  id: number;
  page: string;
  store: Store;
  bus: EventBus;
  /** The user overlay starts over with the visit too: on or off, as the page says. */
  userOverlayOnOpen: boolean;
  /** Runs the page's `onOpen` — once, however often it is called (StrictMode mounts twice). */
  start(): void;
}

/** The demo application while the user is in it: its long-lived store, loaded once. */
interface AppSession {
  shared: Store;
  start(): void;
}

export type Playground = ReturnType<typeof boot>;

export function boot({ navigator }: { navigator: Navigator }) {
  // Contracts: the standard kinds plus this app's own; widgets implement them.
  const contracts = createContracts();
  for (const contract of standardContracts) contracts.register(contract);
  contracts.register(statusBadgeContract);

  // Given the contracts, a widget claiming a kind must really implement it.
  // The table offers this app's own cell renderers by name (`cell: { kind: "custom", name: "copy" }`).
  const registry = createRegistry({ contracts });
  for (const widget of createAntdWidgets({ tableCells: { copy: CopyCell, "run-status": RunStatusCell } })) {
    registry.register(widget);
  }
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

  // Negative proof: every broken definition must be rejected loudly.
  const rejections = Object.entries(brokenWidgets).map(([name, definition]) => {
    try {
      registry.register(definition);
      return `${name}: was ACCEPTED — registry guard is broken!`;
    } catch (error) {
      return `${name}: rejected (${errorText(error)})`;
    }
  });

  /** A page of the demo application: its own data plus what the router matched. */
  const demoPage = (name: DemoPage, onOpen?: (store: Store) => void): PlaygroundPage => ({
    initialState: (route) => ({ ...demoPageData[name], route }),
    // The demo is a finished application seen by its user: personal view applied.
    userOverlayOnOpen: true,
    ...(onOpen ? { onOpen } : {}),
  });

  const demoPages: Record<DemoPage, PlaygroundPage> = {
    // Its numbers are loaded by the PAGE's `load` reaction (viewModels.on.overview).
    overview: demoPage("overview"),
    // The list is loaded by the TABLE's `load` reaction — the URL is
    // configuration, not code. Here is only what this application knows:
    // the server starts over with every visit of the list, so a visit
    // always replays the same sequence, and the user's SETTINGS (global
    // state) decide the page size and how the refresher starts.
    runs: demoPage("runs", (store) => {
      runsServer.reset();
      const pageSize = store.getAs("app.settings.pageSize", pageSizeSetting);
      if (pageSize !== undefined) store.set("runs.pageSize", pageSize);
      if (store.get("app.settings.autoRefresh") === true) {
        store.set("runs.autoRefresh", { enabled: true, interval: 5 });
      }
    }),
    // The run is loaded by the PAGE's `load` reaction (viewModels.on.run);
    // which run: the router's parameter, at route.params.runId.
    run: demoPage("run"),
    settings: demoPage("settings"),
  };

  // Configuration of an empty page and NO data: the store fills up only
  // with what the added widgets write. Building is work on the SHARED
  // page, so the overlay starts off; the visitor turns it on to personalise.
  const builderPage: PlaygroundPage = {
    initialState: () => ({ viewModels: builderViewModels, userViewModels: {} }),
    userOverlayOnOpen: false,
  };

  let demoSession: AppSession | undefined;
  const openDemoSession = (): AppSession => {
    // The configuration and the settings; the user, the permissions and the
    // lists arrive with the session request.
    const shared = createStore({
      viewModels: demoViewModels,
      userViewModels: demoUserViewModels,
      ...demoAppState,
    });
    let started = false;
    return {
      shared,
      start: () => {
        if (started) return;
        started = true;
        runsServer.reset();
        void loadSession(shared);
      },
    };
  };

  let visits = 0;
  const visitOf = (name: string, page: PlaygroundPage, store: Store, session?: AppSession): PageVisit => {
    let started = false;
    return {
      id: (visits += 1),
      page: name,
      store,
      bus: createEventBus(),
      userOverlayOnOpen: page.userOverlayOnOpen,
      start: () => {
        if (started) return;
        started = true;
        session?.start();
        page.onOpen?.(store);
      },
    };
  };

  /** A visit of a demo page: its own store under the application's long-lived one. */
  const openDemoPage = (name: DemoPage, route: RouteInfo): PageVisit => {
    const session = (demoSession ??= openDemoSession());
    const page = demoPages[name];
    const store = layerStores({
      page: createStore(page.initialState(route)),
      shared: session.shared,
      sharedRoots: APP_ROOTS,
    });
    return visitOf(name, page, store, session);
  };

  /** A visit of the builder. Leaving the demo application ends its session: it starts over next time. */
  const openBuilder = (route: RouteInfo): PageVisit => {
    demoSession = undefined;
    return visitOf("builder", builderPage, createStore(builderPage.initialState(route)));
  };

  return { registry, contracts, layoutEngines, actions, rejections, openDemoPage, openBuilder };
}
