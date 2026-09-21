/**
 * A PAGE's own events and reactions (doc/widget-events-design.md, "Page
 * events"): `viewModels.on.<page>` says what happens when the page loads —
 * typically the action that fetches what the page shows.
 *
 * `checkPageReactions` is the ONE rule for render and boot validation: the
 * reactions as they will run, or WHY they are ignored. They are ignored as
 * a whole, loudly (a warning on the plan, an error at boot) — a page with a
 * typo in its load reaction still renders, and says what is wrong.
 *
 * `emitPageLoad` is for adapters: call it once per opening of a page, AFTER
 * `bindReactions` — the page's reactions are bound by it like a cell's.
 */
import {
  PAGE_EVENT_WIDGET,
  pageBindingsSchema,
  pageEventSource,
  pageEvents,
  validatorKeys,
  type EventBindings,
  type EventBus,
  type PageEventName,
  type Reaction,
  type ViewModels,
} from "@wirework/schema";
import type { ActionRegistry } from "./actions";
import { errorText, issuesText } from "./messages";
import { actionArguments } from "./reactions";

export interface PageReactions {
  /** The reactions to bind: event name -> list. Empty when there are none, or they are ignored. */
  on: EventBindings;
  /** Why the page's reactions are ignored, all of them. */
  problem?: string;
}

/** What is wrong with ONE reaction of a page event, if anything. */
function reactionProblem(event: PageEventName, reaction: Reaction, actions: ActionRegistry | undefined): string | undefined {
  if ("call" in reaction) {
    if (actions === undefined) return undefined;
    const action = actions.get(reaction.call);
    if (!action) return `calls unknown action "${reaction.call}" (registered: ${actions.keys().join(", ") || "none"})`;
    try {
      actionArguments(action, reaction.with);
      return undefined;
    } catch (error) {
      return errorText(error);
    }
  }
  const fields = validatorKeys(pageEvents[event].payload) ?? [];
  const head = reaction.from?.split(".")[0];
  return head !== undefined && !fields.includes(head)
    ? `reads payload field "${reaction.from}" that does not exist (payload fields: ${fields.join(", ") || "none"})`
    : undefined;
}

export function checkPageReactions(
  viewModels: Pick<ViewModels, "on">,
  page: string,
  actions?: ActionRegistry,
): PageReactions {
  const raw = viewModels.on?.[page];
  if (raw === undefined) return { on: {} };

  const parsed = pageBindingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { on: {}, problem: `page reactions ignored: ${issuesText(parsed.error)}` };
  }
  const entries = Object.entries(parsed.data) as [PageEventName, Reaction[] | undefined][];
  const problems = entries.flatMap(([event, reactions]) =>
    (reactions ?? []).flatMap((reaction) => {
      const problem = reactionProblem(event, reaction, actions);
      return problem === undefined ? [] : [`on ${event}: ${problem}`];
    }),
  );
  if (problems.length > 0) return { on: {}, problem: `page reactions ignored: ${problems.join("; ")}` };

  return { on: Object.fromEntries(entries.flatMap(([event, reactions]) => (reactions ? [[event, reactions]] : []))) };
}

/** The page has opened: tell the bus, and with it the page's `load` reactions. */
export function emitPageLoad(bus: EventBus, page: string): void {
  bus.emit({ widget: PAGE_EVENT_WIDGET, name: "load", payload: { page }, source: pageEventSource(page) });
}
