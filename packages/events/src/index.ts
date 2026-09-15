/**
 * @wirework/events — default implementation of the EventBus contract.
 *
 * A synchronous, fire-and-forget bus for widget events:
 *  - `emit` stamps a monotonic `seq` and notifies every matching subscriber
 *    in registration order,
 *  - one throwing listener never starves the rest (mirrors the store),
 *  - a listener may (un)subscribe during notification — the set is
 *    snapshotted per emit,
 *  - nested emits beyond MAX_DEPTH throw: a listener re-emitting in a loop
 *    is a bug, and it must fail loudly instead of hanging the page.
 */
import type {
  EventBus,
  EventFilter,
  EventListener,
  Unsubscribe,
  WidgetEvent,
} from "@wirework/schema";

interface Subscription {
  filter: EventFilter;
  listener: EventListener;
}

/** Nested-emit limit before the bus assumes a loop. */
export const MAX_EMIT_DEPTH = 32;

export class EventLoopError extends Error {
  constructor(
    message: string,
    readonly widgetType: string,
    readonly eventName: string,
  ) {
    super(message);
    this.name = "EventLoopError";
  }
}

/** True when every SET field of the filter matches the event. */
export function matchesFilter(filter: EventFilter, event: WidgetEvent): boolean {
  return (
    (filter.widget === undefined || filter.widget === event.widget) &&
    (filter.name === undefined || filter.name === event.name) &&
    (filter.page === undefined || filter.page === event.source.page) &&
    (filter.cell === undefined || filter.cell === event.source.cell)
  );
}

function notify({ filter, listener }: Subscription, event: WidgetEvent): void {
  try {
    listener(event);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Event listener for ${JSON.stringify(filter)} threw on "${event.widget}/${event.name}":`,
      error,
    );
  }
}

export function createEventBus(): EventBus {
  const subscriptions = new Set<Subscription>();
  let seq = 0;
  let depth = 0;

  return {
    emit(envelope): void {
      if (depth >= MAX_EMIT_DEPTH) {
        throw new EventLoopError(
          `Event "${envelope.widget}/${envelope.name}" exceeded ${MAX_EMIT_DEPTH} nested emits — a listener is re-emitting in a loop`,
          envelope.widget,
          envelope.name,
        );
      }
      const event: WidgetEvent = { ...envelope, seq: ++seq };
      depth += 1;
      try {
        [...subscriptions]
          .filter((subscription) => matchesFilter(subscription.filter, event))
          .forEach((subscription) => notify(subscription, event));
      } finally {
        depth -= 1;
      }
    },

    subscribe<T>(filter: EventFilter<T>, listener: EventListener<T>): Unsubscribe {
      // The phantom payload type is erased here; validation happened at emit.
      const subscription: Subscription = { filter, listener: listener as EventListener };
      subscriptions.add(subscription);
      return () => subscriptions.delete(subscription);
    },
  };
}
