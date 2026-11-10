/**
 * The edit SESSION (guidelines: render-only components, logic in hooks):
 * ONE per page, engine-agnostic. "Edit page" opens it; every move/resize
 * (the engine's change payload), widget edit and cell removal becomes a
 * pure op (page-edits.ts); the page renders the store's CURRENT trees with
 * the ops replayed on top (so an inspector edit made meanwhile shows
 * through — live rebase); Save commits that replayed result, Cancel drops
 * the ops. Nothing is written until Save.
 *
 * What the ops do — the three targets, the location inside containers, how
 * the shared page and an overlay's own copy are written — is page-edits.ts;
 * this hook holds the state (the ops, the selected cell), resolves the plan
 * of the shown layout, gates every edit on the session and the permission,
 * and hands each op the context it is made from. Every op remembers where
 * it was made, and the editor closes when the target or the location moves
 * under it — so a session survives a change of `at`; a host still ends it
 * first (save or cancel), because a session left open locks Add on every
 * layout.
 */
import { useCallback, useMemo, useState } from "react";
import type { WidgetBindings } from "@wirework/schema";
import {
  widgetTemplates,
  type ActionRegistry,
  type AppearanceRegistry,
  type LayoutEngineRegistry,
  type PredicateRegistry,
  type ResolvedCell,
  type WidgetRegistry,
} from "@wirework/engine";
import { usePagePlan } from "@wirework/react";
import {
  chained,
  changeLayoutOp,
  plannedInput,
  removeCellOp,
  roleOf,
  sameTarget,
  saveWidgetOp,
  setCellViewOp,
  wrapCellOp,
  type EditContext,
  type EditLocation,
  type EditTarget,
  type Op,
} from "./page-edits";
import type { BuilderNaming } from "./use-builder";
import type { Commit, EditableTrees } from "./use-commit";
import type { EditableCell } from "./use-widget-editor";
import type { WidgetSettings } from "./form-drafts";

/** The widget templates a cell may use, the one it shows, and the choice — the overlay's `view` for the cell. */
export interface TemplateChoice {
  names: readonly string[];
  chosen: string;
  choose: (name: string) => void;
}

/**
 * What Save did: the session's changes were COMMITTED (and handed to the
 * host), there was nothing to commit (no session, or one that changed
 * nothing), or the permission REFUSED it — the session ends either way, and
 * the host decides what to say and whether to reload.
 */
export type SaveOutcome = "committed" | "unchanged" | "refused";

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

  /** The store's current trees with the session's ops replayed — live rebase. */
  const shown = useMemo(() => (ops ?? []).reduce((current, op) => op(current), trees), [ops, trees]);
  const where = useMemo<EditLocation>(
    () => ({ layoutEngines, page, at, target, roles }),
    [layoutEngines, page, at, target, roles],
  );
  const planned = useMemo(() => plannedInput(where, shown), [where, shown]);
  const plan = usePagePlan({ ...planned, registry, layoutEngines, actions, predicates, appearances });
  const activeView = plan.problem === undefined ? plan.view : undefined;
  const engine = plan.problem === undefined ? plan.engine : undefined;
  const cells = useMemo<readonly ResolvedCell[]>(() => (plan.problem === undefined ? plan.cells : []), [plan]);
  /** What every op is made from: the location, the widgets, the naming, and the view the shown layout resolved to. */
  const ctx = useMemo<EditContext>(
    () => ({ ...where, registry, naming, view: activeView }),
    [where, registry, naming, activeView],
  );

  const editingCell = useMemo<EditableCell | undefined>(() => {
    if (!selected || !sameTarget(selected.target, target) || selected.at !== at) return undefined;
    const cell = cells.find((candidate) => candidate.key === selected.cellId);
    return cell?.definition ? { ...cell, definition: cell.definition } : undefined;
  }, [cells, selected, target, at]);

  /**
   * Every edit is gated the same way, whatever control triggered it: there
   * must be an open session, and this user must be allowed to edit. `push`
   * repeats the session check so that no op can ever land outside one.
   */
  const inSession = ops !== null;
  const mayEdit = inSession && canEdit;
  const push = useCallback((op: Op | undefined) => {
    if (op !== undefined) setOps((current) => (current ? [...current, op] : current));
  }, []);

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

  /* ---- edits: gate, then the op (page-edits.ts) ---- */

  const changeLayout = useCallback(
    (change: unknown) => {
      if (!mayEdit) return;
      // The engine's own validator first: a payload that does not fit (a
      // renderer's bug, a host's) throws at the moment it is made and never
      // becomes an op — a session must not count a change that changes nothing.
      const plugin = engine === undefined ? undefined : layoutEngines.get(engine);
      if (plugin) push(changeLayoutOp(ctx, plugin.change.parse(change)));
    },
    [mayEdit, engine, layoutEngines, ctx, push],
  );

  const removeCellById = useCallback(
    (cellId: string) => {
      if (!mayEdit) return;
      setSelected((current) => (current?.cellId === cellId ? null : current));
      push(removeCellOp(ctx, cellId));
    },
    [mayEdit, ctx, push],
  );

  const wrapCell = useCallback(
    (cellId: string, widget: string) => {
      if (!mayEdit) return;
      const op = wrapCellOp(ctx, cellId, widget);
      if (op === undefined) return;
      setSelected(null);
      push(op);
    },
    [mayEdit, ctx, push],
  );

  const saveWidget = useCallback(
    (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => {
      if (!mayEdit || cell.template === undefined) return;
      push(saveWidgetOp(ctx, { ...cell, template: cell.template }, bindings, settings));
      setSelected(null);
    },
    [mayEdit, ctx, push],
  );

  const setCellView = useCallback(
    (cellId: string, view: string | undefined) => {
      if (mayEdit) push(setCellViewOp(ctx, cellId, view));
    },
    [mayEdit, ctx, push],
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
    /** What every op is made from — for a host whose builder places widgets for the same target (useBuilder's `context`). */
    context: ctx,
    /** The name the shown layout renders under: the page's, or the nested one of a layout inside a container. */
    layoutPage: chained(page, at),
    shownViewModels: shown.viewModels,
    shownUserViewModels: target === "user" ? shown.userViewModels : undefined,
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
