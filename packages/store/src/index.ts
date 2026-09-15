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
 * NOTE: values returned by `get` are live references by convention — callers
 * must treat them as immutable. In-place mutation bypasses change detection.
 */
import type { Store, Unsubscribe } from "@wirework/schema";

type StateObject = Record<string, unknown>;

interface Subscription {
  path: string;
  listener: () => void;
}

/** Segments that would touch the prototype chain instead of own data. */
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

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

/** Immutable update: clones containers along the path only. */
function setAtPath(container: unknown, segments: string[], value: unknown): unknown {
  const [head, ...rest] = segments;
  if (head === undefined) return container;

  if (Array.isArray(container)) {
    if (!/^\d+$/.test(head)) {
      throw new Error(
        `Cannot write segment "${head}" through an array — use a numeric index`,
      );
    }
    const next = [...container];
    const index = Number(head);
    next[index] =
      rest.length === 0 ? value : setAtPath(childContainer(next[index], rest), rest, value);
    return next;
  }

  const base: StateObject =
    container !== null && typeof container === "object"
      ? { ...(container as StateObject) }
      : {};
  base[head] =
    rest.length === 0 ? value : setAtPath(childContainer(base[head], rest), rest, value);
  return base;
}

/** Existing child if it is a container, else a fresh object. */
function childContainer(child: unknown, _rest: string[]): unknown {
  if (child !== null && typeof child === "object") return child;
  return {};
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

  return {
    get<T>(path: string): T | undefined {
      return getAtPath(state, splitPath(path)) as T | undefined;
    },

    set(path: string, value: unknown): void {
      const segments = splitPath(path);
      if (Object.is(getAtPath(state, segments), value)) return;
      state = setAtPath(state, segments, value) as StateObject;
      // Snapshot the set: a listener may unsubscribe/subscribe during notify;
      // one throwing listener must not starve the rest.
      for (const sub of [...subscriptions]) {
        if (!pathsAffect(path, sub.path)) continue;
        try {
          sub.listener();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Store listener for "${sub.path}" threw:`, error);
        }
      }
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
