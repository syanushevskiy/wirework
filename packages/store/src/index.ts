/**
 * @wirework/store — default implementation of the Store contract, on Zustand.
 *
 * Zustand's vanilla store (no React) holds the state tree and the listener
 * set. This file adds what Wirework's configuration model needs on top:
 *  - PATH addressing: `get` / `set` take the dot paths the view models name.
 *    `set` replaces containers only along the written path; the path rules
 *    (own properties, canonical array indices, which container a missing
 *    step becomes, what throws) are @wirework/schema's `setPath`, shared
 *    with the engine so the two can never disagree,
 *  - PATH subscriptions: a subscriber is called when the value AT ITS PATH
 *    changed identity. Because updates are immutable along the written
 *    path, that is a write to the path itself, to a descendant, or to an
 *    ancestor that changes what the path holds — and nothing else. It is
 *    the contract React's `useSyncExternalStore` expects,
 *  - the configuration guard: `set` writes DATA; the configuration trees
 *    (`viewModels`, `userViewModels`) are writable only through `setConfig`,
 *    so a reaction can never rewrite the page that declares it.
 *
 * Notifications are derived from the STATE, never from which method wrote
 * it — so a state that changes underneath (devtools time travel, `persist`
 * rehydration) reaches the same subscribers. `fromZustand` is that seam: a
 * host builds the Zustand store with the middleware it wants and wraps it.
 * Every write names itself for Zustand's `devtools` middleware ("set
 * runs.page", "replace"), so a host that opts in sees WHICH path changed
 * in the Redux DevTools action list, not a row of "anonymous".
 *
 * NOTE: values returned by `get` are live references by convention — callers
 * must treat them as immutable. In-place mutation bypasses change detection.
 */
import { createStore as createZustandStore, type StoreApi } from "zustand/vanilla";
import type { Store, Unsubscribe, Validator } from "@wirework/schema";
import { checkedSegments, getPath, isConfigPath, setPath } from "@wirework/schema";

type StateObject = Record<string, unknown>;

/**
 * A Zustand store holding the state tree — plain, or wrapped in middleware.
 * `setState` may take the action's NAME as a third argument (the `devtools`
 * middleware shows it); a plain store ignores it.
 */
export type StateApi = Pick<StoreApi<StateObject>, "getState" | "subscribe"> & {
  setState: (state: StateObject, replace: true, action?: string) => void;
};

/** Store paths are dot strings with no empty or prototype segment. */
function splitPath(path: string): string[] {
  if (!path) {
    throw new Error("Store path must be a non-empty dot-separated string");
  }
  return checkedSegments(path);
}

/** The Store contract over a Zustand store the caller created. */
export function fromZustand(api: StateApi): Store {
  const write = (path: string, value: unknown): void => {
    const segments = splitPath(path);
    const state = api.getState();
    if (Object.is(getPath(state, segments), value)) return;
    api.setState(setPath(state, segments, value), true, `set ${path}`);
  };

  return {
    get<T>(path: string): T | undefined {
      return getPath(api.getState(), splitPath(path)) as T | undefined;
    },

    getAs<T>(path: string, validator: Validator<T>): T | undefined {
      const value = getPath(api.getState(), splitPath(path));
      if (value === undefined) return undefined;
      try {
        return validator.parse(value);
      } catch {
        return undefined;
      }
    },

    set(path: string, value: unknown): void {
      if (isConfigPath(path)) {
        throw new Error(
          `Refusing to write configuration path "${path}" with set() — use setConfig() (editors only)`,
        );
      }
      write(path, value);
    },

    setConfig(path: string, value: unknown): void {
      write(path, value);
    },

    subscribe(path: string, listener: () => void): Unsubscribe {
      // "" subscribes to the root; any other path must be valid.
      const segments = path === "" ? [] : splitPath(path);
      // Read the CURRENT state, not the one Zustand hands the listener: a
      // listener that writes re-enters the notification, and the outer round
      // must not announce the same change a second time.
      const read = (): unknown => getPath(api.getState(), segments);
      let seen = read();
      return api.subscribe(() => {
        const next = read();
        if (Object.is(next, seen)) return;
        seen = next;
        // Zustand stops at the first throwing listener; one must not starve the rest.
        try {
          listener();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Store listener for "${path}" threw:`, error);
        }
      });
    },

    snapshot(): Record<string, unknown> {
      return api.getState();
    },

    replace(next: Record<string, unknown>): void {
      api.setState({ ...next }, true, "replace");
    },
  };
}

export function createStore(initial: StateObject = {}): Store {
  return fromZustand(createZustandStore<StateObject>()(() => ({ ...initial })));
}

export { layerStores, type StoreLayers } from "./layers";
