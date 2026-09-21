/**
 * Page events — what a PAGE itself emits, next to the events of its widgets
 * (doc/widget-events-design.md, "Page events").
 *
 * A page declares reactions to them exactly like a widget does, with the
 * same two verbs — but in the view models' own `on` section, keyed by page:
 *
 *   viewModels.on: { "<page>": { load: [ { call: "overview/load" } ] } }
 *
 * not in a page TEMPLATE: a template belongs to its layout engine, a page
 * may have several, and a user's own copy of one must never carry reactions.
 *
 * On the bus a page event has `widget: "page"` and comes from the page's own
 * source — the page name with the EMPTY cell id, which no cell can have.
 */
import { z } from "zod";
import type { EventSource, WidgetEvents } from "./events";
import { reactionSchema } from "./reactions";

/** The `widget` of a page's own events on the bus. */
export const PAGE_EVENT_WIDGET = "page";

/** Where a page's own events come from: the page, and no cell. */
export const pageEventSource = (page: string): EventSource => ({ page, cell: "" });

export const pageEvents = {
  load: {
    description:
      "Fired once when the page has opened and its reactions are bound — the moment to load what the page shows",
    payload: z.object({ page: z.string() }),
  },
} satisfies WidgetEvents;

export type PageEventName = keyof typeof pageEvents;

/**
 * One page's reactions. strict: reacting to an event pages do not have
 * ("loaded", "open") must fail, never be dropped.
 */
export const pageBindingsSchema = z.object({ load: z.array(reactionSchema).optional() }).strict();
export type PageBindings = z.infer<typeof pageBindingsSchema>;
