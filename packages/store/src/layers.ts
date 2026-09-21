/**
 * Two stores behind ONE tree: an application's GLOBAL state outlives its
 * pages (who the user is, what they may do, their settings, lists every
 * page needs), while a page's own state starts over with every visit.
 *
 * `layerStores` routes by ROOT — the first segment of a path. The roots
 * named in `sharedRoots` live in `shared`; every other root lives in
 * `page`. Widgets, reactions and actions see a single store and never know
 * which layer a path belongs to: a view model binds "app.user.name" exactly
 * like "runs.data".
 *
 * Both layers are plain `Store`s (any implementation of the contract), so
 * the configuration guard, validation and notification rules are theirs. A
 * shared root that the page store happens to hold is SHADOWED: reads,
 * writes and the snapshot only ever see the shared one.
 */
import type { Store, Unsubscribe, Validator } from "@wirework/schema";

export interface StoreLayers {
  /** The page's own state: every root not named in `sharedRoots`. */
  page: Store;
  /** The state shared between pages. */
  shared: Store;
  /** The roots (first path segments) that live in `shared`. */
  sharedRoots: readonly string[];
}

type StateObject = Record<string, unknown>;

export function layerStores({ page, shared, sharedRoots }: StoreLayers): Store {
  const isShared = (root: string): boolean => sharedRoots.includes(root);
  /** A path may name a root with a dot-free first segment only — the same rule both layers apply. */
  const layerOf = (path: string): Store => (isShared(path.split(".")[0] ?? "") ? shared : page);

  const pick = (state: Readonly<StateObject>, keep: (root: string) => boolean): StateObject =>
    Object.fromEntries(Object.entries(state).filter(([root]) => keep(root)));

  // `useSyncExternalStore` needs the SAME snapshot while nothing changed.
  let merged: { page: unknown; shared: unknown; state: StateObject } | undefined;

  return {
    get<T>(path: string): T | undefined {
      return layerOf(path).get<T>(path);
    },

    getAs<T>(path: string, validator: Validator<T>): T | undefined {
      return layerOf(path).getAs(path, validator);
    },

    set(path: string, value: unknown): void {
      layerOf(path).set(path, value);
    },

    setConfig(path: string, value: unknown): void {
      layerOf(path).setConfig(path, value);
    },

    subscribe(path: string, listener: () => void): Unsubscribe {
      if (path !== "") return layerOf(path).subscribe(path, listener);
      // The root hears both layers.
      const stops = [page.subscribe("", listener), shared.subscribe("", listener)];
      return () => stops.forEach((stop) => stop());
    },

    snapshot(): Readonly<StateObject> {
      const pageState = page.snapshot();
      const sharedState = shared.snapshot();
      if (merged === undefined || merged.page !== pageState || merged.shared !== sharedState) {
        merged = {
          page: pageState,
          shared: sharedState,
          state: { ...pick(pageState, (root) => !isShared(root)), ...pick(sharedState, isShared) },
        };
      }
      return merged.state;
    },

    replace(next: StateObject): void {
      shared.replace(pick(next, isShared));
      page.replace(pick(next, (root) => !isShared(root)));
    },
  };
}
