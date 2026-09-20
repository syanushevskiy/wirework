/**
 * Per-cell emitter — the `emit` a widget instance receives. Framework-
 * agnostic so every adapter gives widgets the same guarantees:
 *  - only DECLARED event names can be emitted,
 *  - the payload is validated by the declaration on every emit,
 *  - the source cell is stamped by the engine, never by the widget.
 * Violations throw: they are widget bugs, not runtime conditions.
 */
import type {
  AnyWidgetDefinition,
  Emit,
  EventBus,
  EventSource,
  WidgetEvents,
} from "@wirework/schema";
import { errorText } from "./messages";

export class WidgetEventError extends Error {
  constructor(
    message: string,
    readonly widgetType: string,
    readonly eventName: string,
  ) {
    super(message);
    this.name = "WidgetEventError";
  }
}

export function createEmitter(
  bus: EventBus,
  definition: AnyWidgetDefinition,
  source: EventSource,
): Emit<WidgetEvents> {
  const events = definition.events as WidgetEvents;
  const { type: widget } = definition;

  return (name, payload) => {
    // Own properties only: "constructor" or "toString" would otherwise
    // "resolve" to an inherited function and fail with a confusing message.
    const declared = Object.hasOwn(events, name) ? events[name] : undefined;
    if (!declared) {
      throw new WidgetEventError(
        `Widget "${widget}" does not declare event "${name}" (declared: ${Object.keys(events).join(", ") || "none"})`,
        widget,
        name,
      );
    }
    let valid: unknown;
    try {
      valid = declared.payload.parse(payload);
    } catch (error) {
      throw new WidgetEventError(
        `Widget "${widget}" event "${name}" payload rejected: ${errorText(error)}`,
        widget,
        name,
      );
    }
    bus.emit({ widget, name, payload: valid, source });
  };
}
