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
 * shorten a chain (review finding: the demo pagination lost its load call).
 * ALL form logic lives here (guidelines: render-only components).
 */
import { useCallback, useMemo, useState } from "react";
import {
  settingFields,
  validatorKeys,
  type AnyWidgetDefinition,
  type EventBindings,
  type EventDefinition,
  type PortDefinition,
  type Reaction,
  type SettingField,
  type Store,
  type WidgetBindings,
  type WidgetEvents,
} from "@wirework/schema";
import { compatibleStorePaths, problemText, type ActionRegistry } from "@wirework/engine";

export interface PortField {
  name: string;
  description?: string;
  required: boolean;
  /** The port's declared default (shown while the path holds nothing). */
  defaultValue?: unknown;
  value: string;
  /** The generated path the field started from (a builder's default); the user may change it. */
  suggested?: string;
}

export type ReactionKind = "set" | "call";

export interface EventField {
  name: string;
  description?: string;
  /** A required event must have a reaction (it carries state). */
  required: boolean;
  /** Top-level payload fields a reaction can pick with `from` (undefined: not an object payload). */
  fields?: string[];
  /** Host actions a `call` reaction may pick. */
  actions: { name: string; description?: string }[];
  /** Reaction draft. */
  kind: ReactionKind;
  /** `set`: store path to write (empty = no reaction) + payload field ("" = whole payload). */
  set: string;
  from: string;
  /** `call`: action name (empty = no reaction). */
  call: string;
  /** `call`: the chosen action's declared parameters, with the user's drafts (none: the action declares none). */
  params: ParamDraft[];
  /** `call`: the drafts as the reaction's `with` — what `collect()` saves. */
  arguments: Record<string, unknown>;
  /** `call`: why the arguments as a whole do not fit the action (its own validation), once every field is fine. */
  argumentsError?: string;
  /** Reactions after the first: not editable here, kept on save. */
  kept: number;
}

/** One parameter of the chosen action, with the user's draft (text for text, number and JSON fields). */
export interface ParamDraft extends SettingField {
  value: string | boolean;
  /**
   * Nothing chosen: the argument is left out and the action decides. It
   * matters for a yes/no parameter, where "not set" is a third answer
   * (`table-view/load`'s `metadata`: automatic) a checkbox must be able to show.
   */
  unset: boolean;
  /** Why this draft cannot be used: not a number, JSON that does not parse. */
  error?: string;
}

/** A setting with the user's draft value (string for text/number inputs). */
export interface SettingDraft extends SettingField {
  value: string | boolean;
}

/** Widget settings collected by the form, already coerced to their kind. */
export type WidgetSettings = Record<string, unknown>;

export interface ReactionDraft {
  kind: ReactionKind;
  set: string;
  /** Payload field; absent = the event's default (its primary or only field). */
  from?: string;
  call: string;
  /** Drafts of the called action's parameters, by name. */
  with?: Record<string, string | boolean>;
}

export interface WidgetFormValues {
  paths: Record<string, string>;
  reactions: Record<string, ReactionDraft>;
  settings: Record<string, string | boolean>;
  /** The reactions as loaded; the form edits the first of each event and keeps the rest. */
  loaded: EventBindings;
}

export const EMPTY_FORM: WidgetFormValues = { paths: {}, reactions: {}, settings: {}, loaded: {} };

const isBlank = (value: string | boolean | undefined): boolean =>
  value === undefined || (typeof value === "string" && value.trim() === "");

/** A saved `with` as drafts: text as it is, numbers as text, objects as JSON. */
function draftsOfArguments(given: Record<string, unknown> | undefined): Record<string, string | boolean> {
  return Object.fromEntries(
    Object.entries(given ?? {}).flatMap(([name, value]) => {
      if (value === undefined || value === null) return [];
      if (typeof value === "boolean" || typeof value === "string") return [[name, value]];
      return [[name, typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)]];
    }),
  );
}

/**
 * The drafts as arguments, field by field: blank = not given (the action's
 * default applies), numbers and JSON parsed — with the reason when a draft
 * cannot be.
 */
function argumentsOf(
  fields: readonly SettingField[],
  drafts: Record<string, string | boolean>,
): { params: ParamDraft[]; values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  const params = fields.map<ParamDraft>((field) => {
    const draft = drafts[field.name];
    const value = draft ?? (field.kind === "boolean" ? false : "");
    if (typeof draft === "boolean") {
      values[field.name] = draft;
      return { ...field, value, unset: false };
    }
    const text = (draft ?? "").trim();
    if (text === "") return { ...field, value, unset: true };
    if (field.kind === "number") {
      const number = Number(text);
      if (Number.isNaN(number)) return { ...field, value, unset: false, error: "not a number" };
      values[field.name] = number;
    } else if (field.kind === "json") {
      try {
        values[field.name] = JSON.parse(text);
      } catch {
        return { ...field, value, unset: false, error: "not valid JSON" };
      }
    } else {
      values[field.name] = text;
    }
    return { ...field, value, unset: false };
  });
  return { params, values };
}

