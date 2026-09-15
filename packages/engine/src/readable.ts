/**
 * The read-only view of a store handed to widgets. Not a type cast: the
 * `set` / `replace` methods simply do not exist on it, so a widget cannot
 * write even by accident (Alexei's enforcement, doc/widget-events-design.md).
 */
import type { ReadableStore, Store } from "@wirework/schema";

export function readableStore(store: Store): ReadableStore {
  return {
    get: (path) => store.get(path),
    subscribe: (path, listener) => store.subscribe(path, listener),
    snapshot: () => store.snapshot(),
  };
}
