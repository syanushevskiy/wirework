/**
 * Keeps the plan's declared reactions (`on` sections) subscribed on the bus
 * while the page is mounted; re-binds when the plan changes.
 */
import { useEffect } from "react";
import type { EventBus, Store } from "@wirework/schema";
import { bindReactions, type ActionRegistry, type ResolvedPage } from "@wirework/engine";

export function useReactions(
  bus: EventBus,
  store: Store,
  plan: ResolvedPage,
  actions?: ActionRegistry,
): void {
  useEffect(() => bindReactions(bus, store, plan, actions), [bus, store, plan, actions]);
}
