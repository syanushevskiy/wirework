/**
 * MIGRATIONS (doc/ADR/0017-versioning-and-upgrades.md): how a document
 * stored by an older version is read by this one. Every stored document
 * carries a format stamp (`versions`, a number per owner of shapes; absent
 * = 1); the packages and the host register small pure STEPS, one per format
 * change; and `upgradeTrees` — the ONE door — brings what a host loaded to
 * the current format before anything else sees it. After the door every
 * tree is current: the resolver, validation, the builder and the widgets
 * contain no version checks.
 *
 * A step says WHERE it applies and the door walks the trees, never the
 * step: a kind's SETTINGS (every template of every widget of that kind, and
 * the sparse settings an overlay holds for it), an engine's TEMPLATE (every
 * layout of that engine, a container's included), a CELL (a widget type
 * renamed), an ACTION call (its name, its arguments).
 *
 * Every step is pure, works on a PART (an overlay's settings hold only the
 * keys their user changed), is idempotent (run on current data it changes
 * nothing), and fails alone: a step that throws on one template leaves that
 * template as it was, reported at its place, and the rest goes on.
 *
 * A document from a NEWER format than this code knows, or one older than
 * the oldest step kept, is not read at all (`stampProblem`): it is handed
 * back untouched, with the reason — never guessed at, never overwritten.
 */
import {
  KEBAB_NAME,
  cellBaseSchema,
  formatStampSchema,
  getPath,
  isPlainObject,
  setPath,
  type FormatStamp,
  type UserViewModels,
  type ViewModels,
} from "@wirework/schema";
import { errorText } from "./messages";
import { RegistrationError } from "./named-registry";
import type { WidgetRegistry } from "./registry";

type Json = Record<string, unknown>;

/** `sparse`: an overlay's settings for a cell — only the keys somebody changed — not a whole template. */
export type SettingsStep = (settings: Json, context: { sparse: boolean }) => Json;

interface Step {
  /** Whose shape changes: `wirework`, `app`, a third party's own name. */
  owner: string;
  /** The format this step brings a document TO (from the one before): 2 or more. */
  to: number;
  /** What changed, for the changelog and the reader. */
  description?: string;
}

export type Migration = Step &
  (
    | { kind: string; settings: SettingsStep }
    | { engine: string; template: (template: Json) => Json }
    | { cell: (cell: Json) => Json }
    | { action: (reaction: Json) => Json }
  );

/** Identity helper for authoring a step with its type checked. */
export const defineMigration = (migration: Migration): Migration => migration;

/* -------------------------------- the verbs -------------------------------- */

/** A setting renamed. Where both are there the new one wins and the old one goes. */
export const rename =
  (from: string, to: string): SettingsStep =>
  ({ [from]: old, ...rest }) =>
    old === undefined || to in rest ? rest : { ...rest, [to]: old };

/** A setting that is no more. */
export const remove =
  (key: string): SettingsStep =>
  ({ [key]: _gone, ...rest }) =>
    rest;

/** A setting's value said another way — `change` must leave a value it already changed alone. */
export const mapValue =
  (key: string, change: (value: unknown) => unknown): SettingsStep =>
  (settings) =>
    key in settings ? { ...settings, [key]: change(settings[key]) } : settings;

/**
 * A DEFAULT changed for new templates only: the old value written into every
 * whole template that never said otherwise. An overlay's sparse settings are
 * left alone — they inherit.
 */
export const pinDefault =
  (key: string, value: unknown): SettingsStep =>
  (settings, { sparse }) =>
    sparse || key in settings ? settings : { ...settings, [key]: value };

/** A widget TYPE renamed (a cell's `widget`). */
export const renameWidget =
  (from: string, to: string) =>
  (cell: Json): Json =>
    cell["widget"] === from ? { ...cell, widget: to } : cell;

/** An ACTION renamed (a reaction's `call`). */
export const renameAction =
  (from: string, to: string) =>
  (reaction: Json): Json =>
    reaction["call"] === from ? { ...reaction, call: to } : reaction;

/* ------------------------------- the registry ------------------------------- */

export interface Migrations {
  register(migration: Migration): void;
  list(): readonly Migration[];
  /** The format this version WRITES, by owner: the newest step's — an owner without steps is at 1 and not listed. */
  current(): FormatStamp;
  /** The oldest format this version still READS, by owner — where a major dropped the steps before it. */
  oldest(): FormatStamp;
  /** Boot is over: the formats are what the pages are read by. */
  seal(): void;
}

