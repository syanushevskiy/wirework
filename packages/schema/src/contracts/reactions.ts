/**
 * Event reactions — DECLARATIVE subscriptions in a widget's view model
 * (doc/widget-events-design.md).
 *
 *   on: { "<event>": [ { set: "<store path>", from?: "<payload path>", value?: <literal> }
 *                    | { call: "<action name>", with?: { ...static args } } ] }
 *
 * The emitter's template says what its events DO. Exactly two verbs (team
 * decision: no workflow engine by accretion):
 *  - `set`  — write `value` if given, else the payload field at `from`,
 *             else the whole payload, to the store (the only way widget
 *             STATE reaches the store — there are no output ports);
 *  - `call` — run a named ACTION the host registered (contracts/actions.ts):
 *             anything beyond a store write is host code, picked by name.
 * An event marked `required` must have at least one reaction.
 *
 * `eventBindingsSchema` derives the `on` section from the events
 * declaration (strict: reacting to an undeclared event is a config error
 * caught at boot), exactly like `ioBindingsSchema` derives ports.
 */
import { z } from "zod";
import type { WidgetEvents } from "./events";
import { ioBindingsSchema, storePathSchema, type IoBindings, type WidgetIO } from "./io";

export const setReactionSchema = z.object({
  /** Store path to write. */
  set: storePathSchema,
  /** Dot-path into the payload ("id", "status.state"); absent = whole payload. */
  from: z.string().optional(),
  /** Literal to write instead of the payload. */
  value: z.unknown().optional(),
});
export type SetReaction = z.infer<typeof setReactionSchema>;

export const callReactionSchema = z.object({
  /** Name of a host-registered action (kebab-case). */
  call: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "must be a kebab-case action name"),
  /** Static arguments handed to the action next to the event. */
  with: z.record(z.string(), z.unknown()).optional(),
});
export type CallReaction = z.infer<typeof callReactionSchema>;

export const reactionSchema = z.union([setReactionSchema, callReactionSchema]);
export type Reaction = z.infer<typeof reactionSchema>;

/** Event name -> reactions, as it appears under `on` in a view model. */
export type EventBindings = Record<string, Reaction[]>;

/** Builds the `on` part of a widget's view-model schema from its events. */
export function eventBindingsSchema(events: WidgetEvents) {
  const shape: Record<string, z.ZodType> = {};
  for (const name of Object.keys(events)) {
    shape[name] = z.array(reactionSchema).optional();
  }
  return z.object({ on: z.object(shape).strict().default({}) });
}

/** `inputs` + `on` in one go. Compose widget settings on top with `.extend()`. */
export function widgetBindingsSchema(io: WidgetIO, events: WidgetEvents) {
  return ioBindingsSchema(io).merge(eventBindingsSchema(events));
}

/** Everything a builder collects for a new widget instance. */
export interface WidgetBindings extends IoBindings {
  on: EventBindings;
}
