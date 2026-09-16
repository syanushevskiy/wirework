/**
 * Action registry — what a `call` reaction invokes. Names may be namespaced
 * ("runs/load"), as doc/actions-design.md requires.
 */
import { ACTION_NAME, type ActionDefinition } from "@wirework/schema";
import { createNamedRegistry, RegistrationError } from "./named-registry";

export interface ActionRegistry {
  register(action: ActionDefinition): void;
  get(name: string): ActionDefinition | undefined;
  names(): readonly string[];
  list(): readonly ActionDefinition[];
}

export { RegistrationError as ActionRegistrationError };

export function createActions(): ActionRegistry {
  const registry = createNamedRegistry<ActionDefinition>({
    label: "Action",
    keyOf: (action) => action.name,
    pattern: ACTION_NAME,
    invariants: [(action) => (typeof action.handler !== "function" ? "has no handler" : undefined)],
  });

  return {
    register: (action) => registry.register(action),
    get: (name) => registry.get(name),
    names: () => registry.keys(),
    list: () => registry.list(),
  };
}
