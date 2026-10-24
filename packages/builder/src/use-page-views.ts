/**
 * ALL page-views logic lives here (guidelines: render-only components): the
 * list of a page's views — the team's prebuilt templates and the user's own
 * — which one is shown, choosing another, and the five things a user does
 * with views: Save as (a copy of the shown one under a new name), Rename
 * and Delete (their own only), Share (the shown one as a JSON file) and
 * Import (such a file, as a new view). doc/page-views-design.md.
 *
 * Writes follow the EDIT TARGET, like every other edit: with the overlay on
 * a new view is the user's own; with it off, a prebuilt one — that is how
 * an administrator ships alternatives. Choosing a view is a preference and
 * needs no permission; making, renaming, deleting and importing one change
 * a page and are gated by `editLock`, exactly like Edit page. Every write
 * goes through `commit`.
 *
 * The panel (a name to type, a JSON to read or paste) is state of this hook
 * too, so the component only renders it.
 */
import { useCallback, useMemo, useState } from "react";
import type { PageViewModel } from "@wirework/schema";
import {
  pageTemplates,
  putPageTemplate,
  putUserPageTemplate,
  removeUserPageTemplate,
  renameUserPageTemplate,
  resolveTemplate,
  selectUserPageView,
  type LayoutEngineRegistry,
} from "@wirework/engine";
import type { EditLock, ViewProblem, ViewsLock } from "./locks";
import {
  exportPageView,
  freeTemplateName,
  pageViewFile,
  pageViews,
  parsePageViewFile,
  templateNameProblem,
  type PageViewChoice,
} from "./page-views";
import type { Commit, EditableTrees, TreesChange } from "./use-commit";
import type { EditTarget } from "./use-page-editing";

/** What the panel under the list is for. */
export type PageViewPanelKind = "save-as" | "rename" | "import" | "share";

export interface PageViewPanel {
  kind: PageViewPanelKind;
  /** The name typed (Save as, Rename; optional on Import — the file's name otherwise). */
  name: string;
  /** The JSON: read-only on Share, pasted on Import. */
  text: string;
  /** Why the last submit was refused, until the next change. */
  problem?: ViewProblem;
}

export interface PageViewsInput {
  /** THE write path (use-commit): every change of a view commits through it. */
  commit: Commit;
  /** Why pages cannot be changed right now — then views cannot be made, renamed, deleted or imported either. */
  editLock: EditLock | undefined;
  layoutEngines: LayoutEngineRegistry;
  page: string;
  trees: EditableTrees;
  /** Where a new view goes: `"user"` makes it the user's own, `"base"` a prebuilt one. */
  target: EditTarget;
  /** The choice lives in the user overlay: with it off the page shows its default and nothing can be chosen. */
  withUserOverlay: boolean;
  /** The view the page resolved to (`plan.view`); undefined while the page does not resolve. */
  shown: string | undefined;
  /** Choosing, saving or deleting a view changes what is on screen: an open edit session ends. */
  cancelEditing: () => void;
}

