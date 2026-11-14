/**
 * Loads the demo application's GLOBAL state — once, when the application
 * starts, and again when "Sign in as" picks another person. Like every
 * loader it goes through the store one visible step at a time: app.loading,
 * then app.user (with the roles the user holds, doc/ADR/0012-roles.md),
 * app.permissions and app.lists. A failed session leaves the permissions
 * UNSET — which forbids editing (the host fails closed, use-playground.ts)
 * — and says what failed at app.error.
 */
import type { Store } from "@wirework/schema";
import { errorText } from "@wirework/engine";
import type { DemoRole } from "@wirework/view-data-models-examples";
import type { SessionApi } from "../api/session-api";

export type SessionLoader = (store: Store, person?: DemoRole) => Promise<void>;

export function createSessionLoader(api: SessionApi): SessionLoader {
  return async (store, person) => {
    store.set("app.loading", true);
    try {
      const session = await api.fetchSession(person);
      store.set("app.user", session.user);
      store.set("app.permissions", session.permissions);
      store.set("app.lists", session.lists);
    } catch (error) {
      store.set("app.error", errorText(error));
    } finally {
      store.set("app.loading", false);
    }
  };
}
