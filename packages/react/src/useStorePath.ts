/**
 * Store binding hook for React widget authors — the canonical way to read a
 * store path reactively. Built on React's `useSyncExternalStore` against the
 * Store contract only; widgets receive the Store via props.
 *
 * An UNDEFINED path (an optional input port left unbound) subscribes to
 * nothing and reads `undefined`, so widgets can call the hook
 * unconditionally.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { ReadableStore } from "@wirework/schema";

const NOOP_UNSUBSCRIBE = () => {};

export function useStorePath<T = unknown>(
  store: ReadableStore,
  path: string | undefined,
): T | undefined {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      path === undefined ? NOOP_UNSUBSCRIBE : store.subscribe(path, onStoreChange),
    [store, path],
  );
  const getSnapshot = useCallback(
    () => (path === undefined ? undefined : store.get<T>(path)),
    [store, path],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
