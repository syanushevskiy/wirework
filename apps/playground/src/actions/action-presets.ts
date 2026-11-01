/**
 * Action PRESETS — a call reaction with a name a user reads
 * (doc/actions-design.md, "Hundreds of actions"). The PROPOSED contract: it
 * moves to @wirework/schema when phase 5 is built; it lives here so the
 * demo's action-config.ts typechecks against the actions it names.
 *
 * A preset is JSON: the server sends its own and they merge by id, so
 * nothing in one may be a function, a Date or `undefined`. Nothing here
 * throws: a wrong field fails to COMPILE in the host's file, and the merged
 * result is boot validation's to report — configuration problems are data.
 */
import type { z } from "zod";

/** A JSON value — what a preset may hold. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = Record<string, Json>;

/** A preset IS a call reaction (`call`, `with`) plus what the picker shows for it. */
export interface ActionPreset {
  /** The action, by registered name — the same word as in a reaction. */
  call: string;
  /** One line the picker shows, for a user or a model: "Load the runs table". */
  label: string;
  /** Help beside the label. */
  description?: string;
  /** Words a search matches beside the label ("runs", "load"). */
  tags?: string[];
  /** The reaction's `with`, as the action's `params` accept it. */
  with: JsonObject;
}

/** The action a preset configures: its name and its parameter schema, from ONE definition so they cannot drift. */
export interface PresetTarget<P extends z.ZodTypeAny> {
  name: string;
  params: P;
}

/** One preset, typed against the action's parameter schema: a wrong field fails to compile, and the literal stays JSON. */
export function preset<P extends z.ZodTypeAny>(
  action: PresetTarget<P>,
  body: Omit<ActionPreset, "call" | "with"> & { with: z.input<P> & JsonObject },
): ActionPreset {
  return { call: action.name, ...body };
}
