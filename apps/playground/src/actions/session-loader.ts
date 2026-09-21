/**
 * Loads the demo application's GLOBAL state — once, when the application
 * starts. Like every loader it goes through the store one visible step at
 * a time: app.loading, then app.user, app.permissions and app.lists.
 */
import type { Store } from "@wirework/schema";
import type { SessionApi } from "../api/session-api";

export function createSessionLoader(api: SessionApi): (store: Store) => Promise<void> {
  return async (store) => {
    store.set("app.loading", true);
    try {
      const session = await api.fetchSession();
      store.set("app.user", session.user);
      store.set("app.permissions", session.permissions);
      store.set("app.lists", session.lists);
    } finally {
      store.set("app.loading", false);
    }
  };
}
