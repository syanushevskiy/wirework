/**
 * ALL page-export logic lives here (guidelines: render-only components):
 * the WHOLE shared page as one JSON file — its prebuilt views, what it
 * loads, the widgets its cells reference down into its cards, its route —
 * for an admin to download and hand to a developer, who puts it in the
 * application's source (doc/ADR/0011-pages-as-code.md, "Export page"). The
 * file is the engine's `pageFile`; nothing here is stored and nothing is
 * written: an export changes no tree, so it goes through no commit.
 *
 * It is the SHARED page that travels, never the user's overlay: a user's
 * own view is theirs, not the application's. Exporting is gated like Edit
 * page — by `editLock` — because it is an administrator's act: the page as
 * configuration, not as a user sees it.
 *
 * The panel (the JSON to read, the file to save) is state of this hook too,
 * so the component only renders it. Saving is a browser matter: the default
 * hands the text to the browser as a download; a host or a test gives its
 * own `save`.
 */
import { useCallback, useMemo, useState } from "react";
import type { PageRoute, ViewModels } from "@wirework/schema";
import {
  exportPageFile,
  pageFile,
  pageFileName,
  type LayoutEngineRegistry,
  type WidgetRegistry,
} from "@wirework/engine";
import type { EditLock } from "./locks";

export interface PageExportInput {
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** The SHARED tree — the page as the application has it. */
  viewModels: ViewModels;
  page: string;
  /** What the host's router says about the page, when it knows: written into the file. */
  route?: PageRoute | undefined;
  /** Why pages cannot be changed right now — then the page cannot be exported either. */
  editLock: EditLock | undefined;
  /** How the file reaches the person; the browser's download unless given. */
  save?: ((fileName: string, text: string) => void) | undefined;
}

/** The panel under the button: the file as text, and its name. */
export interface PageExportPanel {
  fileName: string;
  text: string;
}

/** Hand a text to the browser as a file to save: a blob behind a link, clicked. */
export function downloadTextFile(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function usePageExport({
  registry,
  layoutEngines,
  viewModels,
  page,
  route,
  editLock,
  save = downloadTextFile,
}: PageExportInput) {
  const file = useMemo(
    () => pageFile({ viewModels, registry, layoutEngines }, page, route),
    [viewModels, registry, layoutEngines, page, route],
  );
  const text = useMemo(() => (file === undefined ? undefined : exportPageFile(file)), [file]);
  const fileName = pageFileName(page);
  const canExport = editLock === undefined && text !== undefined;

  const [open, setOpen] = useState(false);
  const panel = useMemo<PageExportPanel | undefined>(
    () => (open && text !== undefined ? { fileName, text } : undefined),
    [open, text, fileName],
  );
  const openPanel = useCallback(() => {
    if (canExport) setOpen(true);
  }, [canExport]);
  const close = useCallback(() => setOpen(false), []);
  const download = useCallback(() => {
    if (canExport && text !== undefined) save(fileName, text);
  }, [canExport, text, save, fileName]);

  return { canExport, editLock, fileName, file, panel, open: openPanel, close, download };
}

export type PageExportState = ReturnType<typeof usePageExport>;
