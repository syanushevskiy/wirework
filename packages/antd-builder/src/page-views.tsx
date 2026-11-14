/**
 * Page views — ONLY presentation (logic in @wirework/builder's
 * usePageViews): the list of a page's views grouped into the team's
 * PREBUILT ones, the held ROLES' (doc/ADR/0012-roles.md) and the user's own
 * (MINE), the shown one chosen, and the
 * five actions — Save as, Rename, Delete, Share, Import — with a panel
 * under the row for the name to type or the JSON to read or paste. Every
 * lock and every refusal the hook reports as a code is said here in words:
 * the defaults below, or the host's own.
 */
import { Alert, Button, Card, Flex, Input, Popconfirm, Select, Space, Tag, Typography } from "antd";
import type { EditLock, PageViewChoice, PageViewKind, PageViewsState, ViewProblem, ViewsLock } from "@wirework/builder";
import { DEFAULT_PAGE_TOOLBAR_TEXTS } from "./page-toolbar";

export interface PageViewTexts {
  /** The label beside a view's name, by kind. */
  kinds: Record<PageViewKind, string>;
  /** Why a view cannot be chosen, by reason. */
  viewsLocks: Record<ViewsLock, string>;
  /** Why views cannot be made, renamed, deleted or imported, by reason. */
  editLocks: Record<EditLock, string>;
  /** Why a submit was refused, by kind; `{name}`, `{page}` and `{detail}` are filled in. */
  problems: Record<ViewProblem["kind"], string>;
}

export const DEFAULT_PAGE_VIEW_TEXTS: PageViewTexts = {
  kinds: { base: "prebuilt", role: "role", user: "mine" },
  viewsLocks: {
    "overlay-off":
      "Turn the user overlay on to choose a view for yourself, or edit for a role to choose for it — editing for everyone, the page shows its default",
    "no-page": "This page has no views",
  },
  editLocks: DEFAULT_PAGE_TOOLBAR_TEXTS.editLocks,
  problems: {
    "empty-name": "Give the view a name",
    "dotted-name": "A view's name cannot contain a dot",
    "name-taken": 'There is already a view named "{name}"',
    "not-a-view": "This is not a Wirework page view: {detail}",
    "other-page": 'This view is for the page "{page}"',
    "invalid-template": "The layout cannot be used here: {detail}",
    permission: "Your permissions do not include editing pages",
    "no-view": "There is no view on screen to use",
  },
};

/** The words for a refusal, with the problem's own facts filled in. */
export function viewProblemText(problem: ViewProblem, texts: PageViewTexts): string {
  const facts: Record<string, string> = Object.fromEntries(
    Object.entries(problem).filter(([key]) => key !== "kind") as [string, string][],
  );
  return texts.problems[problem.kind].replace(/\{(\w+)\}/g, (match, key: string) => facts[key] ?? match);
}

const PANEL_TITLES: Record<NonNullable<PageViewsState["panel"]>["kind"], string> = {
  "save-as": "Save the view as",
  rename: "Rename the view",
  import: "Import a view",
  share: "Share the view",
};

const APPLY_LABELS: Record<NonNullable<PageViewsState["panel"]>["kind"], string> = {
  "save-as": "Save",
  rename: "Rename",
  import: "Import",
  share: "Close",
};

export interface PageViewsProps {
  views: PageViewsState;
  /** The words for the codes the hook reports; the defaults are English. */
  texts?: Partial<PageViewTexts> | undefined;
}

