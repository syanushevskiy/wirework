/**
 * One-time boot of the playground HOST: the registries every extension
 * point lives in (sealed once the application has registered into them),
 * and the page-visit machinery — a store and a bus per visit, the
 * application's long-lived state layered under a demo page's own. Plain
 * code, no React and no router: the router calls `openDemoPage` /
 * `openBuilder` from its loaders and hands the actions a Navigator.
 *
 * What the application REGISTERS (contracts, widgets, engines, actions),
 * its fake servers and its pages are the demo's (demo/install.ts,
 * demo/pages.ts): a real host keeps this file and replaces those.
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
  type ActionRegistry,
  type ContractRegistry,
  type LayoutEngineRegistry,
  type WidgetRegistry,
} from "@wirework/engine";
import { createEventBus } from "@wirework/events";
import type { EventBus, Store } from "@wirework/schema";
import { layerStores } from "@wirework/store";
import type { DemoPage } from "@wirework/view-data-models-examples";
import type { Navigator } from "./actions/nav-actions";
import { installDemo } from "./demo/install";
import { createPlaygroundStore } from "./devtools";

/** The roots of the demo application's store that outlive a page visit. */
export const APP_ROOTS = ["app", "viewModels", "userViewModels"] as const;

/** The four extension points an application registers into. */
export interface Registries {
  contracts: ContractRegistry;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  actions: ActionRegistry;
}

/** What the router matched: put at `route` in a demo page's store, so widgets can bind to it. */
export interface RouteInfo {
  path: string;
  params: Record<string, string>;
}

export interface PlaygroundPage {
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
  // Contracts first: given them, a widget claiming a kind must really implement it.
  const contracts = createContracts();
  const registries: Registries = {
    contracts,
    registry: createRegistry({ contracts }),
    layoutEngines: createLayoutEngines(),
    actions: createActions(),
  };
  const demo = installDemo(registries, navigator);
  // Boot is over: the registries are what the pages render against, and a
  // registration after this point would be invisible to them — so it fails.
  for (const extensionPoint of Object.values(registries)) extensionPoint.seal();

  let demoSession: AppSession | undefined;
  const openDemoSession = (): AppSession => {
    const shared = createPlaygroundStore("app", demo.sessionState);
    let started = false;
    return {
      shared,
      start: () => {
        if (started) return;
        started = true;
        demo.startSession(shared);
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
    const page = demo.pages[name];
    const store = layerStores({
      page: createPlaygroundStore(name, page.initialState(route)),
      shared: session.shared,
      sharedRoots: APP_ROOTS,
    });
    return visitOf(name, page, store, session);
  };

  /** A visit of the builder. Leaving the demo application ends its session: it starts over next time. */
  const openBuilder = (route: RouteInfo): PageVisit => {
    demoSession = undefined;
    const page = demo.builderPage;
    return visitOf("builder", page, createPlaygroundStore("builder", page.initialState(route)));
  };

  return { ...registries, rejections: demo.rejections, openDemoPage, openBuilder };
}
