/**
 * Reaction interpreter (doc/widget-events-design.md). For every resolved
 * cell whose view model carries an `on` section, subscribe to THAT cell's
 * events on the bus and run the declared reactions: `set` writes the store,
 * `call` runs a host-registered action. Framework-agnostic: any adapter
 * that renders a plan calls `bindReactions` while the page is mounted.
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

const cellsOf = (plan: ResolvedPage): ResolvedCell[] => (plan.problem === undefined ? plan.cells : []);

const bindingsOf = (cell: ResolvedCell): EventBindings =>
  (cell.viewModel as { on?: EventBindings } | undefined)?.on ?? {};

function run(reaction: Reaction, event: WidgetEvent, store: Store, actions?: ActionRegistry): void {
  if ("call" in reaction) {
    const action = actions?.get(reaction.call);
    if (!action) {
      // Boot validation reports this; at runtime it must not take the page down.
      // eslint-disable-next-line no-console
      console.error(`Reaction on "${event.widget}/${event.name}" calls unknown action "${reaction.call}"`);
      return;
    }
    action.handler({ event, store, args: reaction.with ?? {} });
    return;
  }
  store.set(reaction.set, reactionValue(reaction, event.payload));
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
      (reactions ?? []).map((reaction) =>
        bus.subscribe({ page: plan.page, cell: cell.key, name }, (event) =>
          run(reaction, event, store, actions),
        ),
      ),
    ),
  );
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
