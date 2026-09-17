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
  /**
   * Aborted when the page that bound the reaction goes away. The rest of
   * the chain never starts after that; a long-running action may check it
   * (or hand it to `fetch`) to stop early.
   */
  signal: AbortSignal;
}

export interface ActionDefinition {
  /** Name referenced by `call` reactions ("reset-counter", "runs/load"). */
  name: string;
  /** Shown by builders next to the name. */
  description?: string;
  /**
   * Host code. May be async: the reactions of ONE event run in declaration
   * order and an async action is awaited before the next starts
   * (doc/actions-design.md), so `[load, navigate]` navigates after the load.
   * Synchronous reactions run synchronously, inside the emit.
   */
  handler: (context: ActionContext) => void | Promise<void>;
}
