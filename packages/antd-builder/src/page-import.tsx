/**
 * Page import — ONLY presentation (logic in @wirework/builder's
 * usePageImport): one button, "Import page…", and a panel under it where an
 * admin pastes a page file another admin exported — or picks it from the
 * disk — and reads what it holds, or why it is refused, before Import puts
 * it in place of the shared page (doc/ADR/0011-pages-as-code.md, "Import
 * page"). The lock the hook reports as a code is said here in words.
 */
import { Alert, Button, Card, Flex, Input, Typography, Upload } from "antd";
import type { EditLock, PageImportState } from "@wirework/builder";
import { DEFAULT_PAGE_TOOLBAR_TEXTS } from "./page-toolbar";

export interface PageImportTexts {
  /** Why a page cannot be imported, by reason. */
  editLocks: Record<EditLock, string>;
  /** What the panel says an import does. */
  note: string;
}

export const DEFAULT_PAGE_IMPORT_TEXTS: PageImportTexts = {
  editLocks: DEFAULT_PAGE_TOOLBAR_TEXTS.editLocks,
  note: "Paste a page file exported from this page — or choose it. Import replaces the whole shared page with it: its views, what every role sees and the widgets inside. Your own views are kept.",
};

export interface PageImportProps {
  import: PageImportState;
  /** The words for the codes the hook reports; the defaults are English. */
  texts?: Partial<PageImportTexts> | undefined;
}

const listed = (names: readonly string[]): string => (names.length === 0 ? "none" : names.join(", "));

export function PageImport({ import: state, texts }: PageImportProps) {
  const words = { ...DEFAULT_PAGE_IMPORT_TEXTS, ...texts };
  const { canImport, editLock, panel } = state;
  const lock = editLock === undefined ? undefined : words.editLocks[editLock];

  return (
    <div className="ww-builder-export" data-testid="page-import">
      <span {...(lock === undefined ? {} : { title: lock })}>
        <Button size="small" data-testid="page-import-open" disabled={!canImport} onClick={state.open}>
          Import page…
        </Button>
      </span>
      {panel ? (
        <Card
          size="small"
          className="ww-builder ww-builder-view-panel"
          data-testid="page-import-panel"
          title="Import a page file"
        >
          <Flex vertical gap="small">
            <Typography.Paragraph type="secondary">{words.note}</Typography.Paragraph>
            <Input.TextArea
              data-testid="page-import-json"
              className="ww-builder-mono"
              aria-label="Page file"
              rows={8}
              value={panel.text}
              onChange={(event) => state.setText(event.target.value)}
            />
            {panel.problem === undefined ? null : (
              <Alert type="error" showIcon data-testid="page-import-problem" message={panel.problem} />
            )}
            {panel.summary === undefined ? null : (
              <Alert
                type="info"
                showIcon
                data-testid="page-import-summary"
                message={`Views: ${listed(panel.summary.views)} · roles: ${listed(panel.summary.roles)} · widget templates: ${panel.summary.widgets}`}
                description={
                  panel.summary.warnings.length === 0 ? undefined : (
                    <ul data-testid="page-import-warnings">
                      {panel.summary.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )
                }
              />
            )}
            <Flex gap="small" justify="end">
              <Upload
                accept=".json,application/json"
                showUploadList={false}
                beforeUpload={(file) => {
                  state.readFile(file);
                  return false;
                }}
              >
                <Button data-testid="page-import-choose">Choose a file…</Button>
              </Upload>
              <Button data-testid="page-import-close" onClick={state.close}>
                Close
              </Button>
              <Button
                type="primary"
                data-testid="page-import-apply"
                disabled={panel.summary === undefined}
                onClick={state.apply}
              >
                Import
              </Button>
            </Flex>
          </Flex>
        </Card>
      ) : null}
    </div>
  );
}
