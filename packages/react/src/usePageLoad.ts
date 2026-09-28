/**
 * Announces that the page has OPENED — the page's own `load` event
 * (doc/widget-events-design.md, "Page events"), which runs what the page
 * declares at `viewModels.on.<page>.load`: typically the action that fetches
 * what the page shows.
 *
 * Once per opening: a page, a visit of it (another bus or store) — or the
 * host saying "load it again" by changing `reloadKey` (an editor after it
 * changed the page: what the page loads may be different now). Deferred
 * like a widget's announcement (useAnnounce), and AFTER the widgets': their
 * effects run first, so their timers are earlier in the queue.
 */
import type { EventBus, Store } from "@wirework/schema";
import { emitPageLoad } from "@wirework/engine";
import { useAnnounce } from "./useAnnounce";

export function usePageLoad(bus: EventBus, store: Store, page: string, reloadKey?: string | number): void {
  // `store` on purpose: a new store under the same bus is a new visit of the page.
  useAnnounce(() => emitPageLoad(bus, page), [bus, store, page, reloadKey]);
}
