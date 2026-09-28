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
 *    Page-template ops copy the shown template into the user's OWN template
 *    (USER_PAGE_TEMPLATE) and edit that; widget edits become per-cell
 *    settings overlays. The base view models stay untouched.
 *  - "base": the overlay is off (how the builder opens). Ops rewrite the
 *    view models — the shared page.
 *
 * Engine ops never look inside a template: the registered plugin for the
 * template's engine applies the change, removes the cell, etc.
 */
import { useCallback, useMemo, useState } from "react";
import {
  deletePath,
  settingFields,
  type AnyLayoutEngine,
  type PageViewModel,
  type WidgetBindings,
} from "@wirework/schema";
import {
  pageTemplates,
  problemText,
  removeUserCell,
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
import type { Commit, EditableTrees } from "./use-commit";
import type { EditableCell } from "./use-widget-editor";
import type { WidgetSettings } from "./use-widget-form";

export type EditTarget = "user" | "base";
/** Name of the user's own page template (the sketch's "my own" pill). */
export const USER_PAGE_TEMPLATE = "my-own";

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
  page: string;
  target: EditTarget;
  withUserOverlay: boolean;
  trees: EditableTrees;
  /**
   * Where a BUILDER's widget templates live (`modelNamespaceOf` in
   * use-builder.ts). Removing the last cell that uses one takes the template
   * with it; templates outside this namespace are the page author's and are
   * never touched.
   */
  modelNamespace: string;
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
    return resolution.problem === undefined && resolution.cells.some((cell) => cell.model === model);
  });
}

export function usePageEditing({
  commit,
  canEdit,
  registry,
  layoutEngines,
  actions,
  page,
  target,
  withUserOverlay,
  trees,
  modelNamespace,
}: PageEditingInput) {
  /** null = view mode; [] = an open session with nothing changed yet. */
  const [ops, setOps] = useState<Op[] | null>(null);
  const [selected, setSelected] = useState<{ cellId: string; target: EditTarget } | null>(null);

  /** The store's current trees with the session's ops replayed — live rebase. */
  const shown = useMemo(() => (ops ?? []).reduce((current, op) => op(current), trees), [ops, trees]);
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
  const cells = useMemo<readonly ResolvedCell[]>(() => (plan.problem === undefined ? plan.cells : []), [plan]);

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

  const removeCellById = useCallback(
    (cellId: string) => {
      if (!mayEdit) return;
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
          removed?.model.startsWith(`${modelNamespace}.`) &&
          !isModelReferenced(layoutEngines, next, page, removed.model)
        ) {
          // A builder-owned template map nobody references any more goes with it.
          next = { ...next, viewModels: deletePath(next.viewModels, removed.model) };
        }
        return next;
      });
    },
    [mayEdit, cells, target, page, layoutEngines, modelNamespace, pageOp, push],
  );

  const saveWidget = useCallback(
    (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => {
      if (!mayEdit || cell.template === undefined) return;
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
    [mayEdit, target, page, push],
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
