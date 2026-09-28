/**
 * The widget form — shared by "Add widget" (builder) and "Edit widget"
 * (editor). Generic over a definition: one path field per input port, one
 * field per primitive setting, and per event a REACTION — either "set a
 * store path from a payload field" or "call a host action" (picked from
 * the action registry) — optional unless the event is `required`, in which
 * case it gates submit exactly like a required port. An action that DECLARES
 * parameters (doc/actions-design.md) gets one field per parameter — objects
 * and lists as JSON — saved as the reaction's `with`; its required ones gate
 * submit too. `collect()` turns the drafts into bindings + settings for the
 * host to write into a template.
 *
 * The form edits the FIRST reaction of an event. Everything it does not
 * show survives a save: the reactions after the first, the `value` of a
 * `set`, and the `with` of an action that declares no parameters, while the
 * reaction's target is unchanged — saving a widget must never silently
 * shorten a chain (a pagination once lost its load call that way).
 *
 * This hook holds the STATE and the callbacks; what the fields are is
 * derived in form-drafts.ts (the drafts) and form-events.ts (the events).
 */
import { useCallback, useMemo, useState } from "react";
import {
  settingFields,
  type AnyWidgetDefinition,
  type EventBindings,
  type PortDefinition,
  type Store,
  type WidgetBindings,
} from "@wirework/schema";
import { compatibleStorePaths, type ActionRegistry } from "@wirework/engine";
import {
  EMPTY_FORM,
  editedReaction,
  isBlank,
  nextParamValue,
  optionChoices,
  USE_DEFAULT,
  WHOLE_PAYLOAD,
  type Choice,
  type ParamDraft,
  type PortField,
  type ReactionDraft,
  type ReactionKind,
  type SettingDraft,
  type WidgetFormValues,
  type WidgetSettings,
} from "./form-drafts";
import { eventFieldsOf, type ActionParameters } from "./form-events";

export interface WidgetFormInput {
  /** The widget the form is for — none while nothing is chosen. */
  definition: AnyWidgetDefinition | undefined;
  store: Store;
  actions: ActionRegistry;
  /** What the form starts from (an editor: the placed widget's values); empty when absent. */
  initial?: WidgetFormValues | undefined;
}

