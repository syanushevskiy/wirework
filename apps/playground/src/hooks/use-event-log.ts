/**
 * ALL event-log logic lives here (guidelines: render-only components).
 *
 * Subscribes to EVERYTHING on the bus (empty filter) and keeps the last
 * `limit` events, newest first. Events are otherwise invisible — this is
 * what makes them observable to people and addressable to e2e (QA ask).
 */
import { useCallback, useState } from "react";
import type { EventBus, WidgetEvent } from "@wirework/schema";
import { useWidgetEvent } from "@wirework/react";

export interface LoggedEvent {
  seq: number;
  widget: string;
  name: string;
  cell: string;
  page: string;
  payload: string;
}

const toLogged = (event: WidgetEvent): LoggedEvent => ({
  seq: event.seq,
  widget: event.widget,
  name: event.name,
  cell: event.source.cell,
  page: event.source.page,
  payload: JSON.stringify(event.payload),
});

export function useEventLog(bus: EventBus, limit = 50) {
  const [events, setEvents] = useState<LoggedEvent[]>([]);

  useWidgetEvent(bus, {}, (event) =>
    setEvents((prev) => [toLogged(event), ...prev].slice(0, limit)),
  );

  const clear = useCallback(() => setEvents([]), []);

  return { events, clear };
}
