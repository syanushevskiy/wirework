/**
 * Announces that the page has OPENED — the page's own `load` event
 * (doc/widget-events-design.md, "Page events"), which runs what the page
 * declares at `viewModels.on.<page>.load`: typically the action that fetches
 * what the page shows.
 *
 * Once per opening: a page, a visit of it (another bus or store) — or the
 * host saying "load it again" by changing `reloadKey` (an editor after it
 * changed the page: what the page loads may be different now). It is
 * DEFERRED to a task of its own, because
 *  - effects of one commit run children first, and the reactions are bound
 *    in an effect (`useReactions`): an emit from this effect's body could
 *    find nothing subscribed,
 *  - StrictMode mounts, unmounts and mounts again in one go: the first
 *    timer is cleared by the unmount, so the event fires ONCE, for the
 *    binding that stays.
 */
import { useEffect } from "react";
import type { EventBus, Store } from "@wirework/schema";
import { emitPageLoad } from "@wirework/engine";

export function usePageLoad(bus: EventBus, store: Store, page: string, reloadKey?: string | number): void {
  useEffect(() => {
    const timer = setTimeout(() => emitPageLoad(bus, page), 0);
    return () => clearTimeout(timer);
    // `store` on purpose: a new store under the same bus is a new visit of the
    // page; `reloadKey`: the host asked for the page to load again.
  }, [bus, store, page, reloadKey]);
}
