/**
 * Contract registry — the standard kinds plus the application's own.
 * Strict and loud like the others: unique kebab-case kind, a view-model
 * validator, and io/events that are really records (a `null` used to slip
 * through `typeof`). Tooling groups widgets by kind and shows what it means.
 */
import { KEBAB_NAME, type AnyWidgetContract } from "@wirework/schema";
import { createNamedRegistry, isRecord, RegistrationError } from "./named-registry";

export interface ContractRegistry {
  register(contract: AnyWidgetContract): void;
  get(kind: string): AnyWidgetContract | undefined;
  kinds(): readonly string[];
  list(): readonly AnyWidgetContract[];
}

export { RegistrationError as ContractRegistrationError };

export function createContracts(): ContractRegistry {
  const registry = createNamedRegistry<AnyWidgetContract>({
    label: "Contract",
    keyOf: (contract) => contract.kind,
    pattern: KEBAB_NAME,
    invariants: [
      (contract) => (typeof contract.viewModel?.parse !== "function" ? "has no view-model validator" : undefined),
      (contract) => (!isRecord(contract.io) || !isRecord(contract.io.inputs) ? "has no IO declaration ({ inputs })" : undefined),
      (contract) => (!isRecord(contract.events) ? "has no events declaration (use NO_EVENTS for none)" : undefined),
    ],
  });

  return {
    register: (contract) => registry.register(contract),
    get: (kind) => registry.get(kind),
    kinds: () => registry.keys(),
    list: () => registry.list(),
  };
}
