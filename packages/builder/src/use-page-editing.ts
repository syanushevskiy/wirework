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
 *  - "base": the overlay is off (how the builder opens). Ops rewrite the
 *    view models — the shared page.
 *
 * Engine ops never look inside a template: the registered plugin for the
 * template's engine applies the change, removes the cell, etc.
 *
 * The LOCATION (doc/containers-design.md): a session edits the page's
 * layout — or, `at` a chain of containers (`card-1`, `tabs-1/tabs.0.content`),
 * the layout INSIDE a container's widget template, shown as the page and
 * edited by the same ops. On the shared page the ops rewrite that template;
 * in a user's view they write the user's OWN copy of the layout as the
 * container's setting in the overlay (`cells["card-1"].settings.default.content`),
 * and the cells inside are customised under their chain keys
 * (`cells["card-1/button"]`). Every op remembers where it was made, so a
 * session survives a change of `at` — but a host ends it first (save or
 * cancel): a session left open locks Add on every layout.
 */
import { useCallback, useMemo, useState } from "react";
import {
  RESERVED_VIEW_MODEL_KEYS,
  deletePath,
  getPath,
  setPath,
  settingFields,
  type AnyLayoutEngine,
  type PageViewModel,
  type ViewModels,
  type WidgetBindings,
} from "@wirework/schema";
import {
  cellsWithin,
  innerOverlayAt,
  layoutPathAt,
  layoutsOf,
  locateLayoutAt,
  pageTemplates,
  problemText,
  removeUserCell,
  resolveTemplate,
  updatePageTemplate,
  updateUserCellSettings,
  updateUserLayoutAt,
  updateUserPageTemplate,
  updateWidgetTemplate,
  type ActionRegistry,
  type AppearanceRegistry,
  type LayoutEngineRegistry,
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

export type EditTarget = "user" | "base";
/** Name of the user's own copy of a prebuilt page template (the sketch's "my own" pill); numbered when taken. */
export const USER_PAGE_TEMPLATE = "my-own";

/**
 * Where a user-target page op lands: the shown view itself when it is one
 * of the user's own, else a free name for the copy it makes of the shown
 * prebuilt one.
 */
function userTemplateFor(trees: EditableTrees, page: string, shown: string): string {
  const own = trees.userViewModels.pages?.[page]?.templates ?? {};
  if (Object.hasOwn(own, shown)) return shown;
  return freeTemplateName(
    USER_PAGE_TEMPLATE,
    Object.keys(pageTemplates(trees.viewModels, trees.userViewModels, page) ?? {}),
  );
}

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
  target: EditTarget;
  withUserOverlay: boolean;
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

/** The nested page name of the layout `at` a chain under a page — what its cells emit and react as (NestedLayout). */
const layoutPageName = (page: string, at: string | undefined): string => (at === undefined ? page : `${page}/${at}`);

/** The four facts of a cell a layout engine is given to append — never its placement, which the layout decides. */
const bareCell = ({
  id,
  widget,
  model,
  template,
}: {
  id: string;
  widget: string;
  model: string;
  template: string;
}) => ({
  id,
  widget,
  model,
  template,
});

/** Keys the form owns: dropped from a base template before the form's values are re-applied. */
function withoutFormKeys(template: unknown, settingNames: string[]): Record<string, unknown> {
  const owned = new Set([...RESERVED_VIEW_MODEL_KEYS, ...settingNames]);
  return Object.fromEntries(
    Object.entries((template ?? {}) as Record<string, unknown>).filter(([key]) => !owned.has(key)),
  );
}

/** True when any template of the page (base or user), or a layout inside one of its containers, still has a cell using `model`. */
function isModelReferenced(
  registry: WidgetRegistry,
  layoutEngines: LayoutEngineRegistry,
  trees: EditableTrees,
  page: string,
  model: string,
): boolean {
  return Object.values(pageTemplates(trees.viewModels, trees.userViewModels, page) ?? {}).some((raw) =>
    cellsWithin(registry, layoutEngines, trees.viewModels, raw).some((cell) => cell.model === model),
  );
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
  withUserOverlay,
  trees,
  naming,
}: PageEditingInput) {
  /** null = view mode; [] = an open session with nothing changed yet. */
  const [ops, setOps] = useState<Op[] | null>(null);
  const [selected, setSelected] = useState<{ cellId: string; target: EditTarget } | null>(null);
  const modelNamespace = modelNamespaceOf(naming);

  /** The store's current trees with the session's ops replayed — live rebase. */
  const shown = useMemo(() => (ops ?? []).reduce((current, op) => op(current), trees), [ops, trees]);
  const shownUserViewModels = withUserOverlay ? shown.userViewModels : undefined;
  /**
   * What the plan is made of: the page itself — or the layout `at` the
   * chain, shown AS a page under its nested name: the shared page's layout,
   * or with the overlay on the one the user sees (their own copy, held as
   * the container's setting), with the inner cells' overlay entries under
   * their own ids. A chain that leads nowhere is a page without a template,
   * and the plan says so.
   */
  const layoutPage = layoutPageName(page, at);
  const planned = useMemo(() => {
    if (at === undefined) return { viewModels: shown.viewModels, userViewModels: shownUserViewModels };
    const located = locateLayoutAt(layoutEngines, shown.viewModels, shownUserViewModels, page, at);
    // The boundary: a layout read out of a widget template is raw; the plan validates it as it does a page's.
    const template = located?.template as PageViewModel | undefined;
    const viewModels: ViewModels = {
      ...shown.viewModels,
      pages: { [layoutPage]: template === undefined ? {} : { default: template } },
    };
    return { viewModels, userViewModels: innerOverlayAt(shownUserViewModels, page, at, layoutPage) };
  }, [at, shown.viewModels, shownUserViewModels, layoutEngines, page, layoutPage]);
  const plan = usePagePlan({
    viewModels: planned.viewModels,
    userViewModels: planned.userViewModels,
    page: layoutPage,
    registry,
    layoutEngines,
    actions,
    predicates,
    appearances,
  });
  const activeView = plan.problem === undefined ? plan.view : undefined;
  const engine = plan.problem === undefined ? plan.engine : undefined;
  const cells = useMemo<readonly ResolvedCell[]>(() => (plan.problem === undefined ? plan.cells : []), [plan]);

  const editingCell = useMemo<EditableCell | undefined>(() => {
    // The form was prefilled under `selected.target`; a different target now
    // would misroute the save, so the editor simply closes.
    if (!selected || selected.target !== target) return undefined;
    const cell = cells.find((candidate) => candidate.key === selected.cellId);
    return cell?.definition ? { ...cell, definition: cell.definition } : undefined;
  }, [cells, selected, target]);

  /**
   * An op on the SHOWN layout, routed by location and target: the layout
   * inside a container (the shared template, or the user's own copy as the
   * container's setting), the page's base template, or the user's own view.
   * The engine plugin of that template applies the edit to the VALIDATED
   * template.
   */
  const pageOp = useCallback(
    (edit: (engine: AnyLayoutEngine, template: PageViewModel) => PageViewModel): Op => {
      const view = activeView;
      const routing = target;
      const chain = at;
      const update = (raw: PageViewModel): PageViewModel => {
        const resolution = resolveTemplate(layoutEngines, raw);
        return resolution.problem !== undefined ? raw : edit(resolution.engine, resolution.template);
      };
      return (source) => {
        if (chain !== undefined) {
          const overlay = routing === "user" ? source.userViewModels : undefined;
          const located = locateLayoutAt(layoutEngines, source.viewModels, overlay, page, chain);
          // The same boundary as the plan's: the raw layout in the template, validated by `update`.
          const current = located?.template as PageViewModel | undefined;
          if (located === undefined || current === undefined) return source;
          return routing === "user"
            ? { ...source, userViewModels: updateUserLayoutAt(source.userViewModels, page, located, update(current)) }
            : { ...source, viewModels: setPath(source.viewModels, located.path, update(current)) };
        }
        if (view === undefined) return source;
        if (routing === "base") {
          return { ...source, viewModels: updatePageTemplate(source.viewModels, page, view, update) };
        }
        const current = resolveTemplate(
          layoutEngines,
          pageTemplates(source.viewModels, source.userViewModels, page)?.[view],
        );
        if (current.problem !== undefined) return source;
        return {
          ...source,
          userViewModels: updateUserPageTemplate(
            source.userViewModels,
            page,
            userTemplateFor(source, page, view),
            current.template,
            update,
          ),
        };
      };
    },
    [activeView, target, at, page, layoutEngines],
  );

  /** The shown layout's raw template in `source`, resolved — where a base op that needs more than one edit starts. */
  const locateShown = useCallback(
    (source: EditableTrees) => {
      const path =
        at === undefined
          ? activeView === undefined
            ? undefined
            : ["pages", page, activeView]
          : layoutPathAt(layoutEngines, source.viewModels, page, at);
      const resolution =
        path === undefined ? undefined : resolveTemplate(layoutEngines, getPath(source.viewModels, path));
      return path === undefined || resolution === undefined || resolution.problem !== undefined
        ? undefined
        : { path, engine: resolution.engine, template: resolution.template, cells: resolution.cells };
    },
    [at, activeView, page, layoutEngines],
  );

  /** A shown cell's key in the page's user overlay: its id — under the chain to its layout, inside a container. */
  const userCellKey = useCallback((cellId: string): string => (at === undefined ? cellId : `${at}/${cellId}`), [at]);

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
    const outcome: SaveOutcome = ops === null || ops.length === 0 ? "unchanged" : canEdit ? "committed" : "refused";
    if (outcome === "committed") commit(shown);
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
      // renderer's bug, a host's) is reported and never becomes an op — a
      // session must not count a change that changes nothing.
      const plugin = engine === undefined ? undefined : layoutEngines.get(engine);
      if (!plugin) return;
      let checked: unknown;
      try {
        checked = plugin.change.parse(change);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Layout change ignored: it does not fit the "${plugin.name}" engine — ${problemText(error)}`);
        return;
      }
      push(pageOp((current, template) => current.applyChange(template, checked)));
    },
    [mayEdit, engine, layoutEngines, push, pageOp],
  );

  /** The models of every cell inside a container cell's layouts — gone with the cell, or with a tab an edit removed. */
  const modelsInside = useCallback(
    (cell: ResolvedCell): string[] =>
      cell.definition && cell.viewModel !== undefined
        ? layoutsOf(cell.definition, cell.viewModel).flatMap((held) =>
            cellsWithin(registry, layoutEngines, trees.viewModels, held.template).map((inner) => inner.model),
          )
        : [],
    [registry, layoutEngines, trees.viewModels],
  );

  /** Builder-owned template maps nobody references any more go with the cells that used them. */
  const withoutOrphans = useCallback(
    (source: EditableTrees, models: readonly string[]): EditableTrees =>
      models.reduce(
        (next, model) =>
          model.startsWith(`${modelNamespace}.`) && !isModelReferenced(registry, layoutEngines, next, page, model)
            ? { ...next, viewModels: deletePath(next.viewModels, model) }
            : next,
        source,
      ),
    [modelNamespace, registry, layoutEngines, page],
  );

  const removeCellById = useCallback(
    (cellId: string) => {
      if (!mayEdit) return;
      setSelected((current) => (current?.cellId === cellId ? null : current));
      const removed = cells.find((cell) => cell.key === cellId);
      // The removed cell's model — and, for a container, the models of every cell inside it.
      const models = removed ? [removed.model, ...modelsInside(removed)] : [];
      const routing = target;
      const userKey = userCellKey(cellId);
      const remove = pageOp((plugin, template) => plugin.removeCell(template, cellId));
      push((source) => {
        const next = remove(source);
        // In a user's view the cell's overlay entry would be dead config; on the shared page its templates would.
        return routing === "user"
          ? { ...next, userViewModels: removeUserCell(next.userViewModels, page, userKey) }
          : withoutOrphans(next, models);
      });
    },
    [mayEdit, cells, target, page, userCellKey, modelsInside, withoutOrphans, pageOp, push],
  );

  /**
   * Wrap a cell in a CONTAINER (doc/containers-design.md, "Wrap in a card"):
   * one op on the shared page — a new container cell appended (tall) where
   * the layout puts it, its first layout the engine's empty one with the cell
   * inside, the cell gone from the layout it was in. The container's
   * template is builder-owned, named as a placed widget's. Base only: a
   * user's view cannot hold a template.
   */
  const wrapCell = useCallback(
    (cellId: string, widget: string) => {
      if (!mayEdit || target !== "base") return;
      const inside = registry.get(widget)?.contains?.[0];
      if (inside === undefined) return;
      setSelected(null);
      push((source) => {
        const located = locateShown(source);
        const wrapped = located?.cells.find((cell) => cell.id === cellId);
        if (!located || !wrapped) return source;
        const { path, engine, template } = located;
        const group = (getPath(source.viewModels, modelNamespace) as Record<string, unknown> | undefined) ?? {};
        const id = naming.cellId([...Object.keys(group), ...located.cells.map((cell) => cell.id)]);
        const container = { id, widget, model: `${modelNamespace}.${id}`, template: naming.widgetTemplate };
        const outer = engine.appendCell(engine.removeCell(template, cellId), container, "tall");
        const inner = engine.appendCell(engine.empty(), bareCell(wrapped));
        const viewModels = setPath(source.viewModels, path, outer);
        const containerPath = [...modelNamespace.split("."), id, naming.widgetTemplate];
        return { ...source, viewModels: setPath(viewModels, containerPath, { [inside]: inner }) };
      });
    },
    [mayEdit, target, registry, modelNamespace, naming, locateShown, push],
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
      const routing = target;
      // The user overlay carries SETTINGS only: a user's view never rewires
      // inputs or reactions (doc/layout-engines-design.md, "Where edits go").
      const overrides = routing === "base" ? templateOf(bindings, settings) : settings;
      const { model, template, key, definition } = cell;
      const userKey = userCellKey(key);
      const settingNames = settingFields(definition.viewModel).map((field) => field.name);
      const models = modelsInside(cell);
      push((source) => {
        if (routing !== "base") {
          // The form never shows a layout a container holds; the user's own copy of one stays with their settings.
          const kept = source.userViewModels.pages?.[page]?.cells?.[userKey]?.settings?.[template] ?? {};
          const layouts = Object.fromEntries(
            (definition.contains ?? []).flatMap((held) => (held in kept ? [[held, kept[held]] as const] : [])),
          );
          return {
            ...source,
            userViewModels: updateUserCellSettings(source.userViewModels, page, userKey, template, {
              ...layouts,
              ...overrides,
            }),
          };
        }
        const engine = locateShown(source)?.engine;
        const viewModels = updateWidgetTemplate(source.viewModels, model, template, (current) => {
          const merged = { ...withoutFormKeys(current, settingNames), ...overrides };
          return engine === undefined ? merged : withEmptyLayouts(definition, merged, engine);
        });
        return withoutOrphans({ ...source, viewModels }, models);
      });
      setSelected(null);
    },
    [mayEdit, target, page, userCellKey, modelsInside, locateShown, withoutOrphans, push],
  );

  const selectCell = useCallback(
    (cellId: string) => {
      if (mayEdit) setSelected({ cellId, target });
    },
    [mayEdit, target],
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
    editing: ops !== null,
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
  };
}
