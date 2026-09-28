/**
 * The EVENT fields of the widget form: every event the widget declares,
 * each with its reaction draft as the form shows it — the verb, the path
 * and payload field of a `set`, the action of a `call` with its declared
 * parameters read out of the drafts and checked by the action itself. A
 * pure derivation of the form's state; the hook memoizes it.
 */
import {
  validatorKeys,
  type ActionDefinition,
  type AnyWidgetDefinition,
  type EventBindings,
  type EventDefinition,
  type SettingField,
  type WidgetEvents,
} from "@wirework/schema";
import { problemText } from "@wirework/engine";
import {
  argumentsOf,
  isBlank,
  optionChoices,
  WHOLE_PAYLOAD,
  type Choice,
  type EventField,
  type ReactionDraft,
  type ReactionKind,
} from "./form-drafts";

/** What an action asks for: its parameter validator and the fields a form shows for it. */
export interface ActionParameters {
  validator: ActionDefinition["params"];
  fields: SettingField[];
}

export interface EventFieldsInput {
  definition: AnyWidgetDefinition | undefined;
  /** The reaction drafts, by event. */
  reactions: Record<string, ReactionDraft>;
  /** The reactions as loaded: the form edits the first of each event and keeps the rest. */
  loaded: EventBindings;
  /** The host's actions, as a `call` may pick them. */
  actions: { name: string; description?: string | undefined }[];
  kindChoices: Choice<ReactionKind>[];
  actionChoices: Choice[];
  /** What each action asks for, by name. */
  parametersOf: ReadonlyMap<string, ActionParameters>;
}

/**
 * `from` defaults to the event's primary field, else the payload's ONLY
 * field — and stays so until the user picks another: writing a `{ value }`
 * object into a number-typed path is the classic wiring trap.
 */
export function eventFieldsOf({
  definition,
  reactions,
  loaded,
  actions,
  kindChoices,
  actionChoices,
  parametersOf,
}: EventFieldsInput): EventField[] {
  return Object.entries((definition?.events ?? {}) as WidgetEvents).map(([name, event]: [string, EventDefinition]) => {
    const fields = validatorKeys(event.payload);
    const draft = reactions[name];
    const called = draft?.kind === "call" ? parametersOf.get(draft.call) : undefined;
    const { params, values } = argumentsOf(called?.fields ?? [], draft?.with ?? {});
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
    const from = draft?.from ?? event.primary ?? (fields?.length === 1 ? (fields[0] ?? "") : "");
    const call = draft?.call ?? "";
    return {
      name,
      description: event.description,
      required: event.required === true,
      fields,
      actions,
      kind: draft?.kind ?? "set",
      kindChoices,
      set: draft?.set ?? "",
      from,
      fromChoice: from === "" ? WHOLE_PAYLOAD : from,
      ...(fields === undefined
        ? {}
        : { fromChoices: [...optionChoices(fields), { value: WHOLE_PAYLOAD, label: "whole payload" }] }),
      call,
      ...(call === "" ? {} : { callChoice: call }),
      actionChoices,
      params,
      arguments: values,
      ...(argumentsError === undefined ? {} : { argumentsError }),
      kept: Math.max(0, (loaded[name]?.length ?? 0) - 1),
    };
  });
}
