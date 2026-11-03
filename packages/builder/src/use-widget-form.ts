/**
 * The widget form — shared by "Add widget" (builder) and "Edit widget"
 * (editor). Generic over a definition: one path field per input port, one
 * field per primitive setting — and for a NAMED LIST (a tabs widget's tabs,
 * a collapse's panels: entries with a key and a label) rows added, named
 * and removed, each entry's saved layout kept behind its row —, and per
 * event its REACTIONS — a list, in
 * the order they run, each either "set a store path from a payload field"
 * or "call a host action" (picked from the action registry), rows added
 * and removed at will. An event that writes back by default (a controlled
 * widget's `changed`) shows that default first, read-only, following the
 * port's path as the user types it; it needs no row. An event marked
 * `required` (it carries state and has no default) needs one filled row,
 * which gates submit exactly like a required port. An action that DECLARES
 * parameters (doc/actions-design.md) gets one field per parameter — objects
 * and lists as JSON — saved as the reaction's `with`; its required ones gate
 * submit too. The CONDITION under which the widget shows is a list of rows
 * too (form-when.ts): a path, a check picked by its phrase, the value it
 * takes, "when" or "unless" — every row must hold; a row whose value the
 * check refuses gates submit. `collect()` turns the drafts into bindings +
 * settings for the host to write into a template.
 *
 * What a row does not show survives a save while its target is unchanged:
 * the `value` of a `set`, the `with` of an action that declares no
 * parameters. A row identical to the event's default write-back is not
 * saved: the engine puts the default in place from the port's path, so a
 * copy would only go stale when the port moves.
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
  type Reaction,
  type Store,
  type WidgetBindings,
} from "@wirework/schema";
import {
  STANDARD_APPEARANCES,
  STANDARD_PREDICATES,
  compatibleStorePaths,
  sameReaction,
  type ActionRegistry,
  type AppearanceRegistry,
  type PredicateRegistry,
} from "@wirework/engine";
import {
  EMPTY_FORM,
  EMPTY_ITEM,
  EMPTY_REACTION,
  editedReaction,
  isBlank,
  itemDraftsOf,
  itemFieldsOf,
  itemsOf,
  nextParamValue,
  settingDraftOf,
  USE_DEFAULT,
  WHOLE_PAYLOAD,
  type Choice,
  type ItemDraft,
  type ParamDraft,
  type PortField,
  type ReactionDraft,
  type ReactionKind,
  type SettingDraft,
  type WidgetFormValues,
  type WidgetSettings,
} from "./form-drafts";
import { eventFieldsOf, type ActionParameters } from "./form-events";
import {
  CONSTRUCTOR,
  EMPTY_CONDITION,
  conditionFieldOf,
  editTree,
  emptyGroup,
  isAnyDraft,
  isExpressionDraft,
  isTreeDraft,
  predicateChoices,
  whenOfConditions,
  type ConditionField,
  type TestDraft,
  type TreeEdit,
} from "./form-when";

export interface WidgetFormInput {
  /** The widget the form is for — none while nothing is chosen. */
  definition: AnyWidgetDefinition | undefined;
  store: Store;
  actions: ActionRegistry;
  /** The checks a condition may pick (doc/conditions-design.md); the standard ones alone when absent. */
  predicates?: PredicateRegistry | undefined;
  /** The animations a conditional widget may pick; the standard ones alone when absent. */
  appearances?: AppearanceRegistry | undefined;
  /** What the form starts from (an editor: the placed widget's values); empty when absent. */
  initial?: WidgetFormValues | undefined;
}

/** Accepts any value: a condition may read a path of any shape. */
const ANY_VALUE = { parse: (value: unknown): unknown => value };

/** The appearances on offer: the registry's names, said in words. */
const appearChoicesOf = (appearances: AppearanceRegistry): Choice[] =>
  appearances.keys().map((name) => ({ value: name, label: name.replaceAll("-", " ") }));

