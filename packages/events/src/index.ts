/** @wirework/events — default implementation of the EventBus contract (doc/widget-events-design.md). */
import type { EventBus, EventFilter, EventListener, Unsubscribe, WidgetEvent } from "@wirework/schema";

/** Nested-emit limit before the bus assumes a loop. */
const MAX_EMIT_DEPTH = 32;

export class EventLoopError extends Error {
  override readonly name = "EventLoopError";
}

/** True when every SET field of the filter matches the event. */
function matchesFilter(filter: EventFilter, event: WidgetEvent): boolean {
  return (
    (filter.widget === undefined || filter.widget === event.widget) &&
    (filter.name === undefined || filter.name === event.name) &&
    (filter.page === undefined || filter.page === event.source.page) &&
    (filter.cell === undefined || filter.cell === event.source.cell)
  );
}

export function createEventBus(): EventBus {
  const subscriptions = new Set<[EventFilter, EventListener]>();
  let seq = 0;
  let depth = 0;

  return {
    emit(envelope): void {
      if (depth >= MAX_EMIT_DEPTH) {
        throw new EventLoopError(
          `Event "${envelope.widget}/${envelope.name}" exceeded ${MAX_EMIT_DEPTH} nested emits — a listener is re-emitting in a loop`,
        );
      }
      const event: WidgetEvent = { ...envelope, seq: ++seq };
      depth += 1;
      try {
        // Snapshot: a listener may (un)subscribe during notification.
        for (const [filter, listener] of [...subscriptions]) {
          if (!matchesFilter(filter, event)) continue;
          try {
            listener(event);
          } catch (error) {
            // Isolation is for listener BUGS; a detected loop must reach the emitter.
            if (error instanceof EventLoopError) throw error;
            // eslint-disable-next-line no-console
            console.error(
              `Event listener for ${JSON.stringify(filter)} threw on "${event.widget}/${event.name}":`,
              error,
            );
          }
        }
      } finally {
        depth -= 1;
      }
    },

    subscribe<T>(filter: EventFilter<T>, listener: EventListener<T>): Unsubscribe {
      // The phantom payload type is erased here; validation happened at emit.
      const subscription: [EventFilter, EventListener] = [filter, listener as EventListener];
      subscriptions.add(subscription);
      return () => subscriptions.delete(subscription);
    },
  };
}