export interface MigrationsOptions {
  /**
   * The oldest format still read, by owner: a document below it is not
   * migrated (the steps are gone) but kept and reported — the host brings
   * it forward with the release before.
   */
  oldest?: FormatStamp;
}

export function createMigrations({ oldest = {} }: MigrationsOptions = {}): Migrations {
  const steps: Migration[] = [];
  let sealed = false;
  const fail = (message: string): never => {
    throw new RegistrationError(message);
  };
  return {
    register(migration) {
      const { owner, to } = migration;
      const name = `Migration "${String(owner)}" to ${String(to)}`;
      if (typeof owner !== "string" || !KEBAB_NAME.test(owner)) fail(`${name}: the owner is not a kebab-case name`);
      if (!Number.isInteger(to) || to < 2) fail(`${name}: a step brings a document to format 2 or later`);
      if (to <= (oldest[owner] ?? 1)) fail(`${name}: this version reads "${owner}" from format ${oldest[owner]} on`);
      if (sealed) fail(`${name} cannot be registered: the registry is sealed (registration happens at boot)`);
      const targets = ["settings", "template", "cell", "action"].filter((target) => target in migration);
      if (targets.length !== 1) fail(`${name}: a step changes one thing — settings, a template, a cell or an action`);
      steps.push(migration);
    },
    list: () => [...steps],
    current: () =>
      steps.reduce<FormatStamp>(
        (formats, { owner, to }) => ({ ...formats, [owner]: Math.max(formats[owner] ?? 1, to) }),
        Object.fromEntries(Object.entries(oldest).filter(([, format]) => format > 1)),
      ),
    oldest: () => ({ ...oldest }),
    seal: () => {
      sealed = true;
    },
  };
}

/* -------------------------------- the stamp -------------------------------- */

const formatOf = (stamp: FormatStamp | undefined, owner: string): number => stamp?.[owner] ?? 1;

/**
 * Why a document with this stamp cannot be read by this version, or
 * undefined when it can: it was saved by a NEWER version (a rollback, a file
 * from a colleague on a newer build), or by one older than the oldest step
 * kept. Without a registry every owner is at format 1 — code that knows no
 * formats refuses every stamp above 1, which is what keeps it from
 * overwriting what it does not understand.
 */
export function stampProblem(versions: unknown, migrations?: Migrations): string | undefined {
  const parsed = formatStampSchema.safeParse(versions ?? {});
  if (!parsed.success) return "its format stamp (versions) is not a number per owner";
  const current = migrations?.current() ?? {};
  const oldest = migrations?.oldest() ?? {};
  const newer = Object.entries(parsed.data).find(([owner, format]) => format > formatOf(current, owner));
  if (newer !== undefined) {
    const [owner, format] = newer;
    return `saved by a newer version of the application (data format ${owner} ${format}; this version reads up to ${formatOf(current, owner)})`;
  }
  const older = Object.entries(oldest).find(([owner, format]) => formatOf(parsed.data, owner) < format);
  if (older !== undefined) {
    const [owner, format] = older;
    return `saved by a version too old to read here (data format ${owner} ${formatOf(parsed.data, owner)}; this version reads from ${format} on — bring it forward with the release before)`;
  }
  return undefined;
}

/** The document with the stamp this version writes — no `versions` at all while every owner is at format 1. */
export function stamped<T extends { versions?: FormatStamp | undefined }>(document: T, migrations?: Migrations): T {
  const { versions: old, ...rest } = document;
  const versions = Object.fromEntries(
    Object.entries({ ...old, ...migrations?.current() }).filter(([, format]) => format > 1),
  );
  if (Object.keys(versions).length === 0) return (old === undefined ? document : rest) as T;
  return JSON.stringify(old) === JSON.stringify(versions) ? document : ({ versions, ...rest } as T);
}

/* --------------------------------- the walk --------------------------------- */

const isCell = (value: unknown): value is Json => cellBaseSchema.safeParse(value).success;

/** Every plain object inside a value, the deepest first, passed to `map` and its result put back. */
function mapObjects(value: unknown, map: (object: Json) => Json): unknown {
  if (Array.isArray(value)) return value.map((item) => mapObjects(item, map));
  if (!isPlainObject(value)) return value;
  return map(Object.fromEntries(Object.entries(value).map(([key, held]) => [key, mapObjects(held, map)])));
}

