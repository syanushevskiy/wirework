/**
 * ALL page-editing logic lives here (guidelines: render-only components):
 * ONE edit session per page, engine-agnostic.
 *
 * Session: "Edit page" opens a session; every move/resize (the engine's
 * change payload), widget edit and cell removal becomes a pure OP; the page
 * renders the store's CURRENT trees with the ops replayed on top (so an
 * inspector edit made meanwhile shows through — live rebase); Save commits
 * that replayed result, Cancel drops the ops. Nothing is written until Save.
 *
 * Edit target (doc/layout-engines-design.md, "Where edits go"):
 *  - "user": a page with the user overlay on — the demo as it opens, the
 *    builder once it holds a widget and the visitor turns the overlay on.
 *    Page-template ops edit what the user SEES: one of their own views in
 *    place, or a prebuilt one as a fresh copy named USER_PAGE_TEMPLATE (the
 *    first free "my-own", "my-own-2", …) that becomes the page view
 *    (doc/page-views-design.md); widget edits become per-cell settings
 *    overlays. The base view models stay untouched.
 *  - { role }: a ROLE's pages (doc/roles-design.md) — the same ops as the
 *    user's, written into `viewModels.roles.<role>` through `updateRole`:
 *    a prebuilt view edited becomes the role's own copy named after the
 *    role, a widget's edit the role's settings for that cell, a chosen
 *    widget template the role's `view` for it. The page shown is the page
 *    AS THAT ROLE SEES IT: the host resolves with the roles up to it and no
 *    user overlay.
 *  - "base": the overlay is off (how the builder opens). Ops rewrite the
 *    view models — the shared page.
 * The user overlay is ON exactly when the target is the user's.
 *
 * Engine ops never look inside a template: the registered plugin for the
 * template's engine applies the change, removes the cell, etc.
 *
 * The LOCATION (doc/containers-design.md): a session edits the page's
 * layout — or, `at` a chain of containers (`card-1`, `tabs-1/tabs.0.content`),
 * the layout INSIDE a container's widget template, shown as the page and
 * edited by the same ops. On the shared page the ops rewrite that template;
 * in a user's (or a role's) view they write that overlay's OWN copy of the
 * layout as the container's setting (`cells["card-1"].settings.default.content`),
 * and the cells inside are customised under their chain keys
 * (`cells["card-1/button"]`). Every op remembers where it was made, and the
 * editor closes when the target or the location moves under it — so a
 * session survives a change of `at`; a host still ends it first (save or
 * cancel), because a session left open locks Add on every layout.
 */
import { useCallback, useMemo, useState } from "react";
import {
  RESERVED_VIEW_MODEL_KEYS,
  deletePath,
  getPath,
  isPlainObject,
  setPath,
  settingFields,
  type AnyLayoutEngine,
  type PageViewModel,
  type UserViewModels,
  type ViewModels,
  type WidgetBindings,
} from "@wirework/schema";
import {
  cellsWithin,
  innerOverlaysAt,
  layoutPathAt,
  locateLayoutAt,
  overlayLayers,
  pageTemplates,
  removeUserCell,
  resolveTemplate,
  selectUserCellView,
  updateRole,
  updateUserCellSettings,
  updateUserLayoutAt,
  updateUserPageTemplate,
  updateWidgetTemplate,
  widgetTemplates,
  type ActionRegistry,
  type AppearanceRegistry,
  type LayoutEngineRegistry,
  type Overlays,
  type PredicateRegistry,
  type ResolvedCell,
  type WidgetRegistry,
} from "@wirework/engine";
import { usePagePlan } from "@wirework/react";
import { freeTemplateName } from "./page-views";
import { modelNamespaceOf, withEmptyLayouts, type BuilderNaming } from "./use-builder";
import type { Commit, EditableTrees } from "./use-commit";
import type { EditableCell } from "./use-widget-editor";
import { templateOf, type WidgetSettings } from "./form-drafts";

/** Where edits go: the shared page, a role's pages, or the user's own overlay. */
export type EditTarget = "user" | "base" | { role: string };

