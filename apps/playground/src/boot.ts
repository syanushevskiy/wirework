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
 *  - The demo APPLICATION's state outlives its pages: the user's own views
 *    (`userViewModels`) and the GLOBAL data at `app` — who the user is, what
 *    they may do, their settings, lists every page needs. It lives in one
 *    store for as long as the user stays in the application, and starts
 *    over when they come back from the builder (or reload). The PAGE's view
 *    models (`viewModels`) live there too, but hold ONE page at a time: when
 *    a page opens, the store gets that page's — from its folder
 *    (src/pages/<page>/), or as this session last saw them after an edit or
 *    a save, which the session remembers per page as a server would —
 *    and nothing of another page's.
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
  createAppearances,
  createContracts,
  createLayoutEngines,
  createMigrations,
  createPredicates,
  createRegistry,
  upgradeTrees,
  type ActionRegistry,
  type AppearanceRegistry,
  type ContractRegistry,
  type LayoutEngineRegistry,
  type Migrations,
  type PredicateRegistry,
  type Upgraded,
  type WidgetRegistry,
} from "@wirework/engine";
import { createEventBus } from "@wirework/events";
import type { EventBus, Store, UserViewModels } from "@wirework/schema";
import { layerStores } from "@wirework/store";
import type { DemoPage, DemoRole } from "@wirework/view-data-models-examples";
import type { Navigator } from "./actions/nav-actions";
import { installDemo } from "./demo/install";
import { createPlaygroundStore } from "./devtools";

/** The roots of the demo application's store that outlive a page visit. */
export const APP_ROOTS = ["app", "viewModels", "userViewModels"] as const;

/** The five extension points an application registers into. */
export interface Registries {
  contracts: ContractRegistry;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  actions: ActionRegistry;
  /** The checks a widget's `when` may name: the standard ones, plus this application's (doc/ADR/0008-conditions.md). */
  predicates: PredicateRegistry;
  /** The animations a conditional widget may appear and disappear with: the standard ones, plus this application's. */
  appearances: AppearanceRegistry;
  /** The steps that bring a stored document of an older data format to today's (doc/ADR/0017-versioning-and-upgrades.md). */
  migrations: Migrations;
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
  /** A page opens: the store's view models become that page's — remembered from an earlier visit, or its folder's. */
  enter(page: DemoPage): void;
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
    predicates: createPredicates(),
    appearances: createAppearances(),
    migrations: createMigrations(),
  };
  const demo = installDemo(registries, navigator);
  // Boot is over: the registries are what the pages render against, and a
  // registration after this point would be invisible to them — so it fails.
  for (const extensionPoint of Object.values(registries)) extensionPoint.seal();

  /**
   * THE DOOR (doc/ADR/0017-versioning-and-upgrades.md): whatever this host
   * loads — a page's folder, the user's saved views — goes through
   * `upgradeTrees` before it reaches a store, so everything after it reads
   * today's data format. What the door could not read comes back as it was
   * and is shown as a problem on the page; a step that failed is said here.
   */
  const { registry, migrations } = registries;
  const told = (what: string, { problems, unread }: Upgraded): void => {
    for (const problem of [...problems, ...Object.values(unread)]) console.warn(`[wirework] ${what}: ${problem}`);
  };

  let demoSession: AppSession | undefined;
  const openDemoSession = (): AppSession => {
    // The user's own views are read WITH every page of the application: the widgets their settings belong to live there.
    const loaded = upgradeTrees(
      { viewModels: demo.allViewModels(), userViewModels: demo.sessionState["userViewModels"] as UserViewModels },
      { registry, migrations },
    );
    const unreadViews = loaded.unread.userViewModels;
    told("the user's saved views", {
      ...loaded,
      unread: unreadViews === undefined ? {} : { userViewModels: unreadViews },
    });
    const shared = createPlaygroundStore("app", { ...demo.sessionState, userViewModels: loaded.userViewModels });
    let started = false;
    // The pages' view models as this session last saw them — an inspector edit, a saved page — this demo's
    // stand-in for the server a host would ask. The page shown is the only one in the store.
    const remembered = new Map<DemoPage, unknown>();
    let current: DemoPage | undefined;
    return {
      shared,
      start: () => {
        if (started) return;
        started = true;
        demo.startSession(shared);
      },
      enter: (page) => {
        if (current !== undefined) remembered.set(current, shared.get("viewModels"));
        const opened = upgradeTrees({ viewModels: demo.pageViewModels(page) }, { registry, migrations });
        told(`the page "${page}"`, opened);
        shared.setConfig("viewModels", remembered.get(page) ?? opened.viewModels);
        current = page;
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

  /** A visit of a demo page: its own store under the application's long-lived one, which now holds this page's view models. */
  const openDemoPage = (name: DemoPage, route: RouteInfo): PageVisit => {
    const session = (demoSession ??= openDemoSession());
    session.enter(name);
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

  /**
   * "Sign in as" another person (doc/ADR/0012-roles.md): the session request
   * goes out again and rewrites the application's global state — the user
   * with their roles, the permissions, the lists — and once it has answered
   * the page at `path` is opened AGAIN, a fresh visit: its data starts over
   * and it loads by the new roles, as any page does on opening.
   */
  const signIn = async (person: DemoRole, path: string): Promise<void> => {
    if (demoSession === undefined) return;
    await demo.signIn(demoSession.shared, person);
    navigator.go(path);
  };

  return { ...registries, rejections: demo.rejections, openDemoPage, openBuilder, signIn };
}