/** The event's rows with the one at `index` replaced — rows up to it created blank when it is past the end. */
function withRow(
  rows: readonly ReactionDraft[],
  index: number,
  change: (row: ReactionDraft) => ReactionDraft,
): ReactionDraft[] {
  const next = [...rows];
  while (next.length <= index) next.push(EMPTY_REACTION);
  next[index] = change(next[index] ?? EMPTY_REACTION);
  return next;
}

export function useWidgetForm({
  definition,
  store,
  actions,
  predicates = STANDARD_PREDICATES,
  appearances = STANDARD_APPEARANCES,
  initial = EMPTY_FORM,
}: WidgetFormInput) {
  const [paths, setPaths] = useState(initial.paths);
  const [reactions, setReactions] = useState(initial.reactions);
  const [conditionDrafts, setConditionDrafts] = useState(initial.conditions);
  const [settingValues, setSettingValues] = useState(initial.settings);
  const [itemValues, setItemValues] = useState(initial.items);
  const [appear, setAppear] = useState(initial.appear);
  const [disappear, setDisappear] = useState(initial.disappear);
  const appearChoices = useMemo(() => appearChoicesOf(appearances), [appearances]);
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

  /** The settings the form asks for: the primitive ones and the named lists (doc/containers-design.md). */
  const settingList = useMemo(() => (definition ? settingFields(definition.viewModel) : []), [definition]);
  /** The settings with the user's drafts — a named list's entries from the setting's default until the user touches them. */
  const settings = useMemo<SettingDraft[]>(
    () =>
      settingList.map((field) =>
        field.kind === "items"
          ? { ...field, value: "", items: itemFieldsOf(field, itemDraftsOf(field, itemValues[field.name])) }
          : settingDraftOf(field, settingValues),
      ),
    [settingList, settingValues, itemValues],
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
  /** Events the widget declares, each with its default write-back and its reaction rows. */
  const events = useMemo(
    () =>
      eventFieldsOf({ definition, paths, reactions, actions: actionList, kindChoices, actionChoices, parametersOf }),
    [definition, paths, reactions, actionList, kindChoices, actionChoices, parametersOf],
  );

  /** The condition's rows as the form shows them: the value field from the chosen check, the sentence, the problem. */
  const conditions = useMemo<ConditionField[]>(
    () => conditionDrafts.map((draft, index) => conditionFieldOf(index, draft, predicates)),
    [conditionDrafts, predicates],
  );
  /** The predicates a condition may pick, by their phrase — the constructor last; a test inside a constructor picks from the rest. */
  const predicateOptions = useMemo(() => predicateChoices(predicates), [predicates]);
  const testChoices = useMemo(
    () => predicateOptions.filter((choice) => choice.value !== CONSTRUCTOR),
    [predicateOptions],
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
    setConditionDrafts([]);
    setAppear("");
    setDisappear("");
    setSettingValues({});
    setItemValues({});
  }, []);

  /** Another condition row, blank, after the ones there: every row must hold. */
  const addCondition = useCallback(() => {
    setConditionDrafts((prev) => [...prev, EMPTY_CONDITION]);
  }, []);

  /** The row at `index` goes; the ones after it move up. */
  const removeCondition = useCallback((index: number) => {
    setConditionDrafts((prev) => prev.filter((_row, at) => at !== index));
  }, []);

  /**
   * One field of one row. Choosing the CONSTRUCTOR as the check turns the
   * row into a tree to build step by step; choosing a check again turns it
   * back into a blank test. A member the form only shows is left alone.
   */
  const setCondition = useCallback(<K extends keyof TestDraft>(index: number, field: K, value: TestDraft[K]) => {
    setConditionDrafts((prev) =>
      prev.map((row, at) => {
        if (at !== index || isAnyDraft(row) || isExpressionDraft(row)) return row;
        if (field === "is" && value === CONSTRUCTOR) return isTreeDraft(row) ? row : { tree: emptyGroup() };
        if (isTreeDraft(row)) return field === "is" ? { ...EMPTY_CONDITION, is: String(value) } : row;
        return { ...row, [field]: value };
      }),
    );
  }, []);

  /** One step of building a constructor row's tree: a test's field, a group's join or negation, a part added or removed. */
  const editConstructor = useCallback((index: number, at: string, edit: TreeEdit) => {
    setConditionDrafts((prev) =>
      prev.map((row, here) => (here === index && isTreeDraft(row) ? { tree: editTree(row.tree, at, edit) } : row)),
    );
  }, []);

  /** Autocomplete source for a condition's path: every DATA path the store holds (a condition reads anything). */
  const conditionPaths = useCallback(() => compatibleStorePaths(store, ANY_VALUE), [store]);

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

  /** One change to a named list's entries — starting, the first time, from what the form shows: the setting's default. */
  const editItems = useCallback(
    (name: string, change: (items: readonly ItemDraft[]) => ItemDraft[]) => {
      const field = settingList.find((candidate) => candidate.name === name);
      if (!field) return;
      setItemValues((prev) => ({ ...prev, [name]: change(itemDraftsOf(field, prev[name])) }));
    },
    [settingList],
  );
  /** Another entry, blank, after the ones there. */
  const addItem = useCallback((name: string) => editItems(name, (items) => [...items, EMPTY_ITEM]), [editItems]);
  /** The entry at `index` goes — with the layout it held; the ones after it move up. */
  const removeItem = useCallback(
    (name: string, index: number) => editItems(name, (items) => items.filter((_item, at) => at !== index)),
    [editItems],
  );
  const setItemLabel = useCallback(
    (name: string, index: number, label: string) =>
      editItems(name, (items) => items.map((item, at) => (at === index ? { ...item, label } : item))),
    [editItems],
  );
  /** One of an entry's other fields (a panel's `open`). */
  const setItemValue = useCallback(
    (name: string, index: number, field: string, value: string | boolean) =>
      editItems(name, (items) =>
        items.map((item, at) => (at === index ? { ...item, values: { ...item.values, [field]: value } } : item)),
      ),
    [editItems],
  );
  /** What an entry's select answered — "use the default" means nothing chosen. */
  const chooseItemValue = useCallback(
    (name: string, index: number, field: string, choice: string) =>
      setItemValue(name, index, field, choice === USE_DEFAULT ? "" : choice),
    [setItemValue],
  );

  /** One field of one row; the row (and blank ones before it) is created on first touch. */
  const setReaction = useCallback(
    <K extends keyof ReactionDraft>(event: string, index: number, field: K, value: NonNullable<ReactionDraft[K]>) => {
      // No `from` in the starting draft: absent keeps the event's default.
      setReactions((prev) => ({
        ...prev,
        [event]: withRow(prev[event] ?? [], index, (row) => ({ ...row, [field]: value })),
      }));
    },
    [],
  );

  /** Another row under the event, blank, after the ones there. */
  const addReaction = useCallback((event: string) => {
    setReactions((prev) => ({ ...prev, [event]: [...(prev[event] ?? []), EMPTY_REACTION] }));
  }, []);

  /** The row at `index` goes; the ones after it move up. */
  const removeReaction = useCallback((event: string, index: number) => {
    setReactions((prev) => ({ ...prev, [event]: (prev[event] ?? []).filter((_row, at) => at !== index) }));
  }, []);

  /** What a payload-field dropdown answered — "whole payload" means no field. */
  const chooseFrom = useCallback(
    (event: string, index: number, choice: string) =>
      setReaction(event, index, "from", choice === WHOLE_PAYLOAD ? "" : choice),
    [setReaction],
  );

  /** One parameter of the action a row calls; undefined clears it (not set). */
  const setReactionParam = useCallback(
    (event: string, index: number, name: string, value: string | boolean | undefined) => {
      setReactions((prev) => ({
        ...prev,
        [event]: withRow(prev[event] ?? [], index, (row) => {
          const { [name]: _cleared, ...others } = row.with ?? {};
          return { ...row, kind: "call", with: value === undefined ? others : { ...others, [name]: value } };
        }),
      }));
    },
    [],
  );

  /** A click on a yes/no parameter moves it to its next answer. */
  const cycleParam = useCallback(
    (event: string, index: number, param: ParamDraft) =>
      setReactionParam(event, index, param.name, nextParamValue(param)),
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
    events.every((event) => !event.required || event.reactions.some((reaction) => reaction.filled)) &&
    // A chosen action must get what it asks for: required parameters, readable drafts.
    events.every((event) =>
      event.reactions.every(
        (reaction) =>
          reaction.kind !== "call" ||
          reaction.call === "" ||
          (reaction.argumentsError === undefined &&
            reaction.params.every((param) => !param.error && !(param.required && isBlank(param.value)))),
      ),
    ) &&
    settings.every((setting) => !setting.required || !isBlank(settingValues[setting.name])) &&
    // A named list keeps at least one entry, each with a label: the widget's schema asks for both.
    settings.every(
      (setting) =>
        setting.items === undefined ||
        (setting.items.length > 0 && setting.items.every((item) => item.label.trim() !== "")),
    ) &&
    // A condition row either saves something or is blank; one with only a path, only a check, a refused value or unreadable words is unfinished.
    conditions.every(
      (condition) => condition.saves !== undefined || (condition.path.trim() === "" && condition.is === ""),
    );

  /** Drafts -> bindings + settings. Blank rows and settings are omitted so defaults apply. */
  const collect = useCallback((): { bindings: WidgetBindings; settings: WidgetSettings } => {
    const inputs = Object.fromEntries(
      fields.flatMap((field) => (field.value.trim() === "" ? [] : [[field.name, field.value.trim()]])),
    );
    const on: EventBindings = Object.fromEntries(
      events.flatMap((event) => {
        const fallback: Reaction | undefined =
          event.writesBack === undefined || event.writesBack.path === ""
            ? undefined
            : event.writesBack.from === undefined
              ? { set: event.writesBack.path }
              : { set: event.writesBack.path, from: event.writesBack.from };
        const list = event.reactions.flatMap((reaction) => {
          const edited = editedReaction(reaction, reactions[event.name]?.[reaction.index]?.original);
          return edited === undefined || (fallback !== undefined && sameReaction(edited, fallback)) ? [] : [edited];
        });
        return list.length > 0 ? [[event.name, list]] : [];
      }),
    );
    const collected: WidgetSettings = Object.fromEntries(
      settings.flatMap((setting): [string, unknown][] => {
        if (setting.kind === "items") {
          return [[setting.name, itemsOf(setting, itemDraftsOf(setting, itemValues[setting.name]))]];
        }
        const raw = settingValues[setting.name];
        if (isBlank(raw)) return [];
        return [[setting.name, setting.kind === "number" ? Number(raw) : raw]];
      }),
    );
    const when = whenOfConditions(conditions);
    // An animation means nothing without a condition to play on: both are saved with one only, and only names the registry knows.
    const known = (name: string) => (when !== undefined && appearances.get(name) !== undefined ? name : undefined);
    const shown = known(appear);
    const gone = known(disappear);
    return {
      bindings: {
        inputs,
        on,
        ...(when === undefined ? {} : { when }),
        ...(shown === undefined ? {} : { appear: shown }),
        ...(gone === undefined ? {} : { disappear: gone }),
      },
      settings: collected,
    };
  }, [fields, events, reactions, settings, settingValues, itemValues, conditions, appear, disappear, appearances]);

  return {
    definition,
    fields,
    settings,
    events,
    conditions,
    predicateChoices: predicateOptions,
    testChoices,
    /** How the widget appears when its condition turns true and disappears when it turns false ("" = it simply shows / goes), and the list to pick from. */
    appear,
    disappear,
    appearChoices,
    setAppear,
    setDisappear,
    setPortPath,
    setSetting,
    chooseSetting,
    addItem,
    removeItem,
    setItemLabel,
    setItemValue,
    chooseItemValue,
    setReaction,
    addReaction,
    removeReaction,
    chooseFrom,
    setReactionParam,
    cycleParam,
    addCondition,
    removeCondition,
    setCondition,
    editConstructor,
    conditionPaths,
    suggestionsFor,
    valid,
    collect,
    reset,
  };
}

export type WidgetFormState = ReturnType<typeof useWidgetForm>;