/** The widget templates a cell may use, the one it shows, and the choice — the overlay's `view` for the cell. */
export interface TemplateChoice {
  names: readonly string[];
  chosen: string;
  choose: (name: string) => void;
}

/** Name of the user's own copy of a prebuilt page template (the sketch's "my own" pill); numbered when taken. */
export const USER_PAGE_TEMPLATE = "my-own";

/** The role a target edits for, if it is one. */
export const roleOf = (target: EditTarget): string | undefined =>
  typeof target === "object" ? target.role : undefined;
/** Whether two targets are the same place. */
const sameTarget = (a: EditTarget, b: EditTarget): boolean =>
  a === b || (roleOf(a) !== undefined && roleOf(a) === roleOf(b));

/**
 * The OVERLAY a user or role target writes: how to read its entry out of
 * the trees and how to write it back — the one difference between the two,
 * so every op (here and in use-page-views) is written once.
 */
export interface OverlayTarget {
  read: (trees: EditableTrees) => UserViewModels;
  write: (trees: EditableTrees, update: (entry: UserViewModels) => UserViewModels) => EditableTrees;
  /** What a copy of a prebuilt view is named for this overlay: the user's "my-own", a role's own name. */
  copyName: string;
}

/** The overlay a target writes — none for the shared page. */
export const overlayTargetOf = (target: EditTarget): OverlayTarget | undefined => {
  if (target === "base") return undefined;
  if (target === "user") {
    return {
      read: (trees) => trees.userViewModels,
      write: (trees, update) => ({ ...trees, userViewModels: update(trees.userViewModels) }),
      copyName: USER_PAGE_TEMPLATE,
    };
  }
  const { role } = target;
  return {
    read: (trees) => trees.viewModels.roles?.[role] ?? {},
    write: (trees, update) => ({ ...trees, viewModels: updateRole(trees.viewModels, role, update) }),
    copyName: role,
  };
};

/**
 * Where an overlay-target page op lands: the shown view itself when it is
 * one of the overlay's own, else a free name for the copy it makes of the
 * shown prebuilt one.
 */
const ownTemplateFor = (overlay: OverlayTarget, trees: EditableTrees, layers: Overlays, page: string, shown: string) =>
  Object.hasOwn(overlay.read(trees).pages?.[page]?.templates ?? {}, shown)
    ? shown
    : freeTemplateName(overlay.copyName, Object.keys(pageTemplates(trees.viewModels, layers, page) ?? {}));

/**
 * What Save did: the session's changes were COMMITTED (and handed to the
 * host), there was nothing to commit (no session, or one that changed
 * nothing), or the permission REFUSED it — the session ends either way, and
 * the host decides what to say and whether to reload.
 */
export type SaveOutcome = "committed" | "unchanged" | "refused";

/** One pure edit, replayed onto the store's current trees on every render and on Save. */
type Op = (trees: EditableTrees) => EditableTrees;

export interface PageEditingInput {
  /** THE write path (use-commit): the session commits through it, never to a store itself. */
  commit: Commit;
  /**
   * Whether this user may change pages at all. Gating the BUTTON is not
   * enough: a session must not open, and must not commit, without it.
   * Required: a builder never assumes it may write.
   */
  canEdit: boolean;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  actions: ActionRegistry;
  /** The predicates a cell's `when` may name; the standard ones alone when absent. */
  predicates?: PredicateRegistry | undefined;
  /** The appearances a cell's `appear` and `disappear` may name; the standard ones alone when absent. */
  appearances?: AppearanceRegistry | undefined;
  page: string;
  /** The layout edited: the page's own when absent, else the one inside the containers chained here. */
  at?: string | undefined;
  /** Where edits go — and whether the user overlay is on: it is, exactly for the user's target. */
  target: EditTarget;
  /**
   * The roles the page is shown AS (doc/roles-design.md): the viewer's, in
   * the session's order — or, editing for a role, the application's roles
   * up to it. Their entries are read between the base and the user's overlay.
   */
  roles?: readonly string[] | undefined;
  trees: EditableTrees;
  /**
   * What a builder calls the things it creates (use-builder.ts) — and so
   * where its widget templates live: removing the last cell that uses one
   * takes the template with it, and "wrap in a container" makes one;
   * templates outside that namespace are the page author's and are never
   * touched.
   */
  naming: BuilderNaming;
}