export function PageViews({ views, texts }: PageViewsProps) {
  const words = { ...DEFAULT_PAGE_VIEW_TEXTS, ...texts };
  const { shown, viewsLock, editLock, canManage, canRename, canRemove, canShare, panel } = views;
  const choiceLock = viewsLock === undefined ? undefined : words.viewsLocks[viewsLock];
  const manageLock = editLock === undefined ? undefined : words.editLocks[editLock];

  /** A role's view is labelled with the role: "role: admin". */
  const kindText = (view: PageViewChoice): string =>
    view.kind === "role" ? `${words.kinds.role}: ${view.role}` : words.kinds[view.kind];
  const option = (view: PageViewChoice) => ({
    value: view.name,
    // antd puts a string label into the option's title; a node needs the name given as one.
    title: view.name,
    label: (
      <span className="ww-builder-view-option">
        {view.name} <Tag className="ww-builder-view-kind">{kindText(view)}</Tag>
      </span>
    ),
  });
  const group = (kind: PageViewKind) => ({
    label: words.kinds[kind],
    title: words.kinds[kind],
    options: views.views.filter((view) => view.kind === kind).map(option),
  });

  return (
    <div className="ww-builder-views" data-testid="page-views">
      <Flex wrap gap="small" align="center">
        <label htmlFor="page-view-select">view</label>
        <span {...(choiceLock === undefined ? {} : { title: choiceLock })}>
          <Select
            id="page-view-select"
            data-testid="page-view-select"
            {...(shown === undefined ? {} : { "data-kind": shown.kind })}
            className="ww-builder-field"
            placeholder="choose a view…"
            disabled={viewsLock !== undefined}
            {...(shown === undefined ? {} : { value: shown.name })}
            onChange={views.select}
            options={[group("base"), group("role"), group("user")].filter((entry) => entry.options.length > 0)}
          />
        </span>
        {shown === undefined ? null : (
          <Typography.Text type="secondary" data-testid="page-view-kind">
            {kindText(shown)}
          </Typography.Text>
        )}
        {/* A locked button says why on hover: the reason on the control's own wrapper, like the toolbar's switch. */}
        <span {...(manageLock === undefined ? {} : { title: manageLock })}>
          <Space size="small">
            <Button
              size="small"
              data-testid="view-save-as"
              disabled={!canManage || !canShare}
              onClick={views.openSaveAs}
            >
              Save as…
            </Button>
            <Button size="small" data-testid="view-rename" disabled={!canRename} onClick={views.openRename}>
              Rename…
            </Button>
            <Popconfirm
              title="Delete this view?"
              description="The page goes back to its default view."
              okText="Delete view"
              cancelText="Keep it"
              disabled={!canRemove}
              onConfirm={views.remove}
            >
              <Button size="small" danger data-testid="view-delete" disabled={!canRemove}>
                Delete
              </Button>
            </Popconfirm>
            <Button size="small" data-testid="view-share" disabled={!canShare} onClick={views.openShare}>
              Share…
            </Button>
            <Button size="small" data-testid="view-import" disabled={!canManage} onClick={views.openImport}>
              Import…
            </Button>
          </Space>
        </span>
      </Flex>

      {panel ? (
        <Card
          size="small"
          className="ww-builder ww-builder-view-panel"
          data-testid="page-view-panel"
          data-panel={panel.kind}
          title={PANEL_TITLES[panel.kind]}
        >
          <Flex vertical gap="small">
            {panel.kind === "share" ? (
              <Typography.Paragraph type="secondary">
                Copy this text and hand it to a colleague: they import it under Import…
              </Typography.Paragraph>
            ) : null}
            {panel.kind === "share" ? null : (
              <label className="ww-builder-view-field">
                <span>{panel.kind === "import" ? "Name (the file's unless given)" : "Name"}</span>
                <Input
                  data-testid="view-name"
                  className="ww-builder-field"
                  value={panel.name}
                  onChange={(event) => views.setName(event.target.value)}
                  onPressEnter={views.submit}
                />
              </label>
            )}
            {panel.kind === "import" || panel.kind === "share" ? (
              <Input.TextArea
                data-testid="view-json"
                className="ww-builder-mono"
                rows={8}
                readOnly={panel.kind === "share"}
                value={panel.text}
                onChange={(event) => views.setText(event.target.value)}
              />
            ) : null}
            {panel.problem ? (
              <Alert type="error" showIcon data-testid="view-problem" title={viewProblemText(panel.problem, words)} />
            ) : null}
            <Flex gap="small" justify="end">
              {panel.kind === "share" ? null : (
                <Button data-testid="view-cancel" onClick={views.close}>
                  Cancel
                </Button>
              )}
              <Button type="primary" data-testid="view-apply" onClick={views.submit}>
                {APPLY_LABELS[panel.kind]}
              </Button>
            </Flex>
          </Flex>
        </Card>
      ) : null}
    </div>
  );
}
