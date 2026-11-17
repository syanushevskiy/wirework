/**
 * ALL page-import logic lives here (guidelines: render-only components):
 * the counterpart of `usePageExport` (doc/ADR/0011-pages-as-code.md, "Import
 * page"). An admin pastes — or picks — a page file another admin exported,
 * sees what it holds or why it is refused, and Import puts it in place of
 * the SHARED page: its views, what every role says about it, the widgets
 * its cells reference. The user's own views are not touched.
 *
 * The file is somebody else's: every check is the engine's `importPageFile`
 * (one page, this one, widget templates only, no new error), run on every
 * change of the text, so the button is offered only for a file that would
 * go in. The write is one commit, like every other change of a page. Gated
 * by `editLock` like Edit page and Export page.
 */
import { useCallback, useMemo, useState } from "react";
import { importPageFile, pageFileModels, type PageImportInput } from "@wirework/engine";
import type { EditLock } from "./locks";
import type { Commit } from "./use-commit";

export interface PageImportHookInput extends PageImportInput {
  page: string;
  /** THE write path (`useCommit`). */
  commit: Commit;
  /** Why pages cannot be changed right now — then a page cannot be imported either. */
  editLock: EditLock | undefined;
  /** An open edit session is of the page that is about to be replaced: it ends first. */
  cancelEditing?: (() => void) | undefined;
  /** The page was replaced: a host loads it again by its new configuration. */
  onImported?: (() => void) | undefined;
}

/** What a file that would go in holds, for the person to read before Import. */
export interface PageImportSummary {
  views: readonly string[];
  roles: readonly string[];
  /** How many widget templates the file brings, the ones nested in its cards among them. */
  widgets: number;
  warnings: readonly string[];
}

/** The panel under the button: the text given, and what it is — nothing yet, a refusal, or a summary. */
export interface PageImportPanel {
  text: string;
  problem?: string;
  summary?: PageImportSummary;
}

export function usePageImport({
  page,
  commit,
  editLock,
  cancelEditing,
  onImported,
  viewModels,
  registry,
  layoutEngines,
  actions,
  predicates,
  appearances,
  migrations,
  knownRoles,
}: PageImportHookInput) {
  const canImport = editLock === undefined;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const checked = useMemo(
    () =>
      !open || text.trim() === ""
        ? undefined
        : importPageFile(
            { viewModels, registry, layoutEngines, actions, predicates, appearances, migrations, knownRoles },
            page,
            text,
          ),
    [open, text, page, viewModels, registry, layoutEngines, actions, predicates, appearances, migrations, knownRoles],
  );

  const panel = useMemo<PageImportPanel | undefined>(() => {
    if (!open) return undefined;
    if (checked === undefined) return { text };
    if ("problem" in checked) return { text, problem: checked.problem };
    const { file, warnings } = checked;
    return {
      text,
      summary: {
        views: Object.keys(file.templates),
        roles: Object.keys(file.roles ?? {}),
        widgets: pageFileModels(file).length,
        warnings,
      },
    };
  }, [open, text, checked]);

  const openPanel = useCallback(() => {
    if (canImport) setOpen(true);
  }, [canImport]);
  const close = useCallback(() => {
    setOpen(false);
    setText("");
  }, []);
  /** A file picked from the disk is read as text into the same field a paste goes to. */
  const readFile = useCallback((file: Blob) => {
    void file.text().then(setText);
  }, []);
  const apply = useCallback(() => {
    if (!canImport || checked === undefined || "problem" in checked) return;
    cancelEditing?.();
    commit({ viewModels: checked.viewModels });
    close();
    onImported?.();
  }, [canImport, checked, cancelEditing, commit, close, onImported]);

  return { canImport, editLock, panel, open: openPanel, close, setText, readFile, apply };
}

export type PageImportState = ReturnType<typeof usePageImport>;