/** A chain of names joined by "/": the nested page name (`demo/card-1`), a cell's overlay key (`card-1/button`). */
const chained = (...parts: (string | undefined)[]): string => parts.filter((part) => part !== undefined).join("/");

/** Keys the form owns: dropped from a base template before the form's values are re-applied. */
function withoutFormKeys(template: unknown, settingNames: string[]): Record<string, unknown> {
  const owned = new Set([...RESERVED_VIEW_MODEL_KEYS, ...settingNames]);
  return Object.fromEntries(Object.entries(isPlainObject(template) ? template : {}).filter(([key]) => !owned.has(key)));
}

export function usePageEditing({
  commit,
  canEdit,
  registry,
  layoutEngines,
  actions,
  predicates,
  appearances,
  page,
  at,
  target,
  roles,
  trees,
  naming,
}: PageEditingInput) {
  /** null = view mode; [] = an open session with nothing changed yet. */
  const [ops, setOps] = useState<Op[] | null>(null);
  /** The cell the editor is open on, with where it was opened: another target or location closes it. */
  const [selected, setSelected] = useState<{ cellId: string; target: EditTarget; at: string | undefined } | null>(null);
  const modelNamespace = modelNamespaceOf(naming);
  const overlayTarget = useMemo(() => overlayTargetOf(target), [target]);
  const withUserOverlay = target === "user";

  /** The store's current trees with the session's ops replayed — live rebase. */
  const shown = useMemo(() => (ops ?? []).reduce((current, op) => op(current), trees), [ops, trees]);
  const shownUserViewModels = withUserOverlay ? shown.userViewModels : undefined;
  /**
   * The layers a page is read through — the roles' entries, then the user's
   * overlay when it is on — from the trees given: the shown ones for the
   * plan, an op's source for the op, so an op edits exactly what is shown.
   */
  const layersOf = useCallback(
    (source: EditableTrees): Overlays =>
      overlayLayers(source.viewModels, roles, withUserOverlay ? source.userViewModels : undefined),
    [roles, withUserOverlay],
  );
  const shownOverlays = useMemo(() => layersOf(shown), [layersOf, shown]);
  /**
   * What the plan is made of: the page itself — or the layout `at` the
   * chain, shown AS a page under its nested name: the shared page's layout,
   * or through the overlays the one the viewer sees (their own copy, held as
   * the container's setting), with the inner cells' overlay entries under
   * their own ids. A chain that leads nowhere is a page without a template,
   * and the plan says so. The page keeps the user's overlay as such: that is
   * the way a broken overlay is checked and reported on the plan.
   */
  const layoutPage = chained(page, at);
  const planned = useMemo(() => {
    if (at === undefined) return { viewModels: shown.viewModels, userViewModels: shownUserViewModels, roles };
    const located = locateLayoutAt(layoutEngines, shown.viewModels, shownOverlays, page, at);
    // The boundary: a layout read out of a widget template is raw; the plan validates it as it does a page's.
    const template = located?.template as PageViewModel | undefined;
    const viewModels: ViewModels = {
      ...shown.viewModels,
      pages: { [layoutPage]: template === undefined ? {} : { default: template } },
    };
    return { viewModels, overlays: innerOverlaysAt(shownOverlays, page, at, layoutPage) };
  }, [at, shown.viewModels, shownUserViewModels, shownOverlays, roles, layoutEngines, page, layoutPage]);
  const plan = usePagePlan({ ...planned, page: layoutPage, registry, layoutEngines, actions, predicates, appearances });
  const activeView = plan.problem === undefined ? plan.view : undefined;
  const engine = plan.problem === undefined ? plan.engine : undefined;
  const cells = useMemo<readonly ResolvedCell[]>(() => (plan.problem === undefined ? plan.cells : []), [plan]);

  const editingCell = useMemo<EditableCell | undefined>(() => {
    if (!selected || !sameTarget(selected.target, target) || selected.at !== at) return undefined;
    const cell = cells.find((candidate) => candidate.key === selected.cellId);
    return cell?.definition ? { ...cell, definition: cell.definition } : undefined;
  }, [cells, selected, target, at]);

  /**
   * The SHOWN layout as the shared page holds it, found in `source`: the
   * page's own template, or the one at the chain inside a container — with
   * its engine, the raw template validated and its cells. Undefined when the
   * page does not resolve or the chain leads nowhere.
   */
  const locateShown = useCallback(
    (source: EditableTrees) => {
      const path =
        at === undefined
          ? activeView === undefined
            ? undefined
            : ["pages", page, activeView]
          : layoutPathAt(layoutEngines, source.viewModels, page, at);
      if (path === undefined) return undefined;
      const resolution = resolveTemplate(layoutEngines, getPath(source.viewModels, path));
      return resolution.problem === undefined ? { path, ...resolution } : undefined;
    },
    [at, activeView, page, layoutEngines],
  );

  /**
   * An op on the SHOWN layout, routed by target and location: the shared
   * page's template wherever it is (`locateShown`); an overlay's own copy of
   * the layout inside a container, as the container's setting; or the
   * overlay's own view of the page. The engine plugin of that template
   * applies the edit to the VALIDATED template.
   */
  const pageOp = useCallback(
    (edit: (engine: AnyLayoutEngine, template: PageViewModel) => PageViewModel): Op =>
      (source) => {
        if (overlayTarget === undefined) {
          const located = locateShown(source);
          if (located === undefined) return source;
          const edited = edit(located.engine, located.template);
          return { ...source, viewModels: setPath(source.viewModels, located.path, edited) };
        }
        const layers = layersOf(source);
        if (at !== undefined) {
          const located = locateLayoutAt(layoutEngines, source.viewModels, layers, page, at);
          const current = located === undefined ? undefined : resolveTemplate(layoutEngines, located.template);
          if (located === undefined || current === undefined || current.problem !== undefined) return source;
          const edited = edit(current.engine, current.template);
          return overlayTarget.write(source, (entry) => updateUserLayoutAt(entry, page, located, edited));
        }
        if (activeView === undefined) return source;
        const current = resolveTemplate(layoutEngines, pageTemplates(source.viewModels, layers, page)?.[activeView]);
        if (current.problem !== undefined) return source;
        const name = ownTemplateFor(overlayTarget, source, layers, page, activeView);
        // The overlay's own template is raw: validated by its engine before the edit, kept as it was if it fails.
        const edited = (raw: PageViewModel): PageViewModel => {
          const own = resolveTemplate(layoutEngines, raw);
          return own.problem === undefined ? edit(own.engine, own.template) : raw;
        };
        return overlayTarget.write(source, (entry) =>
          updateUserPageTemplate(entry, page, name, current.template, edited),
        );
      },
    [overlayTarget, locateShown, layersOf, at, activeView, page, layoutEngines],
  );

  /**
   * Every edit is gated the same way, whatever control triggered it: there
   * must be an open session, and this user must be allowed to edit. `push`
   * repeats the session check so that no op can ever land outside one.
   */
  const inSession = ops !== null;
  const mayEdit = inSession && canEdit;
  const push = useCallback((op: Op) => setOps((current) => (current ? [...current, op] : current)), []);

  /* ---- session ---- */

  const startEditing = useCallback(() => {
    if (!canEdit) return;
    setSelected(null);
    setOps([]);
  }, [canEdit]);
  const save = useCallback((): SaveOutcome => {
    // Gated here too: a session opened before the permission changed must
    // not be able to write after it. And only a session that CHANGED
    // something commits — an untouched one has nothing to ask the host to
    // persist (`ops` is `[]`, not null, while a session is open).
    let outcome: SaveOutcome;
    if (ops === null || ops.length === 0) outcome = "unchanged";
    else if (!canEdit) outcome = "refused";
    else {
      commit(shown);
      outcome = "committed";
    }
    setOps(null);
    setSelected(null);
    return outcome;
  }, [ops, canEdit, shown, commit]);
  const cancel = useCallback(() => {
    setOps(null);
    setSelected(null);
  }, []);

  /* ---- ops ---- */

  const changeLayout = useCallback(
    (change: unknown) => {
      if (!mayEdit) return;
      // The engine's own validator first: a payload that does not fit (a
      // renderer's bug, a host's) throws at the moment it is made and never
      // becomes an op — a session must not count a change that changes nothing.
      const plugin = engine === undefined ? undefined : layoutEngines.get(engine);
      if (!plugin) return;
      const checked: unknown = plugin.change.parse(change);
      push(pageOp((current, template) => current.applyChange(template, checked)));
    },
    [mayEdit, engine, layoutEngines, push, pageOp],
  );

  /** Every widget template a cell of the page references — in any view of any layer, down into its containers. */
  const referencedModels = useCallback(
    (source: EditableTrees): Set<string> => {
      const everyLayer = [...Object.values(source.viewModels.roles ?? {}), source.userViewModels];
      return new Set(
        Object.values(pageTemplates(source.viewModels, everyLayer, page) ?? {}).flatMap((raw) =>
          cellsWithin(registry, layoutEngines, source.viewModels, raw).map((cell) => cell.model),
        ),
      );
    },
    [registry, layoutEngines, page],
  );

  /** Builder-owned template maps an op stopped referencing — a removed cell's, a removed tab's — go with it. */
  const withoutOrphans = useCallback(
    (before: EditableTrees, after: EditableTrees): EditableTrees => {
      const kept = referencedModels(after);
      return [...referencedModels(before)]
        .filter((model) => model.startsWith(`${modelNamespace}.`) && !kept.has(model))
        .reduce((next, model) => ({ ...next, viewModels: deletePath(next.viewModels, model) }), after);
    },
    [referencedModels, modelNamespace],
  );

  const removeCellById = useCallback(
    (cellId: string) => {
      if (!mayEdit) return;
      setSelected((current) => (current?.cellId === cellId ? null : current));
      const key = chained(at, cellId);
      const remove = pageOp((plugin, template) => plugin.removeCell(template, cellId));
      // In an overlay's view the cell's entry would be dead config; on the shared page its templates would.
      push((source) =>
        overlayTarget === undefined
          ? withoutOrphans(source, remove(source))
          : overlayTarget.write(remove(source), (entry) => removeUserCell(entry, page, key)),
      );
    },
    [mayEdit, at, overlayTarget, page, withoutOrphans, pageOp, push],
  );

  /**
   * Wrap a cell in a CONTAINER (doc/containers-design.md, "Wrap in a card"):
   * one op on the shared page — a new container cell appended (tall) where
   * the layout puts it, its first layout the engine's empty one with the cell
   * inside, the cell gone from the layout it was in. The container's
   * template is builder-owned, named as a placed widget's. Base only: an
   * overlay's view cannot hold a template.
   */
  const wrapCell = useCallback(
    (cellId: string, widget: string) => {
      if (!mayEdit || overlayTarget !== undefined) return;
      const inside = registry.get(widget)?.contains?.[0];
      if (inside === undefined) return;
      setSelected(null);
      push((source) => {
        const located = locateShown(source);
        const wrapped = located?.cells.find((cell) => cell.id === cellId);
        if (!located || !wrapped) return source;
        const { path, engine, template } = located;
        const group = widgetTemplates(source.viewModels, modelNamespace) ?? {};
        const containerId = naming.cellId([...Object.keys(group), ...located.cells.map((cell) => cell.id)]);
        const model = `${modelNamespace}.${containerId}`;
        const container = { id: containerId, widget, model, template: naming.widgetTemplate };
        const outer = engine.appendCell(engine.removeCell(template, cellId), container, "tall");
        // The cell's four facts, never its placement: the new layout decides that.
        const { id, widget: kind, model: wrappedModel, template: wrappedTemplate } = wrapped;
        const inner = engine.appendCell(engine.empty(), {
          id,
          widget: kind,
          model: wrappedModel,
          template: wrappedTemplate,
        });
        const viewModels = setPath(source.viewModels, path, outer);
        return {
          ...source,
          viewModels: updateWidgetTemplate(viewModels, model, naming.widgetTemplate, () => ({ [inside]: inner })),
        };
      });
    },
    [mayEdit, overlayTarget, registry, modelNamespace, naming, locateShown, push],
  );

  /**
   * Save the editor's form into the cell's template. On the shared page a
   * container's edit may have ADDED a tab (its layout starts empty, on the
   * engine of the layout the cell is in) or REMOVED one (the templates of
   * the cells inside it go, as with a removed cell).
   */
  const saveWidget = useCallback(
    (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => {
      if (!mayEdit || cell.template === undefined) return;
      // An overlay carries SETTINGS only: a user's or a role's view never rewires
      // inputs or reactions (doc/layout-engines-design.md, "Where edits go").
      const overrides = overlayTarget === undefined ? templateOf(bindings, settings) : settings;
      const { model, template, key, definition } = cell;
      const overlayKey = chained(at, key);
      const settingNames = settingFields(definition.viewModel).map((field) => field.name);
      push((source) => {
        if (overlayTarget !== undefined) {
          // The form never shows a layout a container holds; the overlay's own copy of one stays with its settings.
          const kept = overlayTarget.read(source).pages?.[page]?.cells?.[overlayKey]?.settings?.[template] ?? {};
          const layouts = Object.fromEntries(
            Object.entries(kept).filter(([held]) => definition.contains?.includes(held)),
          );
          return overlayTarget.write(source, (entry) =>
            updateUserCellSettings(entry, page, overlayKey, template, { ...layouts, ...overrides }),
          );
        }
        const engine = locateShown(source)?.engine;
        const viewModels = updateWidgetTemplate(source.viewModels, model, template, (current) => {
          const merged = { ...withoutFormKeys(current, settingNames), ...overrides };
          return engine === undefined ? merged : withEmptyLayouts(definition, merged, engine);
        });
        return withoutOrphans(source, { ...source, viewModels });
      });
      setSelected(null);
    },
    [mayEdit, overlayTarget, at, page, locateShown, withoutOrphans, push],
  );

  /**
   * Choose a cell's widget TEMPLATE for the overlay (the user's or a role's
   * `view` for that cell, doc/roles-design.md): how an admin's table gets
   * its admin wiring without touching wiring. The shown cell changes at
   * once; the editor, keyed by the cell, reopens on the new template. Not
   * on the shared page: there the cell's own `template` is edited as
   * configuration.
   */
  const setCellView = useCallback(
    (cellId: string, view: string | undefined) => {
      if (!mayEdit || overlayTarget === undefined) return;
      const key = chained(at, cellId);
      push((source) => overlayTarget.write(source, (entry) => selectUserCellView(entry, page, key, view)));
    },
    [mayEdit, overlayTarget, at, page, push],
  );
  /** The templates the editing cell's widget has, for a ROLE's editor to choose from — undefined when there is nothing to choose. */
  const templateChoice = useMemo<TemplateChoice | undefined>(() => {
    const cell = editingCell;
    if (cell?.template === undefined || roleOf(target) === undefined) return undefined;
    const names = Object.keys(widgetTemplates(shown.viewModels, cell.model) ?? {});
    return names.length > 1
      ? { names, chosen: cell.template, choose: (name) => setCellView(cell.key, name) }
      : undefined;
  }, [editingCell, target, shown.viewModels, setCellView]);

  const selectCell = useCallback(
    (cellId: string) => {
      if (mayEdit) setSelected({ cellId, target, at });
    },
    [mayEdit, target, at],
  );
  const clearCell = useCallback(() => setSelected(null), []);

  return {
    plan,
    /** The name the shown layout renders under: the page's, or the nested one of a layout inside a container. */
    layoutPage,
    shownViewModels: shown.viewModels,
    shownUserViewModels,
    activeView,
    engine,
    cells,
    editing: inSession,
    /** Ops recorded in the open session (0 when nothing changed yet). */
    pendingChanges: ops?.length ?? 0,
    startEditing,
    save,
    cancel,
    changeLayout,
    removeCellById,
    wrapCell,
    editingCell,
    selectCell,
    clearCell,
    saveWidget,
    setCellView,
    templateChoice,
  };
}
