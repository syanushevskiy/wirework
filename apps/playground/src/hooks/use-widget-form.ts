/**
 * The widget form — shared by "Add widget" (builder) and "Edit widget"
 * (editor). Generic over a definition: one path field per input port, one
 * field per primitive setting, and per event a REACTION — either "set a
 * store path from a payload field" or "call a host action" (picked from
 * the action registry) — optional unless the event is `required`, in which
 * case it gates submit exactly like a required port. `collect()` turns the drafts
 * into bindings + settings for the host to write into a template.
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
  type SettingField,
  type Store,
  type WidgetBindings,
  type WidgetEvents,
} from "@wirework/schema";
import { compatibleStorePaths, type ActionRegistry } from "@wirework/engine";

export interface PortField {
  name: string;
  description?: string;
  required: boolean;
  /** The port's declared default (shown while the path holds nothing). */
  defaultValue?: unknown;
  value: string;
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
}

/** A setting with the user's draft value (string for text/number inputs). */
export interface SettingDraft extends SettingField {
  value: string | boolean;
}

/** Widget settings collected by the form, already coerced to their kind. */
export type WidgetSettings = Record<string, unknown>;

type ReactionDraft = { kind: ReactionKind; set: string; from: string; call: string };

export interface WidgetFormValues {
  paths: Record<string, string>;
  reactions: Record<string, ReactionDraft>;
  settings: Record<string, string | boolean>;
}

export const EMPTY_FORM: WidgetFormValues = { paths: {}, reactions: {}, settings: {} };

const isBlank = (value: string | boolean | undefined): boolean =>
  value === undefined || (typeof value === "string" && value.trim() === "");

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
  const on = (vm["on"] ?? {}) as EventBindings;
  const reactions = Object.fromEntries(
    Object.entries(on).flatMap(([event, list]) => {
      const first = list?.[0];
      if (!first) return [];
      const draft: ReactionDraft =
        "call" in first
          ? { kind: "call", set: "", from: "", call: first.call }
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
  return { paths, reactions, settings };
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

  const fields = useMemo<PortField[]>(
    () =>
      Object.entries((definition?.io.inputs ?? {}) as Record<string, PortDefinition>).map(
        ([name, port]) => ({
          name,
          description: port.description,
          required: port.required !== false,
          ...(port.default === undefined ? {} : { defaultValue: port.default }),
          value: paths[name] ?? "",
        }),
      ),
    [definition, paths],
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
   * defaults to the payload's ONLY field: writing a `{ value }` object into
   * a number-typed path is the classic wiring trap.
   */
  const actionList = useMemo(
    () => actions.list().map(({ name, description }) => ({ name, description })),
    [actions],
  );
  const events = useMemo<EventField[]>(
    () =>
      Object.entries((definition?.events ?? {}) as WidgetEvents).map(
        ([name, event]: [string, EventDefinition]) => {
          const fields = validatorKeys(event.payload);
          const draft = reactions[name];
          return {
            name,
            description: event.description,
            required: event.required === true,
            fields,
            actions: actionList,
            kind: draft?.kind ?? "set",
            set: draft?.set ?? "",
            from: draft?.from ?? event.primary ?? (fields?.length === 1 ? fields[0]! : ""),
            call: draft?.call ?? "",
          };
        },
      ),
    [definition, reactions, actionList],
  );

  const reset = useCallback(() => {
    setPaths({});
    setReactions({});
    setSettingValues({});
  }, []);

  const setPortPath = useCallback((name: string, value: string) => {
    setPaths((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setSetting = useCallback((name: string, value: string | boolean) => {
    setSettingValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setReaction = useCallback((event: string, field: keyof ReactionDraft, value: string) => {
    setReactions((prev) => ({
      ...prev,
      [event]: { kind: "set", set: "", from: "", call: "", ...prev[event], [field]: value },
    }));
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
        !event.required || (event.kind === "call" ? event.call !== "" : event.set.trim() !== ""),
    ) &&
    settings.every((setting) => !setting.required || !isBlank(settingValues[setting.name]));

  /** Drafts -> bindings + settings. Blank settings are omitted so defaults apply. */
  const collect = useCallback((): { bindings: WidgetBindings; settings: WidgetSettings } => {
    const bindings: WidgetBindings = { inputs: {}, on: {} };
    for (const field of fields) {
      const value = field.value.trim();
      if (value !== "") bindings.inputs[field.name] = value;
    }
    for (const event of events) {
      if (event.kind === "call") {
        if (event.call !== "") bindings.on[event.name] = [{ call: event.call }];
        continue;
      }
      const set = event.set.trim();
      const from = event.from.trim();
      if (set !== "") bindings.on[event.name] = [from === "" ? { set } : { set, from }];
    }
    const collected: WidgetSettings = Object.fromEntries(
      settings.flatMap((setting) => {
        const raw = settingValues[setting.name];
        if (isBlank(raw)) return [];
        return [[setting.name, setting.kind === "number" ? Number(raw) : raw] as const];
      }),
    );
    return { bindings, settings: collected };
  }, [fields, events, settings, settingValues]);

  return {
    definition,
    fields,
    settings,
    events,
    setPortPath,
    setSetting,
    setReaction,
    suggestionsFor,
    valid,
    collect,
    reset,
  };
}

export type WidgetFormState = ReturnType<typeof useWidgetForm>;
