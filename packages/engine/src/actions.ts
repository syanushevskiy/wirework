/**
 * Action registry — what a `call` reaction invokes. Names may be namespaced
 * ("runs/load"), as doc/actions-design.md requires.
 */
import { ACTION_NAME, type ActionDefinition } from "@wirework/schema";
import { createNamedRegistry, type NamedRegistry } from "./named-registry";

export type ActionRegistry = NamedRegistry<ActionDefinition>;

export function createActions(): ActionRegistry {
  return createNamedRegistry<ActionDefinition>({
    label: "Action",
    keyOf: (action) => action.name,
    pattern: ACTION_NAME,
    invariants: [(action) => (typeof action.handler !== "function" ? "has no handler" : undefined)],
  });
}
