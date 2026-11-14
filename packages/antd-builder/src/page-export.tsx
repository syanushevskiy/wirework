/**
 * Page export — ONLY presentation (logic in @wirework/builder's
 * usePageExport): one button, "Export page…", and a panel under it with the
 * whole shared page as a JSON file to read and to download
 * (`<page>.page.json`), for an admin to hand to a developer
 * (doc/ADR/0011-pages-as-code.md). The lock the hook reports as a code is
 * said here in words — the defaults below, or the host's own.
 */
import { Button, Card, Flex, Input, Typography } from "antd";
import type { EditLock, PageExportState } from "@wirework/builder";
import { DEFAULT_PAGE_TOOLBAR_TEXTS } from "./page-toolbar";

export interface PageExportTexts {
  /** Why the page cannot be exported, by reason. */
  editLocks: Record<EditLock, string>;
  /** What the panel says the file is for. */
  note: string;
}

export const DEFAULT_PAGE_EXPORT_TEXTS: PageExportTexts = {
  editLocks: DEFAULT_PAGE_TOOLBAR_TEXTS.editLocks,
  note: "The whole shared page as one file — its views, what it loads, the widgets inside its cards and its address. Download it and send it to a developer, who puts it in the application's source. Your own views are not in it.",
};

export interface PageExportProps {
  export: PageExportState;
  /** The words for the codes the hook reports; the defaults are English. */
  texts?: Partial<PageExportTexts> | undefined;
}

export function PageExport({ export: state, texts }: PageExportProps) {
  const words = { ...DEFAULT_PAGE_EXPORT_TEXTS, ...texts };
  const { canExport, editLock, panel } = state;
  const lock = editLock === undefined ? undefined : words.editLocks[editLock];

  return (
    <div className="ww-builder-export" data-testid="page-export">
      {/* A locked button says why on hover: the reason on the control's own wrapper, like the toolbar's switch. */}
      <span {...(lock === undefined ? {} : { title: lock })}>
        <Button size="small" data-testid="page-export-open" disabled={!canExport} onClick={state.open}>
          Export page…
        </Button>
      </span>
      {panel ? (
        <Card
          size="small"
          className="ww-builder ww-builder-view-panel"
          data-testid="page-export-panel"
          title={`Export the page as ${panel.fileName}`}
        >
          <Flex vertical gap="small">
            <Typography.Paragraph type="secondary">{words.note}</Typography.Paragraph>
            <Input.TextArea
              data-testid="page-export-json"
              className="ww-builder-mono"
              rows={8}
              readOnly
              value={panel.text}
            />
            <Flex gap="small" justify="end">
              <Button data-testid="page-export-close" onClick={state.close}>
                Close
              </Button>
              <Button type="primary" data-testid="page-export-download" onClick={state.download}>
                Download {panel.fileName}
              </Button>
            </Flex>
          </Flex>
        </Card>
      ) : null}
    </div>
  );
}
