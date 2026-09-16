/**
 * @wirework/store — default implementation of the Store contract.
 *
 * A path-addressed state tree with immutable updates and subscription
 * semantics compatible with React's `useSyncExternalStore`:
 *  - `get` returns referentially stable values while a subtree is unchanged,
 *  - `set` replaces containers only along the written path (arrays are cloned
 *    positionally; writing a non-numeric segment through an array throws),
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
import { FORBIDDEN_SEGMENTS, isConfigPath } from "@wirework/schema";

type StateObject = Record<string, unknown>;

interface Subscription {
  path: string;
  listener: () => void;
}

function splitPath(path: string): string[] {
  if (!path) {
    throw new Error("Store path must be a non-empty dot-separated string");
  }
  const segments = path.split(".");
  for (const segment of segments) {
    if (segment === "" || FORBIDDEN_SEGMENTS.has(segment)) {
      throw new Error(`Store path "${path}" contains a forbidden segment "${segment}"`);
    }
  }
  return segments;
}

function getAtPath(root: unknown, segments: string[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return undefined;
    // Own properties only — never read through the prototype chain.
    if (!Object.hasOwn(current, segment)) return undefined;
    current = (current as StateObject)[segment];
  }
  return current;
}

const isIndex = (segment: string): boolean => /^\d+$/.test(segment);

/** Immutable update: clones containers along the path only. */
function setAtPath(path: string, container: unknown, segments: string[], value: unknown): unknown {
  const [head, ...rest] = segments;
  if (head === undefined) return container;

  if (Array.isArray(container)) {
    if (!isIndex(head)) {
      throw new Error(
        `Cannot write segment "${head}" through an array — use a numeric index`,
      );
    }
    const next = [...container];
    const index = Number(head);
    next[index] =
      rest.length === 0 ? value : setAtPath(path, childContainer(path, head, next[index], rest), rest, value);
    return next;
  }

  const base: StateObject = container === null || container === undefined ? {} : { ...(container as StateObject) };
  base[head] =
    rest.length === 0 ? value : setAtPath(path, childContainer(path, head, base[head], rest), rest, value);
  return base;
}

/**
 * The existing child if it is a container, else a fresh one SHAPED BY THE
 * NEXT SEGMENT: a numeric segment means an array, so `set("rows.0.name", x)`
 * on empty state builds `[{ name: x }]`, not `{ "0": { name: x } }`.
 *
 * A PRIMITIVE child is a mistake: writing through it would silently destroy
 * the value already there, so it throws — as the array branch above does
 * for its own version of the same error.
 */
function childContainer(path: string, key: string, child: unknown, rest: string[]): unknown {
  if (child !== null && typeof child === "object") return child;
  if (child !== undefined && child !== null) {
    throw new Error(
      `Cannot write "${path}": "${key}" holds a ${typeof child}, which writing through it would replace`,
    );
  }
  return isIndex(rest[0] ?? "") ? [] : {};
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
    if (Object.is(getAtPath(state, segments), value)) return;
    state = setAtPath(path, state, segments, value) as StateObject;
    notify(path);
  };

  return {
    get<T>(path: string): T | undefined {
      return getAtPath(state, splitPath(path)) as T | undefined;
    },

    getAs<T>(path: string, validator: Validator<T>): T | undefined {
      const value = getAtPath(state, splitPath(path));
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
