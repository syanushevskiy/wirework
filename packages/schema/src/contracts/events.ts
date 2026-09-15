/**
 * Widget events contract — typed signals a widget EMITS
 * (see doc/widget-events-design.md).
 *
 * Store vs events: if another widget needs to DISPLAY it, it is state and
 * goes through the Store. If another party needs to REACT to it once, it is
 * an event. Events are fire-and-forget: no replay, no last-value semantics.
 *
 * A widget declares its events as named, typed payloads next to its input
 * ports. Widgets never write the store: a state change is an event the
 * widget emits and a REACTION in the view model writes the store. The
 * rendering adapter hands every cell an `emit` scoped to the declaration;
 * the host subscribes on an EventBus it injects.
 */
import type { Unsubscribe } from "./store";
import type { Validator, WidgetDefinition } from "./widget";

/** One declared event of a widget. */
export interface EventDefinition<T = unknown> {
  /** Human description, shown by builders/playgrounds. */
  description?: string;
  /** Validator for the payload (zod-compatible). Runs on every emit. */
  payload: Validator<T>;
  /**
   * The event carries STATE others depend on (what an output port used to
   * be): at least one reaction must be bound in the view model, or boot
   * validation and resolve report the cell. Default: false.
   */
  required?: boolean;
  /**
   * The payload field carrying the event's MAIN value ("value" for a
   * counter or an input). Builders default a `set` reaction's `from` to it.
   */
  primary?: string;
}

/** Event name -> definition. Names are kebab-case like widget types. */
export type WidgetEvents = Record<string, EventDefinition>;

/** Declaration for widgets that emit nothing — their `emit` cannot be called. */
export const NO_EVENTS = {} satisfies WidgetEvents;

/** Payload type of one declared event. */
export type EventPayload<E extends WidgetEvents, K extends keyof E> =
  E[K] extends EventDefinition<infer T> ? T : never;

/** The `emit` a widget receives: only DECLARED names, typed payloads. */
export type Emit<E extends WidgetEvents> = <K extends keyof E & string>(
  name: K,
  payload: EventPayload<E, K>,
) => void;

/** Where an event came from — cell identity, never widget type alone. */
export interface EventSource {
  page: string;
  cell: string;
}

/** An event as it travels on the bus. */
export interface WidgetEvent<T = unknown> {
  /** WidgetDefinition.type of the emitter. */
  widget: string;
  /** Declared event name. */
  name: string;
  /** Payload, already validated by the widget's declaration. */
  payload: T;
  source: EventSource;
  /** Monotonic per bus — ordering and de-duplication for tooling. */
  seq: number;
}

/**
 * Subscription filter: every set field must match; unset fields match all.
 * `T` is a phantom carried by `eventFilter()` so listeners see typed
 * payloads — it is never present at runtime.
 */
export interface EventFilter<T = unknown> {
  widget?: string;
  name?: string;
  /** Cell ids are unique per PAGE only — filter on both to pin one cell. */
  page?: string;
  cell?: string;
  readonly __payload?: T;
}

export type EventListener<T = unknown> = (event: WidgetEvent<T>) => void;

/**
 * The bus is the ONLY channel for widget events. `@wirework/events`
 * provides the default implementation; hosts may substitute their own
 * (e.g. a recording bus in e2e).
 */
export interface EventBus {
  /** Publish; the bus stamps `seq`. Synchronous, listener errors isolated. */
  emit(event: Omit<WidgetEvent, "seq">): void;
  subscribe<T = unknown>(filter: EventFilter<T>, listener: EventListener<T>): Unsubscribe;
}

/**
 * Typed filter for one declared event of a definition — the payload type
 * flows from the declaration to the listener without a cast.
 */
export function eventFilter<E extends WidgetEvents, K extends keyof E & string>(
  definition: WidgetDefinition<unknown, unknown, E>,
  name: K,
  source: Partial<EventSource> = {},
): EventFilter<EventPayload<E, K>> {
  return { widget: definition.type, name, ...source };
}
