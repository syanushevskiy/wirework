/**
 * Contract registry — the standard kinds plus the application's own.
 * Strict and loud like the others: a unique kebab-case kind plus the
 * DECLARATION invariants below, which a widget definition must satisfy too
 * (a widget is a declaration plus a component), so both registries share
 * them.
 */
import {
  isPlainObject,
  KEBAB_NAME,
  type AnyWidgetContract,
  type EventDefinition,
  type PortDefinition,
} from "@wirework/schema";
import { errorText } from "./messages";
import { createNamedRegistry, type Invariant, type NamedRegistry } from "./named-registry";

export type ContractRegistry = NamedRegistry<AnyWidgetContract>;

/** The parts of a declaration the invariants look at — unchecked, that is the point. */
interface Declaration {
  viewModel?: { parse?: unknown } | null;
  io?: { inputs?: unknown } | null;
  events?: unknown;
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

function eventsProblem(events: Record<string, unknown>): string | undefined {
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

/**
 * What every declaration must carry: a view-model validator, input ports
 * that each have a value validator (and a default that passes it), and
 * kebab-case events with payload validators.
 */
export const declarationInvariants: readonly Invariant<Declaration>[] = [
  ({ viewModel }) => (typeof viewModel?.parse !== "function" ? "has no view-model validator" : undefined),
  ({ io }) =>
    !isPlainObject(io) || !isPlainObject(io.inputs) ? "has no IO declaration ({ inputs })" : portsProblem(io.inputs),
  ({ events }) =>
    !isPlainObject(events) ? "has no events declaration (use NO_EVENTS for none)" : eventsProblem(events),
];

export function createContracts(): ContractRegistry {
  return createNamedRegistry<AnyWidgetContract>({
    label: "Contract",
    keyOf: (contract) => contract.kind,
    pattern: KEBAB_NAME,
    invariants: declarationInvariants,
  });
}
