/**
 * The EVENT fields of the widget form: every event the widget declares,
 * with the write-back it does by default (the port's path as bound right
 * now) and its reaction drafts as the form shows them — per row the verb,
 * the path and payload field of a `set`, the action of a `call` with its
 * declared parameters read out of the drafts and checked by the action
 * itself. A pure derivation of the form's state; the hook memoizes it.
 */
import {
  validatorKeys,
  type ActionDefinition,
  type AnyWidgetDefinition,
  type EventDefinition,
  type SettingField,
  type WidgetEvents,
} from "@wirework/schema";
import { problemText } from "@wirework/engine";
import {
  argumentsOf,
  EMPTY_REACTION,
  isBlank,
  optionChoices,
  WHOLE_PAYLOAD,
  writeBackOf,
  type Choice,
  type EventField,
  type ReactionDraft,
  type ReactionField,
  type ReactionKind,
} from "./form-drafts";

/** What an action asks for: its parameter validator and the fields a form shows for it. */
export interface ActionParameters {
  validator: ActionDefinition["params"];
  fields: SettingField[];
}

export interface EventFieldsInput {
  definition: AnyWidgetDefinition | undefined;
  /** The port paths as the form holds them: where a default write-back goes. */
  paths: Record<string, string>;
  /** The reaction drafts, by event, in order. */
  reactions: Record<string, ReactionDraft[]>;
  /** The host's actions, as a `call` may pick them. */
  actions: { name: string; description?: string | undefined }[];
  kindChoices: Choice<ReactionKind>[];
  actionChoices: Choice[];
  /** What each action asks for, by name. */
  parametersOf: ReadonlyMap<string, ActionParameters>;
}

/**
 * One row. `from` defaults to the event's primary field, else the payload's
 * ONLY field — and stays so until the user picks another: writing a
 * `{ value }` object into a number-typed path is the classic wiring trap.
 */
function reactionFieldOf(
  index: number,
  draft: ReactionDraft,
  event: EventDefinition,
  fields: string[] | undefined,
  parametersOf: ReadonlyMap<string, ActionParameters>,
): ReactionField {
  const called = draft.kind === "call" ? parametersOf.get(draft.call) : undefined;
  const { params, values } = argumentsOf(called?.fields ?? [], draft.with ?? {});
  // The action's own check, once every field can be read and the
  // required ones are filled — it knows rules no field does.
  let argumentsError: string | undefined;
  const readable = params.every((param) => !param.error && !(param.required && isBlank(param.value)));
  if (called?.validator && readable) {
    try {
      called.validator.parse(values);
    } catch (error) {
      argumentsError = problemText(error);
    }
  }
  const from = draft.from ?? event.primary ?? (fields?.length === 1 ? (fields[0] ?? "") : "");
  return {
    index,
    kind: draft.kind,
    set: draft.set,
    from,
    fromChoice: from === "" ? WHOLE_PAYLOAD : from,
    call: draft.call,
    ...(draft.call === "" ? {} : { callChoice: draft.call }),
    params,
    arguments: values,
    ...(argumentsError === undefined ? {} : { argumentsError }),
    filled: draft.kind === "call" ? draft.call !== "" : draft.set.trim() !== "",
  };
}

export function eventFieldsOf({
  definition,
  paths,
  reactions,
  actions,
  kindChoices,
  actionChoices,
  parametersOf,
}: EventFieldsInput): EventField[] {
  return Object.entries((definition?.events ?? {}) as WidgetEvents).map(([name, event]: [string, EventDefinition]) => {
    const fields = validatorKeys(event.payload);
    const writesBack = writeBackOf(event, paths);
    // An event that writes nothing back offers a blank row to fill; one that
    // does starts with its default alone and takes rows on request.
    const drafts = reactions[name] ?? [];
    const rows = drafts.length > 0 || writesBack !== undefined ? drafts : [EMPTY_REACTION];
    return {
      name,
      description: event.description,
      required: event.required === true,
      fields,
      actions,
      kindChoices,
      ...(fields === undefined
        ? {}
        : { fromChoices: [...optionChoices(fields), { value: WHOLE_PAYLOAD, label: "whole payload" }] }),
      actionChoices,
      ...(writesBack === undefined ? {} : { writesBack }),
      reactions: rows.map((draft, index) => reactionFieldOf(index, draft, event, fields, parametersOf)),
    };
  });
}
