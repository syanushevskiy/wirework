/**
 * Widget registry — the engine's first extension point.
 *
 * Registration is strict and loud (team-tiger requirement): a definition
 * that registers successfully is guaranteed to have a unique, well-formed
 * type, a component, a view-model validator, an input-port declaration and
 * a well-formed events declaration. The registry mechanics are shared
 * (named-registry.ts); only the invariants below are the widget's own.
 */
import { KEBAB_NAME, type AnyWidgetDefinition, type EventDefinition } from "@wirework/schema";
import { createNamedRegistry, isRecord, RegistrationError } from "./named-registry";

export interface WidgetRegistry {
  register(definition: AnyWidgetDefinition): void;
  get(type: string): AnyWidgetDefinition | undefined;
  types(): readonly string[];
  list(): readonly AnyWidgetDefinition[];
}

/** Kept as a named type for hosts that catch registration failures. */
export { RegistrationError as WidgetRegistrationError };

function eventsProblem(events: unknown): string | undefined {
  if (!isRecord(events)) return "has no events declaration (use NO_EVENTS for none)";
  for (const [name, event] of Object.entries(events)) {
    if (!KEBAB_NAME.test(name)) {
      return `event ${JSON.stringify(name)} is not a valid kebab-case identifier`;
    }
    if (typeof (event as Partial<EventDefinition> | null)?.payload?.parse !== "function") {
      return `event "${name}" has no payload validator`;
    }
  }
  return undefined;
}

export function createRegistry(): WidgetRegistry {
  const registry = createNamedRegistry<AnyWidgetDefinition>({
    label: "Widget",
    keyOf: (definition) => definition.type,
    pattern: KEBAB_NAME,
    invariants: [
      // The component is framework-specific and opaque to the engine — only
      // its presence is checked; the rendering adapter owns its shape.
      (definition) => (definition.component === undefined || definition.component === null ? "has no component" : undefined),
      (definition) => (typeof definition.viewModel?.parse !== "function" ? "has no view-model validator" : undefined),
      (definition) => (!isRecord(definition.io) || !isRecord(definition.io.inputs) ? "has no IO declaration ({ inputs })" : undefined),
      (definition) => eventsProblem(definition.events),
    ],
  });

  return {
    register: (definition) => registry.register(definition),
    get: (type) => registry.get(type),
    types: () => registry.keys(),
    list: () => registry.list(),
  };
}