/** Every cell inside a value, wherever its engine keeps it. */
function cellsIn(value: unknown): Json[] {
  if (Array.isArray(value)) return value.flatMap(cellsIn);
  if (!isPlainObject(value)) return [];
  return [...(isCell(value) ? [value] : []), ...Object.values(value).flatMap(cellsIn)];
}

/** The reactions under every `on` inside a value (`on: { <event>: [ … ] }`), each passed to `map`. */
function mapReactions(value: unknown, map: (reaction: Json) => Json): unknown {
  if (Array.isArray(value)) return value.map((item) => mapReactions(item, map));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, held]) => [
      key,
      key === "on" && isPlainObject(held) ? mapBindings(held, map) : mapReactions(held, map),
    ]),
  );
}

const mapBindings = (bindings: Json, map: (reaction: Json) => Json): Json =>
  Object.fromEntries(
    Object.entries(bindings).map(([event, reactions]) => [
      event,
      Array.isArray(reactions)
        ? reactions.map((reaction: unknown) => (isPlainObject(reaction) ? map(reaction) : reaction))
        : reactions,
    ]),
  );

/* --------------------------------- the door --------------------------------- */

export interface UpgradeInput {
  viewModels?: ViewModels | undefined;
  userViewModels?: UserViewModels | undefined;
}

export interface UpgradeOptions {
  migrations: Migrations;
  /** The widgets as registered NOW: what says which kind a cell's widget is. */
  registry: WidgetRegistry;
}

export interface Upgraded {
  viewModels?: ViewModels | undefined;
  userViewModels?: UserViewModels | undefined;
  /** Something was brought forward: a host that keeps its trees may persist them now. */
  changed: boolean;
  /** The steps that failed, each at its place: that template is as it was, the rest went on. */
  problems: readonly string[];
  /** A document that was NOT read, and why (`stampProblem`): handed back exactly as given — do not apply it, do not overwrite it. */
  unread: { viewModels?: string; userViewModels?: string };
}

type Attempt = <T>(location: string, value: T, change: (value: T) => T) => T;

/** What a document is read WITH: the shared tree its cells and templates live in, beside its own. */
interface Context {
  viewModels: ViewModels | undefined;
  /** A widget's kind, read through every rename still to come — the registry knows today's types only. */
  kindOf(widget: string): string;
}

/** The kinds of the widgets a model path's templates belong to, from every cell that points at it. */
function kindsByModel(documents: readonly unknown[], { kindOf }: Context): Map<string, Set<string>> {
  const kinds = new Map<string, Set<string>>();
  for (const cell of documents.flatMap(cellsIn)) {
    const model = String(cell["model"]);
    kinds.set(model, (kinds.get(model) ?? new Set()).add(kindOf(String(cell["widget"]))));
  }
  return kinds;
}

/**
 * The kinds of the cells of one page by their ID — the last step of the key
 * an overlay holds their settings under (`card-1/button`): the page's own
 * cells and, through the templates they point at, the cells inside its
 * containers.
 */
function kindsById(templates: readonly unknown[], context: Context): Map<string, Set<string>> {
  const kinds = new Map<string, Set<string>>();
  const seen = new Set<string>();
  let cells = templates.flatMap(cellsIn);
  while (cells.length > 0) {
    const inner: Json[] = [];
    for (const cell of cells) {
      const id = String(cell["id"]);
      kinds.set(id, (kinds.get(id) ?? new Set()).add(context.kindOf(String(cell["widget"]))));
      const model = String(cell["model"]);
      if (seen.has(model)) continue;
      seen.add(model);
      inner.push(...cellsIn(getPath(context.viewModels, model)));
    }
    cells = inner;
  }
  return kinds;
}

