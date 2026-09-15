/**
 * Reactive view of the ENTIRE store state — for state inspectors and
 * debugging tools. Subscribes to the root (""); the snapshot reference is
 * stable between changes, matching `useSyncExternalStore` requirements.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { ReadableStore } from "@wirework/schema";

export function useStoreSnapshot(store: ReadableStore): Record<string, unknown> {
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe("", onStoreChange),
    [store],
  );
  const getSnapshot = useCallback(() => store.snapshot(), [store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
