/**
 * Widget registry — the engine's extension point.
 *
 * Registration is strict and loud (team-tiger requirement): a definition
 * that registers successfully is guaranteed to have a unique, well-formed
 * type, a component, a view-model validator, an input-port declaration and
 * a well-formed events declaration.
 */
import type { AnyWidgetDefinition, EventDefinition } from "@wirework/schema";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

/** Widget types AND event names share the kebab-case grammar. */
const KEBAB_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface WidgetRegistry {
  register(definition: AnyWidgetDefinition): void;
  get(type: string): AnyWidgetDefinition | undefined;
  types(): string[];
}

export class WidgetRegistrationError extends Error {
  constructor(
    message: string,
    readonly widgetType: string,
  ) {
    super(message);
    this.name = "WidgetRegistrationError";
  }
}

function assertEvents(type: string, events: unknown): void {
  if (events === null || typeof events !== "object") {
    throw new WidgetRegistrationError(
      `Widget "${type}" has no events declaration (use NO_EVENTS for none)`,
      type,
    );
  }
  for (const [name, event] of Object.entries(events as Record<string, unknown>)) {
    if (!KEBAB_PATTERN.test(name)) {
      throw new WidgetRegistrationError(
        `Widget "${type}" event ${JSON.stringify(name)} is not a valid kebab-case identifier`,
        type,
      );
    }
    if (typeof (event as Partial<EventDefinition> | null)?.payload?.parse !== "function") {
      throw new WidgetRegistrationError(
        `Widget "${type}" event "${name}" has no payload validator`,
        type,
      );
    }
  }
}

export function createRegistry(): WidgetRegistry {
  const definitions = new Map<string, AnyWidgetDefinition>();

  return {
    register(definition: AnyWidgetDefinition): void {
      const { type } = definition;
      if (!type || !KEBAB_PATTERN.test(type)) {
        throw new WidgetRegistrationError(
          `Widget type ${JSON.stringify(type)} is not a valid kebab-case identifier`,
          String(type),
        );
      }
      if (definitions.has(type)) {
        throw new WidgetRegistrationError(
          `Widget type "${type}" is already registered`,
          type,
        );
      }
      // The component is framework-specific and opaque to the engine — only
      // its presence is checked; the rendering adapter owns its shape.
      if (definition.component === undefined || definition.component === null) {
        throw new WidgetRegistrationError(
          `Widget "${type}" has no component`,
          type,
        );
      }
      if (typeof definition.viewModel?.parse !== "function") {
        throw new WidgetRegistrationError(
          `Widget "${type}" has no view-model validator`,
          type,
        );
      }
      const io = definition.io as { inputs?: unknown } | null | undefined;
      if (!isRecord(io) || !isRecord(io.inputs)) {
        throw new WidgetRegistrationError(
          `Widget "${type}" has no IO declaration ({ inputs })`,
          type,
        );
      }
      assertEvents(type, definition.events);
      definitions.set(type, definition);
    },

    get(type: string): AnyWidgetDefinition | undefined {
      return definitions.get(type);
    },

    types(): string[] {
      return [...definitions.keys()];
    },
  };
}
