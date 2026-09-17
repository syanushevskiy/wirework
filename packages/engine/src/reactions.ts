/**
 * Reaction interpreter (doc/widget-events-design.md). For every resolved
 * cell whose view model carries an `on` section, subscribe to THAT cell's
 * events on the bus and run the declared reactions: `set` writes the store,
 * `call` runs a host-registered action.
 *
 * ONE subscription per (cell, event), not per reaction: the reactions of an
 * event run in DECLARATION ORDER (team-tiger, Ren: order used to depend on
 * the bus iterating subscriptions in insertion order). Timing is explicit:
 *  - synchronous reactions run synchronously, inside the emit — a
 *    controlled input's `set` must land in its change handler, or React
 *    restores the old text and the caret jumps (team-tiger review, Ren);
 *  - an async action is awaited before the next reaction starts, so
 *    `[ load, navigate ]` navigates after the load (doc/actions-design.md);
 *  - a failing reaction is logged and stops that event's chain; it never
 *    takes the page down or throws at the emitting widget;
 *  - unbinding (the page goes away) aborts every chain still in flight: the
 *    rest never starts, and actions see it on `signal`.
 *
 * Framework-agnostic: any adapter that renders a plan calls `bindReactions`
 * while the page is mounted.
 */
import type {
  EventBindings,
  EventBus,
  Reaction,
  SetReaction,
  Store,
  Unsubscribe,
  WidgetEvent,
} from "@wirework/schema";
import type { ActionRegistry } from "./actions";
import { getPath } from "./paths";
import type { ResolvedPage } from "./resolve";

/** `value` literal wins, then the payload field at `from`, else the payload. */
export function reactionValue(reaction: SetReaction, payload: unknown): unknown {
  if (reaction.value !== undefined) return reaction.value;
  return reaction.from ? getPath(payload, reaction.from) : payload;
}

/** What `bindCellReactions` needs of a cell: where its events come from and its view model. */
export interface ReactionTarget {
  page: string;
  cell: string;
  viewModel: unknown;
}

const bindingsOf = (viewModel: unknown): EventBindings =>
  (viewModel as { on?: EventBindings } | undefined)?.on ?? {};

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function";

/** One reaction. Returns the action's promise when it is async. */
function run(
  reaction: Reaction,
  event: WidgetEvent,
  store: Store,
  actions: ActionRegistry | undefined,
  signal: AbortSignal,
): unknown {
  if ("call" in reaction) {
    const action = actions?.get(reaction.call);
    if (!action) {
      // Boot validation reports this; at runtime it must not take the page down.
      throw new Error(`Reaction calls unknown action "${reaction.call}"`);
    }
    return action.handler({ event, store, args: reaction.with ?? {}, signal });
  }
  if ("set" in reaction) {
    store.set(reaction.set, reactionValue(reaction, event.payload));
    return undefined;
  }
  // A third verb added to the schema must be handled here, not silently fall
  // through to a store write.
  throw new Error(`Reaction has an unknown verb: ${JSON.stringify(reaction)}`);
}

/** The reactions of ONE event, in order: synchronous ones inline, async ones awaited. */
function runAll(
  reactions: readonly Reaction[],
  event: WidgetEvent,
  store: Store,
  actions: ActionRegistry | undefined,
  signal: AbortSignal,
): void {
  const fail = (error: unknown): void => {
    // eslint-disable-next-line no-console
    console.error(
      `Reaction on "${event.widget}/${event.name}" from cell "${event.source.cell}" failed:`,
      error,
    );
  };
  // Imperative on purpose: the ORDER, the early stop and the hand-over to
  // an async continuation are the whole point of this function.
  const runFrom = (start: number): void => {
    for (let index = start; index < reactions.length; index += 1) {
      const reaction = reactions[index];
      if (reaction === undefined || signal.aborted) return;
      let result: unknown;
      try {
        result = run(reaction, event, store, actions, signal);
      } catch (error) {
        fail(error); // the rest of this chain depended on it
        return;
      }
      if (isThenable(result)) {
        result.then(() => runFrom(index + 1), fail);
        return;
      }
    }
  };
  runFrom(0);
}

/** Subscribe ONE cell's declared reactions; the unsubscribe aborts its chains in flight. */
export function bindCellReactions(
  bus: EventBus,
  store: Store,
  target: ReactionTarget,
  actions?: ActionRegistry,
): Unsubscribe {
  const controller = new AbortController();
  const unsubscribes = Object.entries(bindingsOf(target.viewModel)).flatMap(([name, reactions]) =>
    reactions === undefined || reactions.length === 0
      ? []
      : [
          bus.subscribe({ page: target.page, cell: target.cell, name }, (event) =>
            runAll(reactions, event, store, actions, controller.signal),
          ),
        ],
  );
  return () => {
    controller.abort();
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

/** Subscribe every declared reaction of the plan; returns ONE unsubscribe. */
export function bindReactions(
  bus: EventBus,
  store: Store,
  plan: ResolvedPage,
  actions?: ActionRegistry,
): Unsubscribe {
  const cells = plan.problem === undefined ? plan.cells : [];
  const unsubscribes = cells.map((cell) =>
    bindCellReactions(bus, store, { page: plan.page, cell: cell.key, viewModel: cell.viewModel }, actions),
  );
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
