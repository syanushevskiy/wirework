/**
 * @wirework/store — default implementation of the Store contract.
 *
 * A path-addressed state tree with immutable updates and subscription
 * semantics compatible with React's `useSyncExternalStore`:
 *  - `get` returns referentially stable values while a subtree is unchanged,
 *  - `set` replaces containers only along the written path; the path rules
 *    (own properties, canonical array indices, which container a missing
 *    step becomes, what throws) are @wirework/schema's `setPath`, shared
 *    with the engine so the two can never disagree,
 *  - subscribers are notified when the written path is the subscribed path,
 *    one of its ancestors, or one of its descendants.
 *
 * `set` writes DATA; the configuration trees (`viewModels`,
 * `userViewModels`) are writable only through `setConfig`, so a reaction
 * can never rewrite the page that declares it (team-tiger blocker).
 *
 * NOTE: values returned by `get` are live references by convention — callers
 * must treat them as immutable. In-place mutation bypasses change detection.
 */
import type { Store, Unsubscribe, Validator } from "@wirework/schema";
import { checkedSegments, getPath, isConfigPath, setPath } from "@wirework/schema";

type StateObject = Record<string, unknown>;

interface Subscription {
  path: string;
  listener: () => void;
}

/** Store paths are dot strings with no empty or prototype segment. */
function splitPath(path: string): string[] {
  if (!path) {
    throw new Error("Store path must be a non-empty dot-separated string");
  }
  return checkedSegments(path);
}

/** True when `a` equals `b`, or one is a dot-path prefix of the other.
 *  The empty subscribed path is the root — affected by every change. */
function pathsAffect(changed: string, subscribed: string): boolean {
  if (subscribed === "" || changed === subscribed) return true;
  return (
    changed.startsWith(subscribed + ".") || subscribed.startsWith(changed + ".")
  );
}

export function createStore(initial: StateObject = {}): Store {
  let state: StateObject = { ...initial };
  const subscriptions = new Set<Subscription>();

  const notify = (changed: string): void => {
    // Snapshot the set: a listener may unsubscribe/subscribe during notify;
    // one throwing listener must not starve the rest.
    for (const sub of [...subscriptions]) {
      if (!pathsAffect(changed, sub.path)) continue;
      try {
        sub.listener();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Store listener for "${sub.path}" threw:`, error);
      }
    }
  };

  const write = (path: string, value: unknown): void => {
    const segments = splitPath(path);
    if (Object.is(getPath(state, segments), value)) return;
    state = setPath(state, segments, value);
    notify(path);
  };

  return {
    get<T>(path: string): T | undefined {
      return getPath(state, splitPath(path)) as T | undefined;
    },

    getAs<T>(path: string, validator: Validator<T>): T | undefined {
      const value = getPath(state, splitPath(path));
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
      if (path !== "") splitPath(path);
      const sub: Subscription = { path, listener };
      subscriptions.add(sub);
      return () => subscriptions.delete(sub);
    },

    snapshot(): Record<string, unknown> {
      return state;
    },

    replace(next: Record<string, unknown>): void {
      state = { ...next };
      for (const sub of [...subscriptions]) {
        try {
          sub.listener();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Store listener for "${sub.path}" threw:`, error);
        }
      }
    },
  };
}
