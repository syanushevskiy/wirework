/**
 * Store contract.
 *
 * The store is the ONLY way widgets touch data. Widgets get the READ side
 * (`ReadableStore`); writes reach the store through events + reactions
 * (doc/widget-events-design.md), never from widget code. The engine and
 * hosts use the full `Store`; `@wirework/store` provides the default
 * implementation and host applications may substitute their own (e.g. an
 * instrumented store in e2e, or one backed by a real fetching layer).
 *
 * Paths are dot-separated ("runs.data.current"), matching the string-path
 * binding convention of the view models.
 */

export type Unsubscribe = () => void;

/** What a WIDGET receives: read and observe, never write. */
export interface ReadableStore {
  /** Read the value at a dot-separated path. Undefined if the path is absent. */
  get<T = unknown>(path: string): T | undefined;

  /**
   * Listen for changes affecting `path` (the path itself, an ancestor, or a
   * descendant). The empty path "" subscribes to the ROOT — every change.
   * The listener signature is compatible with React's `useSyncExternalStore`
   * subscribe contract.
   */
  subscribe(path: string, listener: () => void): Unsubscribe;

  /**
   * The current state root, for tooling (path enumeration, inspectors).
   * READ-ONLY by convention — mutating it bypasses change detection.
   */
  snapshot(): Record<string, unknown>;
}

/** The full store: hosts, the engine's reaction interpreter, tooling. */
export interface Store extends ReadableStore {
  /**
   * Replace the value at a path (immutable update along the path).
   * Subscribers of the path, its ancestors and its descendants are notified.
   */
  set(path: string, value: unknown): void;

  /**
   * Replace the ENTIRE state tree (state inspectors / imports). Notifies
   * every subscriber.
   */
  replace(next: Record<string, unknown>): void;
}