export function usePageViews({
  commit,
  editLock,
  layoutEngines,
  page,
  trees,
  target,
  withUserOverlay,
  shown,
  cancelEditing,
}: PageViewsInput) {
  const views = useMemo(() => pageViews(trees, page), [trees, page]);
  const shownView = useMemo(() => views.find((view) => view.name === shown), [views, shown]);
  const taken = useMemo(() => views.map((view) => view.name), [views]);
  /** The shown template as its engine validated it — what a copy and a file are made of. */
  const shownTemplate = useMemo<PageViewModel | undefined>(() => {
    if (shown === undefined) return undefined;
    return resolveTemplate(layoutEngines, pageTemplates(trees.viewModels, trees.userViewModels, page)?.[shown])
      .template;
  }, [layoutEngines, trees, page, shown]);

  const viewsLock: ViewsLock | undefined = views.length === 0 ? "no-page" : withUserOverlay ? undefined : "overlay-off";
  const canManage = editLock === undefined;
  const canRename = canManage && shownView?.kind === "user";
  const canRemove = canRename;
  const canShare = shownTemplate !== undefined;

  const [panel, setPanel] = useState<PageViewPanel | undefined>(undefined);
  const close = useCallback(() => setPanel(undefined), []);

  const select = useCallback(
    (name: string) => {
      if (viewsLock !== undefined) return;
      cancelEditing();
      commit({ userViewModels: selectUserPageView(trees.userViewModels, page, name) });
    },
    [viewsLock, cancelEditing, commit, trees, page],
  );

  /** A new view, where the edit target says: the user's own (and shown at once) or a prebuilt one. */
  const put = useCallback(
    (name: string, template: PageViewModel): TreesChange =>
      target === "user"
        ? { userViewModels: putUserPageTemplate(trees.userViewModels, page, name, template) }
        : { viewModels: putPageTemplate(trees.viewModels, page, name, template) },
    [target, trees, page],
  );

  const openSaveAs = useCallback(() => {
    if (!canManage || shown === undefined) return;
    setPanel({ kind: "save-as", name: freeTemplateName(`${shown}-copy`, taken), text: "" });
  }, [canManage, shown, taken]);
  const openRename = useCallback(() => {
    if (!canRename || shown === undefined) return;
    setPanel({ kind: "rename", name: shown, text: "" });
  }, [canRename, shown]);
  const openImport = useCallback(() => {
    if (!canManage) return;
    setPanel({ kind: "import", name: "", text: "" });
  }, [canManage]);
  const openShare = useCallback(() => {
    if (shown === undefined || shownTemplate === undefined) return;
    setPanel({ kind: "share", name: shown, text: exportPageView(pageViewFile(page, shown, shownTemplate)) });
  }, [page, shown, shownTemplate]);

  const setName = useCallback((name: string) => {
    setPanel((current) => (current ? { kind: current.kind, name, text: current.text } : current));
  }, []);
  const setText = useCallback((text: string) => {
    setPanel((current) => (current ? { kind: current.kind, name: current.name, text } : current));
  }, []);

  /** What the open panel asks for, checked; a refusal stays on the panel, a success closes it. */
  const submit = useCallback(() => {
    if (!panel) return;
    const refuse = (problem: ViewProblem) => setPanel({ ...panel, problem });
    if (panel.kind === "share") return close();
    if (!canManage) return refuse({ kind: "permission" });
    const name = panel.name.trim();
    if (panel.kind === "rename") {
      if (shown === undefined || !canRename) return refuse({ kind: "no-view" });
      const problem = templateNameProblem(name, taken);
      if (problem) return refuse(problem);
      commit({ userViewModels: renameUserPageTemplate(trees.userViewModels, page, shown, name) });
      return close();
    }
    if (panel.kind === "save-as") {
      if (shownTemplate === undefined) return refuse({ kind: "no-view" });
      const problem = templateNameProblem(name, taken);
      if (problem) return refuse(problem);
      cancelEditing();
      commit(put(name, shownTemplate));
      return close();
    }
    const parsed = parsePageViewFile(panel.text, layoutEngines);
    if ("problem" in parsed) return refuse(parsed.problem);
    if (parsed.file.page !== page) return refuse({ kind: "other-page", page: parsed.file.page });
    const imported = name === "" ? parsed.file.name : name;
    const problem = templateNameProblem(imported, taken);
    if (problem) return refuse(problem);
    cancelEditing();
    commit(put(imported, parsed.file.template));
    return close();
  }, [
    panel,
    close,
    canManage,
    canRename,
    shown,
    shownTemplate,
    taken,
    commit,
    trees,
    page,
    cancelEditing,
    put,
    layoutEngines,
  ]);

  /** Delete the shown view (the user's own only): the page goes back to its default. */
  const remove = useCallback(() => {
    if (!canRemove || shown === undefined) return;
    cancelEditing();
    setPanel(undefined);
    commit({ userViewModels: removeUserPageTemplate(trees.userViewModels, page, shown) });
  }, [canRemove, shown, cancelEditing, commit, trees, page]);

  return {
    views,
    shown: shownView,
    viewsLock,
    editLock,
    canManage,
    canRename,
    canRemove,
    canShare,
    select,
    panel,
    openSaveAs,
    openRename,
    openImport,
    openShare,
    setName,
    setText,
    submit,
    remove,
    close,
  };
}

export type PageViewsState = ReturnType<typeof usePageViews>;
export type { PageViewChoice };
