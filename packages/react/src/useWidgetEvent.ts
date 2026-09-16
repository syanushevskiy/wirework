/**
 * Host-side subscription hook. The handler lives in a ref so a new closure
 * per render never re-subscribes (react-best-practices: event handlers in
 * refs); the subscription itself keys on the filter's primitive fields.
 *
 * Pair with `eventFilter(definition, name)` for a typed payload:
 *   useWidgetEvent(bus, eventFilter(antdRunsTable, "row-selected"),
 *                  (e) => store.set("runs.selected", e.payload.id));
 */
import { useEffect, useRef } from "react";
import type { EventBus, EventFilter, EventListener } from "@wirework/schema";

export function useWidgetEvent<T = unknown>(
  bus: EventBus,
  filter: EventFilter<T>,
  handler: EventListener<T>,
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const { widget, name, page, cell } = filter;
  useEffect(
    () =>
      bus.subscribe<T>({ widget, name, page, cell }, (event) => handlerRef.current(event)),
    [bus, widget, name, page, cell],
  );
}
