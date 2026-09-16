/**
 * Reaction interpreter (doc/widget-events-design.md). For every resolved
 * cell whose view model carries an `on` section, subscribe to THAT cell's
 * events on the bus and run the declared reactions: `set` writes the store,
 * `call` runs a host-registered action.
 *
 * ONE subscription per (cell, event), not per reaction: the reactions of an
 * event run in DECLARATION ORDER and an async action is awaited before the
 * next starts, so `[ load, navigate ]` navigates after the load
 * (doc/actions-design.md). Order used to depend on the bus iterating
 * subscriptions in insertion order — an accident, not a contract
 * (team-tiger, Ren). A failing reaction is logged and stops that event's
 * chain; it never takes the page down.
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
import type { ResolvedCell, ResolvedPage } from "./resolve";

/** `value` literal wins, then the payload field at `from`, else the payload. */
export function reactionValue(reaction: SetReaction, payload: unknown): unknown {
  if (reaction.value !== undefined) return reaction.value;
  return reaction.from ? getPath(payload, reaction.from) : payload;
}

const cellsOf = (plan: ResolvedPage): readonly ResolvedCell[] =>
  plan.problem === undefined ? plan.cells : [];

const bindingsOf = (cell: ResolvedCell): EventBindings =>
  (cell.viewModel as { on?: EventBindings } | undefined)?.on ?? {};

/** One reaction. Async actions are awaited by the caller. */
async function run(
  reaction: Reaction,
  event: WidgetEvent,
  store: Store,
  actions?: ActionRegistry,
): Promise<void> {
  if ("call" in reaction) {
    const action = actions?.get(reaction.call);
    if (!action) {
      // Boot validation reports this; at runtime it must not take the page down.
      throw new Error(`calls unknown action "${reaction.call}"`);
    }
    await action.handler({ event, store, args: reaction.with ?? {} });
    return;
  }
  if ("set" in reaction) {
    store.set(reaction.set, reactionValue(reaction, event.payload));
    return;
  }
  // A third verb added to the schema must be handled here, not silently fall
  // through to a store write.
  throw new Error(`is not a known reaction: ${JSON.stringify(reaction)}`);
}

/** The reactions of ONE event, in order, each awaited. */
async function runAll(
  reactions: readonly Reaction[],
  event: WidgetEvent,
  store: Store,
  actions?: ActionRegistry,
): Promise<void> {
  for (const reaction of reactions) {
    try {
      await run(reaction, event, store, actions);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `Reaction on "${event.widget}/${event.name}" from cell "${event.source.cell}" failed:`,
        error,
      );
      return; // the rest of this event's chain depended on it
    }
  }
}

/** Subscribe every declared reaction of the plan; returns ONE unsubscribe. */
export function bindReactions(
  bus: EventBus,
  store: Store,
  plan: ResolvedPage,
  actions?: ActionRegistry,
): Unsubscribe {
  const unsubscribes = cellsOf(plan).flatMap((cell) =>
    Object.entries(bindingsOf(cell)).flatMap(([name, reactions]) =>
      reactions === undefined || reactions.length === 0
        ? []
        : [
            bus.subscribe({ page: plan.page, cell: cell.key, name }, (event) => {
              void runAll(reactions, event, store, actions);
            }),
          ],
    ),
  );
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
