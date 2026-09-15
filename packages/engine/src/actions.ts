/**
 * Action registry — the third extension point (widgets, layout engines,
 * actions). Strict and loud like the others: unique kebab-case name and a
 * handler function.
 */
import type { ActionDefinition } from "@wirework/schema";

const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface ActionRegistry {
  register(action: ActionDefinition): void;
  get(name: string): ActionDefinition | undefined;
  names(): string[];
  list(): ActionDefinition[];
}

export class ActionRegistrationError extends Error {
  constructor(
    message: string,
    readonly actionName: string,
  ) {
    super(message);
    this.name = "ActionRegistrationError";
  }
}

export function createActions(): ActionRegistry {
  const actions = new Map<string, ActionDefinition>();
  return {
    register(action): void {
      const { name } = action;
      if (!name || !NAME_PATTERN.test(name)) {
        throw new ActionRegistrationError(
          `Action name ${JSON.stringify(name)} is not a valid kebab-case identifier`,
          String(name),
        );
      }
      if (actions.has(name)) {
        throw new ActionRegistrationError(`Action "${name}" is already registered`, name);
      }
      if (typeof action.handler !== "function") {
        throw new ActionRegistrationError(`Action "${name}" has no handler`, name);
      }
      actions.set(name, action);
    },
    get: (name) => actions.get(name),
    names: () => [...actions.keys()],
    list: () => [...actions.values()],
  };
}