/** One format's steps over an OVERLAY entry (a user's, a role's): its own templates and its sparse cell settings. */
function upgradeOverlay(
  entry: Json,
  name: string,
  steps: readonly Migration[],
  context: Context,
  attempt: Attempt,
): Json {
  const pages = entry["pages"];
  if (!isPlainObject(pages)) return entry;
  const settingsSteps = steps.filter((step) => "settings" in step);
  const upgraded = Object.fromEntries(
    Object.entries(layoutsUpgraded(pages, name, steps, attempt) as Json).map(([page, held]) => {
      if (!isPlainObject(held) || settingsSteps.length === 0) return [page, held];
      const kinds = kindsById([context.viewModels?.pages?.[page], held["templates"]], context);
      const cellsUpgraded = (cells: unknown, at: string): unknown =>
        !isPlainObject(cells)
          ? cells
          : Object.fromEntries(
              Object.entries(cells).map(([key, cell]) => {
                const cellKinds = kinds.get(key.split("/").at(-1) ?? key);
                if (!isPlainObject(cell) || !isPlainObject(cell["settings"]) || cellKinds === undefined) {
                  return [key, cell];
                }
                const settings = Object.fromEntries(
                  Object.entries(cell["settings"]).map(([template, own]) => [
                    template,
                    isPlainObject(own)
                      ? settingsSteps
                          .filter((step) => cellKinds.has(step.kind))
                          .reduce(
                            (current, step) =>
                              attempt(`${at}.${key}.settings.${template}`, current, (value) =>
                                step.settings(value, { sparse: true }),
                              ),
                            own,
                          )
                      : own,
                  ]),
                );
                return [key, { ...cell, settings }];
              }),
            );
      const viewCells = held["viewCells"];
      return [
        page,
        {
          ...held,
          ...(held["cells"] === undefined
            ? {}
            : { cells: cellsUpgraded(held["cells"], `${name} pages.${page}.cells`) }),
          ...(isPlainObject(viewCells)
            ? {
                viewCells: Object.fromEntries(
                  Object.entries(viewCells).map(([view, cells]) => [
                    view,
                    cellsUpgraded(cells, `${name} pages.${page}.viewCells.${view}`),
                  ]),
                ),
              }
            : {}),
        },
      ];
    }),
  );
  return { ...entry, pages: upgraded };
}

/** The steps that need no context — a cell's, an engine's template's, an action call's — over everything inside a value. */
function layoutsUpgraded(value: unknown, name: string, steps: readonly Migration[], attempt: Attempt): unknown {
  const cellSteps = steps.filter((step) => "cell" in step);
  const templateSteps = steps.filter((step) => "template" in step);
  const actionSteps = steps.filter((step) => "action" in step);
  const structural =
    cellSteps.length + templateSteps.length === 0
      ? value
      : mapObjects(value, (object) => {
          const cell = isCell(object)
            ? cellSteps.reduce(
                (current, step) => attempt(`${name} cell "${String(object["id"])}"`, current, step.cell),
                object,
              )
            : object;
          return templateSteps
            .filter((step) => step.engine === cell["engine"])
            .reduce((current, step) => attempt(`${name} a "${step.engine}" layout`, current, step.template), cell);
        });
  return actionSteps.length === 0
    ? structural
    : mapReactions(structural, (reaction) =>
        typeof reaction["call"] !== "string"
          ? reaction
          : actionSteps.reduce(
              (current, step) => attempt(`${name} call "${String(reaction["call"])}"`, current, step.action),
              reaction,
            ),
      );
}

/** One format's steps over the SHARED tree: its layouts, its reactions, every widget template by its kind, every role's entry. */
function upgradeViewModels(tree: Json, steps: readonly Migration[], context: Context, attempt: Attempt): Json {
  const { on, roles, ...rest } = layoutsUpgraded(tree, "viewModels", steps, attempt) as Json;
  // The page's own reactions are bindings without an `on` key above them: `on.<page>.<event>`.
  const actionSteps = steps.filter((step) => "action" in step);
  const pageReactions = !isPlainObject(on)
    ? on
    : Object.fromEntries(
        Object.entries(on).map(([page, bindings]) => [
          page,
          isPlainObject(bindings)
            ? mapBindings(bindings, (reaction) =>
                typeof reaction["call"] !== "string"
                  ? reaction
                  : actionSteps.reduce(
                      (current, step) =>
                        attempt(`viewModels on.${page} call "${String(reaction["call"])}"`, current, step.action),
                      reaction,
                    ),
              )
            : bindings,
        ]),
      );
  let next: Json = {
    ...rest,
    ...(on === undefined ? {} : { on: pageReactions }),
    ...(roles === undefined ? {} : { roles }),
  };
  const here: Context = { ...context, viewModels: next as unknown as ViewModels };
  const settingsSteps = steps.filter((step) => "settings" in step);
  for (const [model, kinds] of settingsSteps.length === 0 ? [] : kindsByModel([next], here)) {
    const templates = getPath(next, model);
    if (!isPlainObject(templates)) continue;
    const upgraded = Object.fromEntries(
      Object.entries(templates).map(([name, template]) => [
        name,
        isPlainObject(template)
          ? settingsSteps
              .filter((step) => kinds.has(step.kind))
              .reduce(
                (current, step) =>
                  attempt(`viewModels ${model}.${name}`, current, (value) => step.settings(value, { sparse: false })),
                template,
              )
          : template,
      ]),
    );
    next = setPath(next, model, upgraded);
  }
  if (isPlainObject(roles)) {
    // A role's entry is an overlay inside the tree: its layouts were upgraded above, its sparse settings are here.
    const shared: Context = { ...here, viewModels: next as unknown as ViewModels };
    next = {
      ...next,
      roles: Object.fromEntries(
        Object.entries(roles).map(([role, entry]) => [
          role,
          isPlainObject(entry) ? upgradeOverlay(entry, `roles.${role}`, settingsSteps, shared, attempt) : entry,
        ]),
      ),
    };
  }
  return next;
}

