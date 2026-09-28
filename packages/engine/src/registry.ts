/**
 * Widget registry — the engine's first extension point.
 *
 * Registration is strict and loud: a definition that registers successfully
 * has a unique, well-formed type, a component, and everything a declaration
 * must carry (`declarationInvariants`: view-model validator, validated input
 * ports, well-formed events). Given the contract registry, a widget claiming
 * a `kind` must implement a REGISTERED contract with that contract's ports
 * and events — otherwise "implements button" is only a label.
 */
import {
  KEBAB_NAME,
  validatorKeys,
  type AnyWidgetContract,
  type AnyWidgetDefinition,
  type EventDefinition,
  type PortDefinition,
} from "@wirework/schema";
import { declarationInvariants, type ContractRegistry } from "./contracts";
import { createNamedRegistry, type NamedRegistry } from "./named-registry";

export type WidgetRegistry = NamedRegistry<AnyWidgetDefinition>;

export interface WidgetRegistryOptions {
  /** When given, a widget's `kind` is checked against the registered contracts. */
  contracts?: ContractRegistry;
}

const sameList = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  a === undefined || b === undefined
    ? a === b
    : a.length === b.length && [...a].sort().every((item, index) => item === [...b].sort()[index]);

/** The names one side declares and the other does not, as a sentence — or undefined when they agree. */
function namesDifference(what: string, own: object, contract: object): string | undefined {
  const missing = Object.keys(contract).filter((name) => !Object.hasOwn(own, name));
  const extra = Object.keys(own).filter((name) => !Object.hasOwn(contract, name));
  if (missing.length > 0) return `is missing the ${what} ${missing.map((name) => `"${name}"`).join(", ")}`;
  if (extra.length > 0) return `declares ${what} the contract has not: ${extra.map((name) => `"${name}"`).join(", ")}`;
  return undefined;
}

/**
 * Where a definition departs from the contract it claims: a port or event
 * the contract has not (or one it lacks), a port that is required on one
 * side and optional on the other, an event whose `required`, `primary`
 * field or payload fields differ. Named, so the widget author sees WHAT to
 * fix — not only that something differs.
 */
function declarationDifference(definition: AnyWidgetDefinition, contract: AnyWidgetContract): string | undefined {
  const ownPorts = definition.io.inputs;
  const contractPorts = contract.io.inputs as Record<string, PortDefinition>;
  const ports = namesDifference("input ports", ownPorts, contractPorts);
  if (ports) return ports;
  for (const [name, port] of Object.entries(contractPorts)) {
    const own = ownPorts[name];
    if (own !== undefined && (own.required !== false) !== (port.required !== false)) {
      return `has the input port "${name}" ${own.required !== false ? "required" : "optional"}, the contract ${port.required !== false ? "required" : "optional"}`;
    }
  }
  const ownEvents = definition.events as Record<string, EventDefinition>;
  const contractEvents = contract.events as Record<string, EventDefinition>;
  const events = namesDifference("events", ownEvents, contractEvents);
  if (events) return events;
  for (const [name, event] of Object.entries(contractEvents)) {
    const own = ownEvents[name];
    if (own === undefined) continue;
    if ((own.required === true) !== (event.required === true)) {
      return `has the event "${name}" ${own.required === true ? "required" : "optional"}, the contract ${event.required === true ? "required" : "optional"}`;
    }
    if (own.primary !== event.primary) {
      return `has the event "${name}" with primary field ${JSON.stringify(own.primary)}, the contract ${JSON.stringify(event.primary)}`;
    }
    if (!sameList(validatorKeys(own.payload), validatorKeys(event.payload))) {
      return `has the event "${name}" carrying ${JSON.stringify(validatorKeys(own.payload) ?? "a non-object payload")}, the contract ${JSON.stringify(validatorKeys(event.payload) ?? "a non-object payload")}`;
    }
  }
  return undefined;
}

function contractProblem(definition: AnyWidgetDefinition, contracts: ContractRegistry | undefined): string | undefined {
  if (definition.kind === undefined || contracts === undefined) return undefined;
  const contract = contracts.get(definition.kind);
  if (!contract) {
    return `claims kind "${definition.kind}", which is not a registered contract (registered: ${contracts.keys().join(", ") || "none"})`;
  }
  const difference = declarationDifference(definition, contract);
  return difference === undefined ? undefined : `claims kind "${definition.kind}" but ${difference}`;
}

export function createRegistry({ contracts }: WidgetRegistryOptions = {}): WidgetRegistry {
  return createNamedRegistry<AnyWidgetDefinition>({
    label: "Widget",
    keyOf: (definition) => definition.type,
    pattern: KEBAB_NAME,
    invariants: [
      // The component is framework-specific and opaque to the engine — only
      // its presence is checked; the rendering adapter owns its shape.
      (definition) =>
        definition.component === undefined || definition.component === null ? "has no component" : undefined,
      ...declarationInvariants,
      (definition) => contractProblem(definition, contracts),
    ],
  });
}
