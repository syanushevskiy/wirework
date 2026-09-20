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
import { KEBAB_NAME, type AnyWidgetDefinition } from "@wirework/schema";
import { declarationInvariants, type ContractRegistry } from "./contracts";
import { createNamedRegistry, type NamedRegistry } from "./named-registry";

export type WidgetRegistry = NamedRegistry<AnyWidgetDefinition>;

export interface WidgetRegistryOptions {
  /** When given, a widget's `kind` is checked against the registered contracts. */
  contracts?: ContractRegistry;
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
    return `claims kind "${definition.kind}", which is not a registered contract (registered: ${contracts.keys().join(", ") || "none"})`;
  }
  if (!sameKeys(definition.io.inputs, contract.io.inputs) || !sameKeys(definition.events, contract.events)) {
    return `claims kind "${definition.kind}" but its input ports or events differ from the contract's`;
  }
  return undefined;
}

export function createRegistry({ contracts }: WidgetRegistryOptions = {}): WidgetRegistry {
  return createNamedRegistry<AnyWidgetDefinition>({
    label: "Widget",
    keyOf: (definition) => definition.type,
    pattern: KEBAB_NAME,
    invariants: [
      // The component is framework-specific and opaque to the engine — only
      // its presence is checked; the rendering adapter owns its shape.
      (definition) => (definition.component === undefined || definition.component === null ? "has no component" : undefined),
      ...declarationInvariants,
      (definition) => contractProblem(definition, contracts),
    ],
  });
}
