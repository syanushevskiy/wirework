/**
 * The widget form's DRAFTS: what its fields hold while the user works
 * (paths, reaction drafts, setting values), how a placed widget's view model
 * becomes them, how an action's parameters are read out of them, and what a
 * save keeps of a reaction the form does not show. Pure functions and
 * types; the hook (use-widget-form.ts) holds the state.
 */
import {
  settingFields,
  type Appearance,
  type AnyWidgetDefinition,
  type EventBindings,
  type EventDefinition,
  type Reaction,
  type SettingField,
  type When,
  type WidgetBindings,
  type WidgetEvents,
} from "@wirework/schema";
import { STANDARD_PREDICATES, defaultReaction, sameReaction, type PredicateRegistry } from "@wirework/engine";
import { draftsOfWhen, type ConditionDraft } from "./form-when";

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

/** The write-back an event does by default (the contract's `writesBack`), as the form shows it. */
export interface WriteBack {
  /** The input port written back to. */
  port: string;
  /** Its path as bound right now ("" while the port field is blank: the default waits for it). */
  path: string;
  /** The payload field written (absent: the whole payload). */
  from?: string;
}

/** One reaction of an event, as the form shows it. */
export interface ReactionField {
  /** Its place in the event's list (0 first); part of its field ids. */
  index: number;
  kind: ReactionKind;
  /** `set`: store path to write (empty = no reaction) + payload field ("" = whole payload). */
  set: string;
  from: string;
  /** The payload field as its dropdown shows it. */
  fromChoice: string;
  /** `call`: action name (empty = no reaction). */
  call: string;
  /** The action as its dropdown shows it (undefined shows the placeholder). */
  callChoice?: string;
  /** `call`: the chosen action's declared parameters, with the user's drafts (none: the action declares none). */
  params: ParamDraft[];
  /** `call`: the drafts as the reaction's `with` — what `collect()` saves. */
  arguments: Record<string, unknown>;
  /** `call`: why the arguments as a whole do not fit the action (its own validation), once every field is fine. */
  argumentsError?: string;
  /** A target is named: the row is a reaction, not a blank the form offers. */
  filled: boolean;
}

