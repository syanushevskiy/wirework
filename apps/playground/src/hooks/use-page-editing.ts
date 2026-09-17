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
 *  - "user": the demo tab with the user overlay on. Page-template ops copy
 *    the shown template into the user's OWN template (USER_PAGE_TEMPLATE)
 *    and edit that; widget edits become per-cell settings overlays. The
 *    base view models stay untouched.
 *  - "base": everywhere else (the builder). Ops rewrite the view models.
 *
 * Engine ops never look inside a template: the registered plugin for the
 * template's engine applies the change, removes the cell, etc.
 */
import { useCallback, useMemo, useState } from "react";
import {
  settingFields,
  type AnyLayoutEngine,
  type PageViewModel,
  type Store,
  type UserViewModels,
  type ViewModels,
  type WidgetBindings,
} from "@wirework/schema";
import {
  pageTemplates,
  removeUserCell,
  removeWidgetModel,
  resolveTemplate,
  updatePageTemplate,
  updateUserCellSettings,
  updateUserPageTemplate,
  updateWidgetTemplate,
  type ActionRegistry,
  type LayoutEngineRegistry,
  type ResolvedCell,
  type WidgetRegistry,
} from "@wirework/engine";
import { usePagePlan } from "@wirework/react";
import type { EditableCell } from "./use-widget-editor";
import type { WidgetSettings } from "./use-widget-form";

export type EditTarget = "user" | "base";
/** Name of the user's own page template (the sketch's "my own" pill). */
export const USER_PAGE_TEMPLATE = "my-own";

/** Both editable trees, as they live in the store. */
export interface EditableTrees {
  viewModels: ViewModels;
  userViewModels: UserViewModels;
}

/** One pure edit, replayed onto the store's current trees on every render and on Save. */
type Op = (trees: EditableTrees) => EditableTrees;

export interface PageEditingInput {
  store: Store;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  actions: ActionRegistry;
  page: string;
  target: EditTarget;
  withUserOverlay: boolean;
  trees: EditableTrees;
}

/** Keys the form owns: dropped from a base template before the form's values are re-applied. */
function withoutFormKeys(template: unknown, settingNames: string[]): Record<string, unknown> {
  const owned = new Set(["inputs", "on", ...settingNames]);
  return Object.fromEntries(
    Object.entries((template ?? {}) as Record<string, unknown>).filter(([key]) => !owned.has(key)),
  );
}

const overridesOf = (bindings: WidgetBindings, settings: WidgetSettings): Record<string, unknown> => ({
  inputs: bindings.inputs,
  ...(Object.keys(bindings.on).length > 0 ? { on: bindings.on } : {}),
  ...settings,
});

/** True when any template of the page (base or user) still has a cell using `model`. */
function isModelReferenced(
  layoutEngines: LayoutEngineRegistry,
  trees: EditableTrees,
  page: string,
  model: string,
): boolean {
  return Object.values(pageTemplates(trees.viewModels, trees.userViewModels, page) ?? {}).some((raw) => {
    const resolution = resolveTemplate(layoutEngines, raw);
    return (
      resolution.problem === undefined &&
      resolution.engine.cells(resolution.template).some((cell) => cell.model === model)
    );
  });
}

