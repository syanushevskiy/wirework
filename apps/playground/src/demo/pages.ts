/**
 * The DEMO application's pages and the state its session starts from —
 * fixtures of this demo, not of the host (boot.ts). Each page says what a
 * visit's own store starts with and what only this application knows
 * about its opening; the session state is the configuration plus the
 * user's settings, the rest arrives with the session request.
 */
import { z } from "zod";
import type { Store } from "@wirework/schema";
import {
  builderViewModels,
  demoAppState,
  demoPageData,
  demoUserViewModels,
  demoViewModels,
  type DemoPage,
} from "@wirework/view-data-models-examples";
import type { RunsServer } from "../api/runs-server";
import type { PlaygroundPage } from "../boot";

/** The user's page-size setting is a select's value: text. */
const pageSizeSetting = z.coerce.number().int().min(1);

/** The application's long-lived state: the configuration and the settings; the user, the permissions and the lists arrive with the session request. */
export const demoSessionState = (): Record<string, unknown> => ({
  viewModels: demoViewModels,
  userViewModels: demoUserViewModels,
  ...demoAppState,
});

/** A page of the demo application: its own data plus what the router matched. */
const demoPage = (name: DemoPage, onOpen?: (store: Store) => void): PlaygroundPage => ({
  initialState: (route) => ({ ...demoPageData[name], route }),
  // The demo is a finished application seen by its user: personal view applied.
  userOverlayOnOpen: true,
  ...(onOpen ? { onOpen } : {}),
});

export function demoPages(runsServer: RunsServer): Record<DemoPage, PlaygroundPage> {
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
    // The run is loaded by the PAGE's `load` reaction (viewModels.on.run);
    // which run: the router's parameter, at route.params.runId.
    run: demoPage("run"),
    settings: demoPage("settings"),
  };
}

/**
 * The builder: configuration of an empty page and NO data — the store fills
 * up only with what the added widgets write. Building is work on the SHARED
 * page, so the overlay starts off; the visitor turns it on to personalise.
 */
export const builderPage: PlaygroundPage = {
  initialState: () => ({ viewModels: builderViewModels, userViewModels: {} }),
  userOverlayOnOpen: false,
};
