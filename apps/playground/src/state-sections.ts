/**
 * What the State panel shows, in SECTIONS — one editor each, so a page's
 * own data and views are read on their own and the global state is read as
 * what it is. A demo page sees NOTHING of another page: not its data, not
 * its views — only its own and what is global.
 *
 *  - a DEMO page: "This page" (the visit's own data roots — what starts
 *    over when the page opens), "This page's views" (the page's part of the
 *    configuration: its layouts, its reactions, the widget templates its
 *    cells point at, what every role says about it, the user's own copy),
 *    "Settings" (`app.settings`, the one global thing every page shares and
 *    changes) and "Session" (the rest of `app` — who is signed in, the
 *    permissions, the lists);
 *  - the builder: one editor with everything, data first.
 *
 * A section PICKS its part of the store's tree and MERGES an edited part
 * back into the whole tree, which the inspector hands to `store.replace`:
 * the layered store routes every root to its layer (boot.ts, APP_ROOTS).
 */
import {
  CONFIG_ROOTS,
  deletePath,
  getPath,
  isPlainObject,
  setPath,
  type PageBindings,
  type PageUserViewModel,
  type PageViewModel,
  type Templates,
  type UserViewModels,
  type ViewModels,
} from "@wirework/schema";
import { cellsWithin, type LayoutEngineRegistry, type WidgetRegistry } from "@wirework/engine";
import { APP_ROOTS } from "./boot";

export type StateObject = Record<string, unknown>;

export interface StateSection {
  key: string;
  title: string;
  /** One line under the title saying what lives here. */
  note: string;
  /** Lines of the editor. */
  rows: number;
  /** This section's part of the whole tree. */
  pick(state: StateObject): StateObject;
  /** The whole tree with this section's part replaced by `edited`. */
  merge(state: StateObject, edited: StateObject): StateObject;
}

/** What cutting a page's views out of the trees needs: the registries that know where a container holds a layout. */
export interface ViewsContext {
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
}

const SHARED = new Set<string>(APP_ROOTS);
const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };

const partition = (state: StateObject, keep: (key: string) => boolean): StateObject =>
  Object.fromEntries(Object.entries(state).filter(([key]) => keep(key)));

const appOf = (state: StateObject): StateObject => (state["app"] ?? {}) as StateObject;
const settingsOf = (state: StateObject): StateObject => (appOf(state)["settings"] ?? {}) as StateObject;
// The trees are the schema's: the inspector validates them before a replace (use-state-inspector).
const viewModelsOf = (state: StateObject): ViewModels =>
  isPlainObject(state["viewModels"]) ? (state["viewModels"] as unknown as ViewModels) : NO_VIEW_MODELS;
const userViewModelsOf = (state: StateObject): UserViewModels | undefined =>
  isPlainObject(state["userViewModels"]) ? (state["userViewModels"] as UserViewModels) : undefined;
const objectAt = (holder: unknown, key: string): StateObject | undefined => {
  const held = isPlainObject(holder) ? holder[key] : undefined;
  return isPlainObject(held) ? held : undefined;
};

/** The same tree, data roots before configuration roots (key order is display only). */
const dataFirst = (state: StateObject): StateObject => ({
  ...partition(state, (root) => !CONFIG_ROOTS.includes(root)),
  ...partition(state, (root) => CONFIG_ROOTS.includes(root)),
});

/** A record with ONE entry replaced — or removed, when the value is undefined. */
function withEntry<T>(record: Record<string, T> | undefined, key: string, value: T | undefined): Record<string, T> {
  const rest = Object.fromEntries(Object.entries(record ?? {}).filter(([held]) => held !== key));
  return value === undefined ? rest : { ...rest, [key]: value };
}

/** What every role says about the page — the role's entry cut down to this page (doc/roles-design.md). */
function rolesOf(viewModels: ViewModels, page: string): Record<string, UserViewModels> {
  return Object.fromEntries(
    Object.entries(viewModels.roles ?? {}).flatMap(([role, entry]) => {
      const held = entry.pages?.[page];
      return held === undefined ? [] : [[role, { pages: { [page]: held } }] as const];
    }),
  );
}

/**
 * The model paths the page's cells point at, in every layer: the page's
 * prebuilt layouts, the roles' layouts of it and the user's own — the cells
 * inside containers included (the same cut as the page file's).
 */
function modelsOf(
  { registry, layoutEngines }: ViewsContext,
  viewModels: ViewModels,
  userViewModels: UserViewModels | undefined,
  page: string,
): string[] {
  const templates = [
    ...Object.values(viewModels.pages[page] ?? {}),
    ...Object.values(rolesOf(viewModels, page)).flatMap((held) => Object.values(held.pages?.[page]?.templates ?? {})),
    ...Object.values(userViewModels?.pages?.[page]?.templates ?? {}),
  ];
  const models = templates.flatMap((template) => cellsWithin(registry, layoutEngines, viewModels, template));
  return [...new Set(models.map((cell) => cell.model))].sort();
}