export function useWidgetForm({ definition, store, actions, initial = EMPTY_FORM }: WidgetFormInput) {
  const [paths, setPaths] = useState(initial.paths);
  const [reactions, setReactions] = useState(initial.reactions);
  const [settingValues, setSettingValues] = useState(initial.settings);
  const [loaded, setLoaded] = useState(initial.loaded);
  /** Generated paths the port fields started from (a builder's defaults): see `reset`. */
  const [suggested, setSuggested] = useState<Record<string, string>>({});

  const fields = useMemo<PortField[]>(
    () =>
      Object.entries((definition?.io.inputs ?? {}) as Record<string, PortDefinition>).map(([name, port]) => {
        const value = paths[name] ?? "";
        const proposed = suggested[name];
        return {
          name,
          description: port.description,
          required: port.required !== false,
          ...(port.default === undefined ? {} : { defaultValue: port.default }),
          value,
          ...(proposed === undefined ? {} : { suggested: proposed }),
          untouched: proposed !== undefined && value === proposed,
        };
      }),
    [definition, paths, suggested],
  );

  /** Primitive settings of the widget, with the user's drafts. */
  const settings = useMemo<SettingDraft[]>(
    () =>
      (definition ? settingFields(definition.viewModel) : []).map((field) => {
        const value = settingValues[field.name] ?? (field.kind === "boolean" ? false : "");
        if (field.kind !== "select") return { ...field, value };
        // A setting the widget defaults: offer that default as an option of
        // its own, so "nothing chosen" is something the user can pick back.
        const fallback =
          field.defaultValue === undefined
            ? []
            : [{ value: USE_DEFAULT, label: `default: ${String(field.defaultValue)}` }];
        return {
          ...field,
          value,
          ...(typeof value === "string" && value !== ""
            ? { choice: value }
            : field.defaultValue === undefined
              ? {}
              : { choice: USE_DEFAULT }),
          choices: [...fallback, ...optionChoices(field.options)],
        };
      }),
    [definition, settingValues],
  );

  /** The host's actions, as the reactions offer them. */
  const actionList = useMemo(() => actions.list().map(({ name, description }) => ({ name, description })), [actions]);
  /** The same two lists for every event: which verbs are offered, and which actions. */
  const kindChoices = useMemo<Choice<ReactionKind>[]>(
    () => [
      { value: "set", label: "set store path" },
      { value: "call", label: "call action", disabled: actionList.length === 0 },
    ],
    [actionList],
  );
  const actionChoices = useMemo<Choice[]>(
    () =>
      actionList.map((action) => ({
        value: action.name,
        label: action.description ? `${action.name} — ${action.description}` : action.name,
      })),
    [actionList],
  );
  /** What each action asks for: its declared parameters, objects and lists as JSON fields. */
  const parametersOf = useMemo<ReadonlyMap<string, ActionParameters>>(
    () =>
      new Map(
        actions
          .list()
          .map((action) => [
            action.name,
            { validator: action.params, fields: action.params ? settingFields(action.params, { json: true }) : [] },
          ]),
      ),
    [actions],
  );
  /** Events the widget declares, each with its reaction draft. */
  const events = useMemo(
    () =>
      eventFieldsOf({ definition, reactions, loaded, actions: actionList, kindChoices, actionChoices, parametersOf }),
    [definition, reactions, loaded, actionList, kindChoices, actionChoices, parametersOf],
  );

  /**
   * Start over — for another widget. `suggestedPaths` (a builder's generated
   * defaults, `suggestedInputPaths` in the engine) fill the port fields right away
   * and are remembered as suggestions, so the form can tell a path the user
   * chose from one it proposed.
   */
  const reset = useCallback((suggestedPaths: Record<string, string> = {}) => {
    setPaths(suggestedPaths);
    setSuggested(suggestedPaths);
    setReactions({});
    setSettingValues({});
    setLoaded({});
  }, []);

  const setPortPath = useCallback((name: string, value: string) => {
    setPaths((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setSetting = useCallback((name: string, value: string | boolean) => {
    setSettingValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  /** What a select setting's dropdown answered — "use the default" means nothing chosen. */
  const chooseSetting = useCallback(
    (name: string, choice: string) => setSetting(name, choice === USE_DEFAULT ? "" : choice),
    [setSetting],
  );

  const setReaction = useCallback(
    <K extends keyof ReactionDraft>(event: string, field: K, value: NonNullable<ReactionDraft[K]>) => {
      setReactions((prev) => ({
        ...prev,
        // No `from` in the starting draft: absent keeps the event's default.
        [event]: { kind: "set", set: "", call: "", ...prev[event], [field]: value },
      }));
    },
    [],
  );

  /** What a payload-field dropdown answered — "whole payload" means no field. */
  const chooseFrom = useCallback(
    (event: string, choice: string) => setReaction(event, "from", choice === WHOLE_PAYLOAD ? "" : choice),
    [setReaction],
  );

  /** One parameter of the action an event calls; undefined clears it (not set). */
  const setReactionParam = useCallback((event: string, name: string, value: string | boolean | undefined) => {
    setReactions((prev) => {
      const current = prev[event] ?? { kind: "call" as const, set: "", call: "" };
      const { [name]: _cleared, ...others } = current.with ?? {};
      return { ...prev, [event]: { ...current, with: value === undefined ? others : { ...others, [name]: value } } };
    });
  }, []);

  /** A click on a yes/no parameter moves it to its next answer. */
  const cycleParam = useCallback(
    (event: string, param: ParamDraft) => setReactionParam(event, param.name, nextParamValue(param)),
    [setReactionParam],
  );

  /**
   * Autocomplete source for an input port: existing store paths whose
   * current value satisfies the port's declared type. (Reaction targets get
   * no suggestions — they may create brand-new paths.)
   */
  const suggestionsFor = useCallback(
    (field: PortField): string[] => {
      const port = definition?.io.inputs[field.name];
      return port ? compatibleStorePaths(store, port.value) : [];
    },
    [definition, store],
  );

  const valid =
    definition !== undefined &&
    fields.every((field) => !field.required || field.value.trim() !== "") &&
    events.every(
      (event) =>
        !event.required || event.kept > 0 || (event.kind === "call" ? event.call !== "" : event.set.trim() !== ""),
    ) &&
    // A chosen action must get what it asks for: required parameters, readable drafts.
    events.every(
      (event) =>
        event.kind !== "call" ||
        event.call === "" ||
        (event.argumentsError === undefined &&
          event.params.every((param) => !param.error && !(param.required && isBlank(param.value)))),
    ) &&
    settings.every((setting) => !setting.required || !isBlank(settingValues[setting.name]));

  /** Drafts -> bindings + settings. Blank settings are omitted so defaults apply. */
  const collect = useCallback((): { bindings: WidgetBindings; settings: WidgetSettings } => {
    const inputs = Object.fromEntries(
      fields.flatMap((field) => (field.value.trim() === "" ? [] : [[field.name, field.value.trim()]])),
    );
    const on: EventBindings = Object.fromEntries(
      events.flatMap((event) => {
        const [original, ...rest] = loaded[event.name] ?? [];
        const edited = editedReaction(event, original);
        const list = edited ? [edited, ...rest] : rest;
        return list.length > 0 ? [[event.name, list]] : [];
      }),
    );
    const collected: WidgetSettings = Object.fromEntries(
      settings.flatMap((setting) => {
        const raw = settingValues[setting.name];
        if (isBlank(raw)) return [];
        return [[setting.name, setting.kind === "number" ? Number(raw) : raw] as const];
      }),
    );
    return { bindings: { inputs, on }, settings: collected };
  }, [fields, events, settings, settingValues, loaded]);

  return {
    definition,
    fields,
    settings,
    events,
    setPortPath,
    setSetting,
    chooseSetting,
    setReaction,
    chooseFrom,
    setReactionParam,
    cycleParam,
    suggestionsFor,
    valid,
    collect,
    reset,
  };
}

export type WidgetFormState = ReturnType<typeof useWidgetForm>;
