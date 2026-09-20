/**
 * ALL event-log logic lives here (guidelines: render-only components).
 *
 * Subscribes to EVERYTHING on the bus (empty filter) and keeps the last
 * `limit` events, newest first. Events are otherwise invisible — this is
 * what makes them observable to people and addressable to e2e (QA ask).
 * A new bus (a new page visit) starts an empty log; the panel itself stays
 * as the user left it.
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
  const [log, setLog] = useState<{ bus: EventBus; events: LoggedEvent[] }>({ bus, events: [] });
  // Another bus: its events are another story. (Resetting state during
  // render is React's way to follow a prop without an effect.)
  if (log.bus !== bus) setLog({ bus, events: [] });

  useWidgetEvent(bus, {}, (event) =>
    setLog((prev) => (prev.bus === bus ? { bus, events: [toLogged(event), ...prev.events].slice(0, limit) } : prev)),
  );

  const clear = useCallback(() => setLog((prev) => ({ ...prev, events: [] })), []);

  return { events: log.bus === bus ? log.events : [], clear };
}