export interface EventField {
  name: string;
  description?: string | undefined;
  /** A required event must have a reaction (it carries state and writes nothing back by default). */
  required: boolean;
  /** Top-level payload fields a reaction can pick with `from` (undefined: not an object payload). */
  fields?: string[] | undefined;
  /** Host actions a `call` reaction may pick. */
  actions: { name: string; description?: string | undefined }[];
  /** The two verbs, with `call` disabled while the host registered no actions. */
  kindChoices: Choice<ReactionKind>[];
  /** What a payload-field dropdown offers (absent: not an object payload). */
  fromChoices?: Choice[];
  actionChoices: Choice[];
  /** What the event does BY DEFAULT, before the reactions below; absent when it writes nothing back. */
  writesBack?: WriteBack;
  /**
   * The reactions configured, in order — never the default write-back. An
   * event without one shows a blank row to fill; one with it starts empty.
   */
  reactions: ReactionField[];
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

/** A widget template as the form collected it: the ports, the reactions, the condition and the appearance (each only when there is one), the settings. */
export const templateOf = (bindings: WidgetBindings, settings: WidgetSettings): Record<string, unknown> => ({
  inputs: bindings.inputs,
  ...(Object.keys(bindings.on).length > 0 ? { on: bindings.on } : {}),
  ...(bindings.when === undefined ? {} : { when: bindings.when }),
  ...(bindings.appear === undefined ? {} : { appear: bindings.appear }),
  ...(bindings.disappear === undefined ? {} : { disappear: bindings.disappear }),
  ...settings,
});

export interface ReactionDraft {
  kind: ReactionKind;
  set: string;
  /** Payload field; absent = the event's default (its primary or only field). */
  from?: string;
  call: string;
  /** Drafts of the called action's parameters, by name. */
  with?: Record<string, string | boolean>;
  /** The reaction as loaded, for what the form does not show (a set's `value`, a parameterless call's `with`). */
  original?: Reaction;
}

/** A row the form offers to fill: no target yet. */
export const EMPTY_REACTION: ReactionDraft = { kind: "set", set: "", call: "" };

export interface WidgetFormValues {
  paths: Record<string, string>;
  /** The reaction drafts per event, in order — the CONFIGURED ones; a default write-back is never among them. */
  reactions: Record<string, ReactionDraft[]>;
  /** The condition's rows, in order (form-when.ts); empty: the widget always shows. */
  conditions: ConditionDraft[];
  /** How the widget appears when its condition turns true, and disappears when it turns false ("" = it simply shows / goes). */
  appear: string;
  disappear: string;
  settings: Record<string, string | boolean>;
}

export const EMPTY_FORM: WidgetFormValues = {
  paths: {},
  reactions: {},
  conditions: [],
  appear: "",
  disappear: "",
  settings: {},
};

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

/** A saved reaction as the form edits it. */
export function draftOf(reaction: Reaction): ReactionDraft {
  return "call" in reaction
    ? { kind: "call", set: "", call: reaction.call, with: draftsOfArguments(reaction.with), original: reaction }
    : { kind: "set", set: reaction.set, from: reaction.from ?? "", call: "", original: reaction };
}

/**
 * Prefill from a RESOLVED (validated) view model — the editor's starting
 * point. Resolve put every default write-back FIRST under its event
 * (`withDefaultReactions`); the form shows it as the default, not as a row,
 * so a leading one is left out of the drafts.
 */
export function valuesFromViewModel(
  definition: AnyWidgetDefinition,
  viewModel: unknown,
  predicates: PredicateRegistry = STANDARD_PREDICATES,
): WidgetFormValues {
  const vm = (viewModel ?? {}) as Record<string, unknown>;
  const inputs = (vm["inputs"] ?? {}) as Record<string, unknown>;
  const paths = Object.fromEntries(
    Object.entries(inputs).flatMap(([port, path]) => (typeof path === "string" ? [[port, path] as const] : [])),
  );
  const events = definition.events as WidgetEvents;
  const reactions = Object.fromEntries(
    Object.entries((vm["on"] ?? {}) as EventBindings).flatMap(([event, list]) => {
      const declared = events[event];
      const fallback = declared === undefined ? undefined : defaultReaction(declared, inputs);
      const [first, ...rest] = list ?? [];
      const configured =
        first !== undefined && fallback !== undefined && sameReaction(first, fallback) ? rest : (list ?? []);
      return configured.length > 0 ? [[event, configured.map(draftOf)]] : [];
    }),
  );
  const settings = Object.fromEntries(
    settingFields(definition.viewModel).flatMap((field) => {
      const value = vm[field.name];
      if (value === undefined || value === null) return [];
      return [[field.name, field.kind === "boolean" ? value === true : String(value)]];
    }),
  );
  // The one cast: the widget's own schema parsed the view model, `when`, `appear` and `disappear` included.
  const { when, appear, disappear } = vm as { when?: When; appear?: Appearance; disappear?: Appearance };
  return {
    paths,
    reactions,
    conditions: draftsOfWhen(when, predicates),
    appear: appear ?? "",
    disappear: disappear ?? "",
    settings,
  };
}

/** The write-back an event does by default, with the port's path as the form holds it now. */
export function writeBackOf(event: EventDefinition, paths: Record<string, string>): WriteBack | undefined {
  if (event.writesBack === undefined) return undefined;
  return {
    port: event.writesBack,
    path: paths[event.writesBack]?.trim() ?? "",
    ...(event.primary === undefined ? {} : { from: event.primary }),
  };
}

/**
 * One reaction as the form now describes it. What the form does not show
 * (`with` of a call, `value` of a set) is kept while the user left the
 * reaction's target alone; undefined when the row is blank.
 */
export function editedReaction(reaction: ReactionField, original: Reaction | undefined): Reaction | undefined {
  if (reaction.kind === "call") {
    if (reaction.call === "") return undefined;
    // An action that declares parameters shows its whole `with`: what the
    // form holds is what is saved. One that declares none keeps a `with`
    // the form cannot show.
    if (reaction.params.length > 0) {
      return Object.keys(reaction.arguments).length > 0
        ? { call: reaction.call, with: reaction.arguments }
        : { call: reaction.call };
    }
    return original && "call" in original && original.call === reaction.call ? original : { call: reaction.call };
  }
  const set = reaction.set.trim();
  if (set === "") return undefined;
  const from = reaction.from.trim();
  if (original && "set" in original && original.set === set && (original.from ?? "") === from) return original;
  return from === "" ? { set } : { set, from };
}