/** The page's own views as the configuration's shape, but holding this page alone. */
function pickViews(context: ViewsContext, state: StateObject, page: string): StateObject {
  const viewModels = viewModelsOf(state);
  const userViewModels = userViewModelsOf(state);
  const on = viewModels.on?.[page];
  const roles = rolesOf(viewModels, page);
  const widgets = modelsOf(context, viewModels, userViewModels, page).reduce<StateObject>((tree, model) => {
    const held = getPath(viewModels, model);
    return isPlainObject(held) ? setPath(tree, model, held) : tree;
  }, {});
  const own = userViewModels?.pages?.[page];
  return {
    viewModels: {
      pages: withEntry({}, page, viewModels.pages[page]),
      widgets: widgets["widgets"] ?? {},
      ...(on === undefined ? {} : { on: { [page]: on } }),
      ...(Object.keys(roles).length === 0 ? {} : { roles }),
    },
    ...(own === undefined ? {} : { userViewModels: { pages: { [page]: own } } }),
  };
}

/**
 * The whole tree with this page's views replaced by the edited ones: its
 * layouts, its reactions, what every role says about it and the user's own
 * copy — then the widget templates its cells (as edited) point at, each one
 * taken from the edited tree or removed when the edit dropped it. A
 * template no cell of this page points at is not this page's and stays.
 */
function mergeViews(context: ViewsContext, state: StateObject, edited: StateObject, page: string): StateObject {
  const viewModels = viewModelsOf(state);
  const editedViewModels = objectAt(edited, "viewModels") ?? {};
  /** What the edit says about this page under a key of the configuration (`pages`, `on`, a role's `pages`). */
  const editedEntry = (holder: unknown, key: string): StateObject | undefined => objectAt(objectAt(holder, key), page);

  const editedRoles = objectAt(editedViewModels, "roles") ?? {};
  const roles = Object.fromEntries(
    [...new Set([...Object.keys(viewModels.roles ?? {}), ...Object.keys(editedRoles)])].flatMap((role) => {
      const base = viewModels.roles?.[role] ?? {};
      const pages = withEntry(
        base.pages,
        page,
        editedEntry(editedRoles[role], "pages") as PageUserViewModel | undefined,
      );
      const entry: UserViewModels = { ...base, ...(Object.keys(pages).length === 0 ? {} : { pages }) };
      if (Object.keys(pages).length === 0) delete entry.pages;
      // A role left with nothing to say is gone — a role nobody configures is not a role.
      return Object.keys(entry).length === 0 ? [] : [[role, entry] as const];
    }),
  );
  const on = withEntry(viewModels.on, page, editedEntry(editedViewModels, "on") as PageBindings | undefined);
  const next: ViewModels = {
    ...viewModels,
    pages: withEntry(
      viewModels.pages,
      page,
      editedEntry(editedViewModels, "pages") as Templates<PageViewModel> | undefined,
    ),
    on,
    roles,
  };
  if (Object.keys(on).length === 0) delete next.on;
  if (Object.keys(roles).length === 0) delete next.roles;

  const userViewModels = userViewModelsOf(state);
  const own = editedEntry(objectAt(edited, "userViewModels"), "pages") as PageUserViewModel | undefined;
  const nextUser: UserViewModels | undefined =
    userViewModels === undefined && own === undefined
      ? undefined
      : { ...userViewModels, pages: withEntry(userViewModels?.pages, page, own) };

  // The widget templates the page's cells point at NOW — a cell the edit added counts, one it removed does not.
  const editedWidgets = { widgets: objectAt(editedViewModels, "widgets") ?? {} };
  const withWidgets = modelsOf(context, next, nextUser, page).reduce<ViewModels>((tree, model) => {
    const held = getPath(editedWidgets, model);
    return held === undefined ? deletePath(tree, model) : setPath(tree, model, held);
  }, next);

  return {
    ...state,
    viewModels: withWidgets,
    ...(nextUser === undefined ? {} : { userViewModels: nextUser }),
  };
}

/** The sections of a DEMO page: its own data, its own views, then the global settings and session. */
export function demoStateSections(page: string, context: ViewsContext): readonly StateSection[] {
  return [
    {
      key: "page",
      title: "This page",
      note: "The visit's own data — it starts over every time the page opens. Nothing of another page is here.",
      rows: 14,
      pick: (state) => partition(state, (root) => !SHARED.has(root)),
      merge: (state, edited) => ({ ...partition(state, (root) => SHARED.has(root)), ...edited }),
    },
    {
      key: "views",
      title: "This page's views",
      note: "Its layouts, its reactions, the widget templates its cells point at, what every role says about it and your own copy (viewModels, userViewModels) — this page's alone.",
      rows: 12,
      pick: (state) => pickViews(context, state, page),
      merge: (state, edited) => mergeViews(context, state, edited, page),
    },
    {
      key: "settings",
      title: "Settings — global",
      note: "The user's settings (app.settings): the one thing every page shares and may change.",
      rows: 6,
      pick: settingsOf,
      merge: (state, edited) => ({ ...state, app: { ...appOf(state), settings: edited } }),
    },
    {
      key: "session",
      title: "Session — global",
      note: "Who is signed in, the permissions and the lists (the rest of app).",
      rows: 8,
      pick: (state) => partition(appOf(state), (key) => key !== "settings"),
      // The settings stay whatever this editor says about `app`.
      merge: (state, edited) => ({ ...state, app: { ...edited, settings: settingsOf(state) } }),
    },
  ];
}

export const builderStateSections: readonly StateSection[] = [
  {
    key: "all",
    title: "State",
    note: "The builder's whole store: the widgets' data first, the configuration after.",
    rows: 30,
    pick: dataFirst,
    merge: (_state, edited) => edited,
  },
];