export function usePageEditing({
  store,
  registry,
  layoutEngines,
  actions,
  page,
  target,
  withUserOverlay,
  trees,
}: PageEditingInput) {
  /** null = view mode; [] = an open session with nothing changed yet. */
  const [ops, setOps] = useState<Op[] | null>(null);
  const [selected, setSelected] = useState<{ cellId: string; target: EditTarget } | null>(null);

  /** The store's current trees with the session's ops replayed — live rebase. */
  const shown = useMemo(
    () => (ops ?? []).reduce((current, op) => op(current), trees),
    [ops, trees],
  );
  const shownUserViewModels = withUserOverlay ? shown.userViewModels : undefined;
  const plan = usePagePlan({
    viewModels: shown.viewModels,
    userViewModels: shownUserViewModels,
    page,
    registry,
    layoutEngines,
    actions,
  });
  const activeView = plan.problem === undefined ? plan.view : undefined;
  const engine = plan.problem === undefined ? plan.engine : undefined;
  const cells = useMemo<ResolvedCell[]>(() => (plan.problem === undefined ? plan.cells : []), [plan]);

  const editingCell = useMemo<EditableCell | undefined>(() => {
    // The form was prefilled under `selected.target`; a different target now
    // would misroute the save, so the editor simply closes.
    if (!selected || selected.target !== target) return undefined;
    const cell = cells.find((candidate) => candidate.key === selected.cellId);
    return cell?.definition ? { ...cell, definition: cell.definition } : undefined;
  }, [cells, selected, target]);

  /**
   * An op on the SHOWN page template, routed by target. The engine plugin
   * of that template applies the edit to the VALIDATED template.
   */
  const pageOp = useCallback(
    (edit: (engine: AnyLayoutEngine, template: PageViewModel) => PageViewModel): Op => {
      const view = activeView;
      const routing = target;
      const update = (raw: PageViewModel): PageViewModel => {
        const resolution = resolveTemplate(layoutEngines, raw);
        return resolution.problem !== undefined ? raw : edit(resolution.engine, resolution.template);
      };
      return (source) => {
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
            USER_PAGE_TEMPLATE,
            current.template,
            update,
          ),
        };
      };
    },
    [activeView, target, page, layoutEngines],
  );

  /** Ops apply only inside a session (chrome exists only in edit mode anyway). */
  const push = useCallback((op: Op) => setOps((current) => (current ? [...current, op] : current)), []);

  /**
   * Store dedups unchanged trees, so committing both is always safe.
   * `setConfig`: the view models are configuration, which `set` refuses —
   * only editors like this one may write them.
   */
  const commit = useCallback(
    (next: EditableTrees) => {
      store.setConfig("viewModels", next.viewModels);
      store.setConfig("userViewModels", next.userViewModels);
    },
    [store],
  );

  /* ---- session ---- */

  const startEditing = useCallback(() => {
    setSelected(null);
    setOps([]);
  }, []);
  const save = useCallback(() => {
    if (ops) commit(shown);
    setOps(null);
    setSelected(null);
  }, [ops, shown, commit]);
  const cancel = useCallback(() => {
    setOps(null);
    setSelected(null);
  }, []);

  /* ---- ops ---- */

  const changeLayout = useCallback(
    (change: unknown) => push(pageOp((plugin, template) => plugin.applyChange(template, change))),
    [push, pageOp],
  );

  const removeCellById = useCallback(
    (cellId: string) => {
      setSelected((current) => (current?.cellId === cellId ? null : current));
      const removed = cells.find((cell) => cell.key === cellId);
      const routing = target;
      const remove = pageOp((plugin, template) => plugin.removeCell(template, cellId));
      push((source) => {
        let next = remove(source);
        if (routing === "user") {
          // The cell's overlay entry would be dead config.
          next = { ...next, userViewModels: removeUserCell(next.userViewModels, page, cellId) };
        } else if (
          removed?.model.startsWith("widgets.custom.") &&
          !isModelReferenced(layoutEngines, next, page, removed.model)
        ) {
          // A builder-owned template nobody references any more goes with it.
          next = { ...next, viewModels: removeWidgetModel(next.viewModels, removed.model) };
        }
        return next;
      });
    },
    [cells, target, page, layoutEngines, pageOp, push],
  );

  const saveWidget = useCallback(
    (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => {
      if (cell.template === undefined) return;
      const routing = target;
      // The user overlay carries SETTINGS only: a user's view never rewires
      // inputs or reactions (doc/layout-engines-design.md, "Where edits go").
      const overrides = routing === "base" ? overridesOf(bindings, settings) : settings;
      const { model, template, key } = cell;
      const settingNames = settingFields(cell.definition.viewModel).map((field) => field.name);
      push((source) =>
        routing === "base"
          ? {
              ...source,
              viewModels: updateWidgetTemplate(source.viewModels, model, template, (current) => ({
                ...withoutFormKeys(current, settingNames),
                ...overrides,
              })),
            }
          : {
              ...source,
              userViewModels: updateUserCellSettings(source.userViewModels, page, key, template, overrides),
            },
      );
      setSelected(null);
    },
    [target, page, push],
  );

  const selectCell = useCallback((cellId: string) => setSelected({ cellId, target }), [target]);
  const clearCell = useCallback(() => setSelected(null), []);

  return {
    plan,
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
    editingCell,
    selectCell,
    clearCell,
    saveWidget,
  };
}
