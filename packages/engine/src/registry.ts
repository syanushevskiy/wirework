/**
 * Widget registry — the engine's first extension point.
 *
 * Registration is strict and loud (team-tiger requirement): a definition
 * that registers successfully is guaranteed to have a unique, well-formed
 * type, a component, a view-model validator, input ports that each carry a
 * value validator (and a default that passes it), and a well-formed events
 * declaration. Given the contract registry, a widget claiming a `kind` must
 * implement a REGISTERED contract with that contract's ports and events —
 * otherwise "implements button" is only a label (team-tiger review,
 * Alexei). The registry mechanics are shared (named-registry.ts); only the
 * invariants below are the widget's own.
 */
import {
  KEBAB_NAME,
  type AnyWidgetDefinition,
  type EventDefinition,
  type PortDefinition,
} from "@wirework/schema";
import type { ContractRegistry } from "./contracts";
import { errorText } from "./messages";
import { createNamedRegistry, isRecord, RegistrationError } from "./named-registry";

export interface WidgetRegistry {
  register(definition: AnyWidgetDefinition): void;
  get(type: string): AnyWidgetDefinition | undefined;
  types(): readonly string[];
  list(): readonly AnyWidgetDefinition[];
}

export interface WidgetRegistryOptions {
  /** When given, a widget's `kind` is checked against the registered contracts. */
  contracts?: ContractRegistry;
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

function portsProblem(inputs: Record<string, unknown>): string | undefined {
  for (const [name, raw] of Object.entries(inputs)) {
    const port = raw as Partial<PortDefinition> | null;
    if (typeof port?.value?.parse !== "function") return `input port "${name}" has no value validator`;
    if (port.default === undefined) continue;
    try {
      port.value.parse(port.default);
    } catch (error) {
      return `input port "${name}" has a default its own validator rejects: ${errorText(error)}`;
    }
  }
  return undefined;
}

const sameKeys = (a: object, b: object): boolean => {
  const left = Object.keys(a).sort();
  const right = Object.keys(b).sort();
  return left.length === right.length && left.every((key, index) => key === right[index]);
};

function contractProblem(definition: AnyWidgetDefinition, contracts: ContractRegistry | undefined): string | undefined {
  if (definition.kind === undefined || contracts === undefined) return undefined;
  const contract = contracts.get(definition.kind);
  if (!contract) {
    return `claims kind "${definition.kind}", which is not a registered contract (registered: ${contracts.kinds().join(", ") || "none"})`;
  }
  if (!sameKeys(definition.io.inputs, contract.io.inputs) || !sameKeys(definition.events, contract.events)) {
    return `claims kind "${definition.kind}" but its input ports or events differ from the contract's`;
  }
  return undefined;
}

export function createRegistry({ contracts }: WidgetRegistryOptions = {}): WidgetRegistry {
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
      (definition) => portsProblem(definition.io.inputs),
      (definition) => eventsProblem(definition.events),
      (definition) => contractProblem(definition, contracts),
    ],
  });

  return {
    register: (definition) => registry.register(definition),
    get: (type) => registry.get(type),
    types: () => registry.keys(),
    list: () => registry.list(),
  };
}
