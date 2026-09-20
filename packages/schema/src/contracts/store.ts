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

import type { Validator } from "./widget";

export type Unsubscribe = () => void;

/** What a WIDGET receives: read and observe, never write. */
export interface ReadableStore {
  /**
   * Read the value at a dot-separated path. Undefined if the path is absent.
   * The type parameter is an UNCHECKED assertion about live data — use
   * `getAs` when the shape matters.
   */
  get<T = unknown>(path: string): T | undefined;

  /** Read and VALIDATE: undefined when the path is absent or the value fails. */
  getAs<T>(path: string, validator: Validator<T>): T | undefined;

  /**
   * Listen for changes of the value at `path` — caused by a write to the
   * path itself, to a descendant, or to an ancestor. The empty path ""
   * subscribes to the ROOT — every change. A store must never miss a
   * change; it MAY call the listener when the value turned out the same
   * (the default store does not). The listener signature is compatible
   * with React's `useSyncExternalStore` subscribe contract.
   */
  subscribe(path: string, listener: () => void): Unsubscribe;

  /**
   * The current state root, for tooling (path enumeration, inspectors).
   * READ-ONLY — mutating it bypasses change detection.
   */
  snapshot(): Readonly<Record<string, unknown>>;
}

/** The full store: hosts, the engine's reaction interpreter, tooling. */
export interface Store extends ReadableStore {
  /**
   * Replace the value at a DATA path (immutable update along the path).
   * Subscribers whose value it changes are notified (see `subscribe`).
   * Refuses configuration paths (`viewModels`, `userViewModels`): a page
   * must not be able to rewrite its own description through a reaction.
   */
  set(path: string, value: unknown): void;

  /**
   * Write a CONFIGURATION path — what `set` refuses. For editors, builders
   * and state inspectors, which change the page on purpose.
   */
  setConfig(path: string, value: unknown): void;

  /**
   * Replace the ENTIRE state tree (state inspectors / imports). Subscribers
   * whose value changed are notified, as for any other write.
   */
  replace(next: Record<string, unknown>): void;
}
