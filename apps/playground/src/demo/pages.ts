/**
 * The DEMO application's pages and the state its session starts from —
 * fixtures of this demo, not of the host (boot.ts). Each page says what a
 * visit's own store starts with and what only this application knows
 * about its opening; the session state is the user's own views plus their
 * settings, the rest arrives with the session request. A page's VIEW
 * MODELS are not here: they are its folder's (src/pages), and the store
 * gets them when the page opens.
 */
import { z } from "zod";
import type { Store } from "@wirework/schema";
import {
  builderViewModels,
  demoAppState,
  demoPageData,
  demoUserViewModels,
  type DemoPage,
} from "@wirework/view-data-models-examples";
import type { RunsServer } from "../api/runs-server";
import type { PlaygroundPage } from "../boot";

declare global {
  interface Window {
    /** A test's stand-in for what the server has stored as the user's views: any document, of any data format. */
    wireworkSavedViews?: unknown;
  }
}

/** The user's page-size setting is a select's value: text. */
const pageSizeSetting = z.coerce.number().int().min(1);

/** The application's long-lived state: the user's own views and their settings; the user, the permissions and the lists arrive with the session request. */
export const demoSessionState = (): Record<string, unknown> => ({
  // What a server would hand back as the user's saved views. A test puts a document of its own there before the
  // application starts (`window.wireworkSavedViews`) — one saved long ago, or by a newer version
  // (doc/ADR/0017-versioning-and-upgrades.md).
  userViewModels: window.wireworkSavedViews ?? demoUserViewModels,
  ...demoAppState,
});

/** A page of the demo application: its own data plus what the router matched. */
const demoPage = (name: DemoPage, onOpen?: (store: Store) => void): PlaygroundPage => ({
  initialState: (route) => ({ ...demoPageData[name], route }),
  // The demo is a finished application seen by its user: personal view applied.
  userOverlayOnOpen: true,
  ...(onOpen ? { onOpen } : {}),
});

export function demoPages(runsServer: RunsServer, archiveServer: RunsServer): Record<DemoPage, PlaygroundPage> {
  return {
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
    // The same list as an INFINITE one (widgets.history.table): loaded by the
    // table's `load`, grown by its `more`. The server starts over with every
    // visit here too, so the rows scrolled into view are always the same.
    history: demoPage("history", () => runsServer.reset()),
    // Two thousand runs as a WINDOWED list (widgets.archive.table): the store holds a slice of two hundred, the
    // DOM two dozen, and the list-position widget under it says where the list stands and jumps along it.
    archive: demoPage("archive", () => archiveServer.reset()),
    // The run is loaded by the PAGE's `load` reaction (viewModels.on.run);
    // which run: the router's parameter, at route.params.runId.
    run: demoPage("run"),
    settings: demoPage("settings"),
    // Two cards as FlexLayout tabsets, a layout engine of its own inside each: a grid, flex rows (doc/ADR/0010-flex-rows.md).
    cards: demoPage("cards"),
    // One card showing how roles work: an input for everyone, a button and its echo for the admin by a condition (doc/ADR/0012-roles.md).
    roles: demoPage("roles"),
    // The one page with the LAZY widget (doc/ADR/0018-lazy-widgets.md): the code editor's code is asked for here only.
    editor: demoPage("editor"),
  };
}

/** The roles the builder page grants from the start (doc/ADR/0012-roles.md): a builder adds more in the toolbar. */
export const BUILDER_ROLES = ["app-user", "admin"] as const;

/**
 * The builder: configuration of an empty page and NO data — the store fills
 * up only with what the added widgets write — plus the roles the
 * application grants (`app.lists.roles`), configuration too, so the
 * toolbar offers them from the start. Building is work on the SHARED page,
 * so the overlay starts off; the visitor turns it on to personalise.
 */
export const builderPage: PlaygroundPage = {
  initialState: () => ({
    viewModels: builderViewModels,
    userViewModels: {},
    app: { lists: { roles: [...BUILDER_ROLES] } },
  }),
  userOverlayOnOpen: false,
};