/** The formats a document at `stamp` still has to go through, in order: each owner's, one by one. */
function formatsAhead(stamp: FormatStamp | undefined, migrations: Migrations): { owner: string; to: number }[] {
  return Object.entries(migrations.current()).flatMap(([owner, current]) =>
    Array.from({ length: Math.max(0, current - formatOf(stamp, owner)) }, (_, index) => ({
      owner,
      to: formatOf(stamp, owner) + index + 1,
    })),
  );
}

/**
 * THE DOOR. What a host loaded — the shared tree, a user's overlay, either
 * alone — brought to the format this version writes, stamped with it. Call
 * it where the trees are loaded, before they reach the store, and with
 * every file before it is merged in.
 *
 * A document that cannot be read (`unread`) comes back as it was given: the
 * host shows the page without it and never writes over it. An overlay is
 * read WITH the shared tree given beside it (its cells' widgets live there);
 * give both whenever both are at hand.
 */
export function upgradeTrees(input: UpgradeInput, { migrations, registry }: UpgradeOptions): Upgraded {
  const problems: string[] = [];
  const all = migrations.list();
  // A widget's kind through every rename there is: an old document names types the registry no longer has.
  const renames = all.filter((step) => "cell" in step);
  const kindOf = (widget: string): string => {
    const probe = { id: "probe", widget, model: "probe", template: "default" };
    const now = String(renames.reduce<Json>((cell, step) => step.cell(cell), probe)["widget"]);
    return registry.get(now)?.kind ?? now;
  };
  const stepsOf = ({ owner, to }: { owner: string; to: number }) =>
    all.filter((step) => step.owner === owner && step.to === to);
  const attemptAt =
    ({ owner, to }: { owner: string; to: number }): Attempt =>
    (location, value, change) => {
      try {
        return change(value);
      } catch (error) {
        problems.push(`${location}: migration to ${owner} format ${to} failed: ${errorText(error)}`);
        return value;
      }
    };

  const unread: Upgraded["unread"] = {};
  let changed = false;

  // What is not even an object is not the door's to read: validation says what is wrong with it.
  let viewModels = input.viewModels;
  if (isPlainObject(viewModels)) {
    const problem = stampProblem(viewModels.versions, migrations);
    if (problem !== undefined) unread.viewModels = problem;
    else {
      const ahead = formatsAhead(viewModels.versions, migrations);
      const upgraded = ahead.reduce<Json>(
        (tree, format) =>
          upgradeViewModels(tree, stepsOf(format), { viewModels: undefined, kindOf }, attemptAt(format)),
        viewModels as unknown as Json,
      ) as unknown as ViewModels;
      const next = stamped(upgraded, migrations);
      changed ||= ahead.length > 0;
      viewModels = next;
    }
  }

  let userViewModels = input.userViewModels;
  if (isPlainObject(userViewModels)) {
    const problem = stampProblem(userViewModels.versions, migrations);
    if (problem !== undefined) unread.userViewModels = problem;
    else {
      const ahead = formatsAhead(userViewModels.versions, migrations);
      // Read with the shared tree as it is NOW — current, unless it could not be read at all.
      const context: Context = { viewModels: unread.viewModels === undefined ? viewModels : undefined, kindOf };
      const upgraded = ahead.reduce<Json>(
        (entry, format) => upgradeOverlay(entry, "user", stepsOf(format), context, attemptAt(format)),
        userViewModels as Json,
      ) as UserViewModels;
      changed ||= ahead.length > 0;
      userViewModels = stamped(upgraded, migrations);
    }
  }

  return {
    ...(viewModels === undefined ? {} : { viewModels }),
    ...(userViewModels === undefined ? {} : { userViewModels }),
    changed,
    problems,
    unread,
  };
}
