/**
 * Actions contract — what a `call` reaction invokes (doc/widget-events-design.md).
 *
 * Anything a user may attach to an event that is NOT a store write is host
 * code: refresh the runs, reset a counter, open a dialog. The host
 * registers such actions by NAME with a description; the builder lists them
 * so a user picks one without writing code; boot validation reports a
 * reaction calling an unknown name. The handler gets the full event (payload,
 * source cell), the store and the reaction's static `with` args.
 */
import type { WidgetEvent } from "./events";
import type { Store } from "./store";

export interface ActionContext {
  event: WidgetEvent;
  store: Store;
  /** The reaction's static `with` arguments (empty when absent). */
  args: Record<string, unknown>;
}

export interface ActionDefinition {
  /** Name referenced by `call` reactions ("reset-counter", "runs/load"). */
  name: string;
  /** Shown by builders next to the name. */
  description?: string;
  /**
   * Host code. May be async: the reactions of ONE event run in declaration
   * order and each is awaited before the next starts
   * (doc/actions-design.md), so `[load, navigate]` navigates after the load.
   */
  handler: (context: ActionContext) => void | Promise<void>;
}
