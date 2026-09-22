/**
 * Redux DevTools for the playground's stores, OFF unless asked for from the
 * browser console:
 *
 *   wirework.devtools(true)    turn on and reload — every store then connects
 *   wirework.devtools(false)   turn off and reload
 *   wirework.devtools()        "on" or "off"
 *
 * The choice lives in localStorage, so it survives reloads and applies to
 * every store the playground creates afterwards (boot.ts): the application's
 * long-lived one ("wirework/app") and one per page visit ("wirework/runs",
 * "wirework/builder", …). Zustand's `devtools` middleware wraps the store
 * BEFORE `fromZustand` sees it — the Store contract's notifications derive
 * from the state, so the extension's time travel reaches widgets like any
 * other change. Each write names itself after its path ("set runs.page").
 * While off, the middleware is a pass-through with no extension involved.
 */
import { createStore as createZustandStore } from "zustand/vanilla";
import { devtools } from "zustand/middleware";
import type { Store } from "@wirework/schema";
import { fromZustand } from "@wirework/store";

const KEY = "wirework.devtools";

declare global {
  interface Window {
    wirework?: { devtools: (on?: boolean) => "on" | "off" };
  }
}

/** Whether the console command turned DevTools on (a private window or blocked storage reads as off). */
export function devtoolsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/** A store of the playground, connected to Redux DevTools under `name` when they are on. */
export function createPlaygroundStore(name: string, initial: Record<string, unknown>): Store {
  return fromZustand(
    createZustandStore<Record<string, unknown>>()(
      devtools(() => ({ ...initial }), { name: `wirework/${name}`, enabled: devtoolsEnabled() }),
    ),
  );
}

/** `wirework.devtools(...)` in the console. Turning it on or off reloads, so every store starts over connected (or not). */
export function installDevtoolsCommand(): void {
  window.wirework = {
    devtools: (on?: boolean) => {
      if (on !== undefined) {
        localStorage.setItem(KEY, on ? "on" : "off");
        console.info(`Wirework DevTools ${on ? "on" : "off"} — reloading; every store ${on ? "connects" : "disconnects"}`);
        setTimeout(() => location.reload(), 0);
      }
      return devtoolsEnabled() ? "on" : "off";
    },
  };
}
