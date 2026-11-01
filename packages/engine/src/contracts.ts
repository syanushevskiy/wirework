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
  PATH_SEGMENT,
} from "@wirework/schema";
import { problemText } from "./messages";
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
    // It becomes the last segment of a generated path: a dot would nest it, a blank would end the path early.
    if (port.suggestedName !== undefined && !PATH_SEGMENT.test(String(port.suggestedName))) {
      return `input port "${name}" has a suggestedName that is not one path segment: ${JSON.stringify(port.suggestedName)}`;
    }
    if (port.default === undefined) continue;
    try {
      port.value.parse(port.default);
    } catch (error) {
      return `input port "${name}" has a default its own validator rejects: ${problemText(error)}`;
    }
  }
  return undefined;
}

function eventsProblem(events: Record<string, unknown>, inputs: Record<string, unknown>): string | undefined {
  for (const [name, raw] of Object.entries(events)) {
    if (!KEBAB_NAME.test(name)) {
      return `event ${JSON.stringify(name)} is not a valid kebab-case identifier`;
    }
    const event = raw as Partial<EventDefinition> | null;
    if (typeof event?.payload?.parse !== "function") {
      return `event "${name}" has no payload validator`;
    }
    // The default write-back goes to that port's path: a port nobody declared has none.
    if (event.writesBack !== undefined && !Object.hasOwn(inputs, event.writesBack)) {
      return `event "${name}" writes back to "${event.writesBack}", which is not one of its input ports`;
    }
  }
  return undefined;
}

/**
 * What every declaration must carry: a view-model validator, input ports
 * that each have a value validator (and a default that passes it), and
 * kebab-case events with payload validators that write back, if they do,
 * to a declared port. Checked in order, so the events may trust the ports.
 */
export const declarationInvariants: readonly Invariant<Declaration>[] = [
  ({ viewModel }) => (typeof viewModel?.parse !== "function" ? "has no view-model validator" : undefined),
  ({ io }) =>
    !isPlainObject(io) || !isPlainObject(io.inputs) ? "has no IO declaration ({ inputs })" : portsProblem(io.inputs),
  ({ events, io }) =>
    !isPlainObject(events)
      ? "has no events declaration (use NO_EVENTS for none)"
      : eventsProblem(events, (io as { inputs: Record<string, unknown> }).inputs),
];

export function createContracts(): ContractRegistry {
  return createNamedRegistry<AnyWidgetContract>({
    label: "Contract",
    keyOf: (contract) => contract.kind,
    pattern: KEBAB_NAME,
    invariants: declarationInvariants,
  });
}
