/**
 * The widget form's DRAFTS: what its fields hold while the user works
 * (paths, reaction drafts, setting values), how a placed widget's view model
 * becomes them, how an action's parameters are read out of them, and what a
 * save keeps of a reaction the form does not show. Pure functions and
 * types; the hook (use-widget-form.ts) holds the state.
 */
import {
  settingFields,
  type AnyWidgetDefinition,
  type EventBindings,
  type Reaction,
  type SettingField,
} from "@wirework/schema";

/**
 * A dropdown option cannot carry "", so the two "nothing chosen" answers
 * need a value of their own. They never leave the form: it exposes
 * `choice`/`choices` and takes the answer back through `chooseSetting` /
 * `chooseFrom`, so no component ever handles a sentinel.
 */
export const WHOLE_PAYLOAD = "$payload";
export const USE_DEFAULT = "$default";

/** One dropdown option, ready for a select. */
export interface Choice<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface PortField {
  name: string;
  description?: string | undefined;
  required: boolean;
  /** The port's declared default (shown while the path holds nothing). */
  defaultValue?: unknown;
  value: string;
  /** The generated path the field started from (a builder's default); the user may change it. */
  suggested?: string;
  /** Still exactly the path the builder proposed — say so, so the user knows it is a suggestion. */
  untouched: boolean;
}

export type ReactionKind = "set" | "call";

export interface EventField {
  name: string;
  description?: string | undefined;
  /** A required event must have a reaction (it carries state). */
  required: boolean;
  /** Top-level payload fields a reaction can pick with `from` (undefined: not an object payload). */
  fields?: string[] | undefined;
  /** Host actions a `call` reaction may pick. */
  actions: { name: string; description?: string | undefined }[];
  /** Reaction draft. */
  kind: ReactionKind;
  /** The two verbs, with `call` disabled while the host registered no actions. */
  kindChoices: Choice<ReactionKind>[];
  /** `set`: store path to write (empty = no reaction) + payload field ("" = whole payload). */
  set: string;
  from: string;
  /** The payload field as its dropdown shows it, and what it offers (absent: not an object payload). */
  fromChoice: string;
  fromChoices?: Choice[];
  /** `call`: action name (empty = no reaction). */
  call: string;
  /** The action as its dropdown shows it (undefined shows the placeholder), and what it offers. */
  callChoice?: string;
  actionChoices: Choice[];
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
  /** A yes/no parameter's three answers, for the checkbox and its label. */
  state: "unset" | "yes" | "no";
  stateLabel: string;
  /** A select parameter's value (undefined shows the placeholder) and what it offers. */
  choice?: string;
  choices?: Choice[];
}

/** A setting with the user's draft value (string for text/number inputs). */
export interface SettingDraft extends SettingField {
  value: string | boolean;
  /** A select setting's value — its own, or "use the widget's default" — and what it offers. */
  choice?: string;
  choices?: Choice[];
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

export const isBlank = (value: string | boolean | undefined): boolean =>
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

/** A parameter before the form works out how to SHOW it. */
type ParamCore = Omit<ParamDraft, "state" | "stateLabel" | "choice" | "choices">;

/** Options for a text-ish field the schema limits to a set of values. */
export const optionChoices = (options: readonly string[] | undefined): Choice[] =>
  (options ?? []).map((option) => ({ value: option, label: option }));

/** A select's value, or nothing chosen — which shows the placeholder. */
export const chosen = (value: string | boolean): { choice?: string } =>
  typeof value === "string" && value !== "" ? { choice: value } : {};

/** What a parameter's control shows: the yes/no/not-set answer, and a select's options. */
function shownParam(param: ParamCore): ParamDraft {
  const answer = param.unset ? "unset" : param.value === true ? "yes" : "no";
  return {
    ...param,
    state: answer,
    stateLabel: answer === "unset" ? "not set — the action decides" : answer,
    ...(param.kind === "select" ? { ...chosen(param.value), choices: optionChoices(param.options) } : {}),
  };
}

/**
 * The drafts as arguments, field by field: blank = not given (the action's
 * default applies), numbers and JSON parsed — with the reason when a draft
 * cannot be.
 */
export function argumentsOf(
  fields: readonly SettingField[],
  drafts: Record<string, string | boolean>,
): { params: ParamDraft[]; values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  const params = fields.map<ParamCore>((field) => {
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
  return { params: params.map(shownParam), values };
}

/** The next answer of a yes/no parameter: not set -> yes -> no -> not set (a required one only toggles). */
export function nextParamValue(param: ParamDraft): string | boolean | undefined {
  if (param.unset) return true;
  if (param.value === true) return false;
  return param.required ? true : undefined;
}

/** Prefill from a RESOLVED (validated) view model — the editor's starting point. */
export function valuesFromViewModel(definition: AnyWidgetDefinition, viewModel: unknown): WidgetFormValues {
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
export function editedReaction(event: EventField, original: Reaction | undefined): Reaction | undefined {
  if (event.kind === "call") {
    if (event.call === "") return undefined;
    // An action that declares parameters shows its whole `with`: what the
    // form holds is what is saved. One that declares none keeps a `with`
    // the form cannot show.
    if (event.params.length > 0) {
      return Object.keys(event.arguments).length > 0
        ? { call: event.call, with: event.arguments }
        : { call: event.call };
    }
    return original && "call" in original && original.call === event.call ? original : { call: event.call };
  }
  const set = event.set.trim();
  if (set === "") return undefined;
  const from = event.from.trim();
  if (original && "set" in original && original.set === set && (original.from ?? "") === from) return original;
  return from === "" ? { set } : { set, from };
}