/** Prefill from a RESOLVED (validated) view model — the editor's starting point. */
export function valuesFromViewModel(
  definition: AnyWidgetDefinition,
  viewModel: unknown,
): WidgetFormValues {
  const vm = (viewModel ?? {}) as Record<string, unknown>;
  const paths = Object.fromEntries(
    Object.entries((vm["inputs"] ?? {}) as Record<string, unknown>).flatMap(([port, path]) =>
      typeof path === "string" ? [[port, path] as [string, string]] : [],
    ),
  );
  const loaded = (vm["on"] ?? {}) as EventBindings;
  const reactions = Object.fromEntries(
    Object.entries(loaded).flatMap(([event, list]) => {
      const first = list?.[0];
      if (!first) return [];
      const draft: ReactionDraft =
        "call" in first
          ? { kind: "call", set: "", call: first.call, with: draftsOfArguments(first.with) }
          : { kind: "set", set: first.set, from: first.from ?? "", call: "" };
      return [[event, draft]];
    }),
  );
  const settings = Object.fromEntries(
    settingFields(definition.viewModel).flatMap((field) => {
      const value = vm[field.name];
      if (value === undefined || value === null) return [];
      return [[field.name, field.kind === "boolean" ? value === true : String(value)]];
    }),
  );
  return { paths, reactions, settings, loaded };
}

/**
 * The first reaction as the form now describes it. What the form does not
 * show (`with` of a call, `value` of a set) is kept while the user left the
 * reaction's target alone; undefined when the user cleared it.
 */
function editedReaction(event: EventField, original: Reaction | undefined): Reaction | undefined {
  if (event.kind === "call") {
    if (event.call === "") return undefined;
    // An action that declares parameters shows its whole `with`: what the
    // form holds is what is saved. One that declares none keeps a `with`
    // the form cannot show.
    if (event.params.length > 0) {
      return Object.keys(event.arguments).length > 0 ? { call: event.call, with: event.arguments } : { call: event.call };
    }
    return original && "call" in original && original.call === event.call ? original : { call: event.call };
  }
  const set = event.set.trim();
  if (set === "") return undefined;
  const from = event.from.trim();
  if (original && "set" in original && original.set === set && (original.from ?? "") === from) return original;
  return from === "" ? { set } : { set, from };
}

export function useWidgetForm(
  definition: AnyWidgetDefinition | undefined,
  store: Store,
  actions: ActionRegistry,
  initial: WidgetFormValues = EMPTY_FORM,
) {
  const [paths, setPaths] = useState(initial.paths);
  const [reactions, setReactions] = useState(initial.reactions);
  const [settingValues, setSettingValues] = useState(initial.settings);
  const [loaded, setLoaded] = useState(initial.loaded);
  /** Generated paths the port fields started from (a builder's defaults): see `reset`. */
  const [suggested, setSuggested] = useState<Record<string, string>>({});

  const fields = useMemo<PortField[]>(
    () =>
      Object.entries((definition?.io.inputs ?? {}) as Record<string, PortDefinition>).map(
        ([name, port]) => ({
          name,
          description: port.description,
          required: port.required !== false,
          ...(port.default === undefined ? {} : { defaultValue: port.default }),
          value: paths[name] ?? "",
          ...(suggested[name] === undefined ? {} : { suggested: suggested[name] }),
        }),
      ),
    [definition, paths, suggested],
  );

  /** Primitive settings of the widget, with the user's drafts. */
  const settings = useMemo<SettingDraft[]>(
    () =>
      (definition ? settingFields(definition.viewModel) : []).map((field) => ({
        ...field,
        value: settingValues[field.name] ?? (field.kind === "boolean" ? false : ""),
      })),
    [definition, settingValues],
  );

  /**
   * Events the widget declares, each with its reaction draft. `from`
   * defaults to the event's primary field, else the payload's ONLY field —
   * and stays so until the user picks another: writing a `{ value }` object
   * into a number-typed path is the classic wiring trap.
   */
  const actionList = useMemo(
    () => actions.list().map(({ name, description }) => ({ name, description })),
    [actions],
  );
  /** What each action asks for: its declared parameters, objects and lists as JSON fields. */
  const parametersOf = useMemo(
    () =>
      new Map(
        actions.list().map((action) => [
          action.name,
          { validator: action.params, fields: action.params ? settingFields(action.params, { json: true }) : [] },
        ]),
      ),
    [actions],
  );
  const events = useMemo<EventField[]>(
    () =>
      Object.entries((definition?.events ?? {}) as WidgetEvents).map(
        ([name, event]: [string, EventDefinition]) => {
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
          return {
            name,
            description: event.description,
            required: event.required === true,
            fields,
            actions: actionList,
            kind: draft?.kind ?? "set",
            set: draft?.set ?? "",
            from: draft?.from ?? event.primary ?? (fields?.length === 1 ? (fields[0] ?? "") : ""),
            call: draft?.call ?? "",
            params,
            arguments: values,
            ...(argumentsError === undefined ? {} : { argumentsError }),
            kept: Math.max(0, (loaded[name]?.length ?? 0) - 1),
          };
        },
      ),
    [definition, reactions, actionList, parametersOf, loaded],
  );

  /**
   * Start over — for another widget. `suggestedPaths` (a builder's generated
   * defaults, doc/builder-user-needs.md W12) fill the port fields right away
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

  /** One parameter of the action an event's reaction calls; `undefined` = back to "not set". */
  const setReactionParam = useCallback((event: string, name: string, value: string | boolean | undefined) => {
    setReactions((prev) => {
      const current: ReactionDraft = prev[event] ?? { kind: "call", set: "", call: "" };
      const { [name]: _cleared, ...others } = current.with ?? {};
      return { ...prev, [event]: { ...current, with: value === undefined ? others : { ...others, [name]: value } } };
    });
  }, []);

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
        !event.required ||
        event.kept > 0 ||
        (event.kind === "call" ? event.call !== "" : event.set.trim() !== ""),
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
    setReaction,
    setReactionParam,
    suggestionsFor,
    valid,
    collect,
    reset,
  };
}

export type WidgetFormState = ReturnType<typeof useWidgetForm>;
