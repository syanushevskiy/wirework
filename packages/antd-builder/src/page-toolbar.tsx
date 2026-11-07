/**
 * Page toolbar — ONLY presentation (logic in @wirework/builder's
 * usePageToolbar): the engine of the shown template (a choice while the
 * page is empty), Edit / Save / Cancel with the pending count, the
 * user-overlay switch, the role edited for (doc/roles-design.md) and where
 * edits go. Every lock the hook reports as a code is said here in words —
 * the defaults below, or the host's own.
 */
import { Breadcrumb, Button, Checkbox, Flex, Select, Space, Tag, Typography } from "antd";
import type { EditLock, EditTarget, OverlayLock, PageToolbarState } from "@wirework/builder";

export interface PageToolbarTexts {
  /** Why the page cannot be edited, by reason. */
  editLocks: Record<EditLock, string>;
  /** Why the overlay cannot be turned on, by reason. */
  overlayLocks: Record<OverlayLock, string>;
  /** Where edits go, by target; `{role}` in the role's text is filled in. */
  targets: { base: string; user: string; role: string };
  /** The role choice's entry for no role: edits for everyone. */
  everyone: string;
}

export const DEFAULT_PAGE_TOOLBAR_TEXTS: PageToolbarTexts = {
  editLocks: {
    permission: "Your permissions do not include editing pages",
    loading: "Whether you may edit pages is not known yet",
  },
  overlayLocks: { "no-widgets": "Add a widget first — there is nothing to personalise yet" },
  targets: { base: "everyone", user: "me", role: "role: {role}" },
  everyone: "everyone",
};

/** The words for a target. */
const targetText = (target: EditTarget, texts: PageToolbarTexts): string =>
  target === "base"
    ? texts.targets.base
    : target === "user"
      ? texts.targets.user
      : texts.targets.role.replace("{role}", target.role);

export interface PageToolbarProps {
  toolbar: PageToolbarState;
  /** The words for the codes the hook reports; the defaults are English. */
  texts?: Partial<PageToolbarTexts> | undefined;
}

/** The role choice's value for "everyone": antd's Select has no value for nothing chosen. */
const EVERYONE = "";

export function PageToolbar({ toolbar, texts }: PageToolbarProps) {
  const words = { ...DEFAULT_PAGE_TOOLBAR_TEXTS, ...texts };
  const {
    crumbs,
    engineChoice,
    engine,
    hasPage,
    mode,
    editing,
    pendingChanges,
    editLock,
    overlay,
    overlayLock,
    target,
    roleChoice,
  } = toolbar;
  const last = crumbs.length - 1;

  return (
    <Flex wrap gap="small" align="center" data-testid="layout-toolbar" className="ww-builder-toolbar">
      {/* Inside a container (doc/containers-design.md): the way back up, a crumb per layout. */}
      {crumbs.length > 1 ? (
        <Breadcrumb
          data-testid="layout-crumbs"
          className="ww-builder-crumbs"
          items={crumbs.map((crumb, index) => ({
            title:
              index === last ? (
                <span data-testid="layout-crumb">{crumb.label}</span>
              ) : (
                <Button
                  type="link"
                  size="small"
                  data-testid="layout-crumb"
                  className="ww-builder-crumb"
                  onClick={() => toolbar.goTo?.(crumb.at)}
                >
                  {crumb.label}
                </Button>
              ),
          }))}
        />
      ) : null}
      <label htmlFor="engine-select">engine</label>
      {engineChoice ? (
        /* Free choice until the first widget is placed; then locked. */
        <Select
          id="engine-select"
          data-testid="engine-select"
          className="ww-builder-field"
          placeholder="choose an engine…"
          {...(engineChoice.chosen === undefined ? {} : { value: engineChoice.chosen })}
          onChange={toolbar.selectEngine}
          options={engineChoice.engines.map((name) => ({ value: name, label: name }))}
        />
      ) : (
        <Typography.Text code data-testid="engine">
          {engine ?? "—"}
        </Typography.Text>
      )}
      {hasPage ? (
        editing ? (
          <Space size="small">
            <Button size="small" type="primary" data-testid="page-save" onClick={toolbar.save}>
              Save page
            </Button>
            <Button size="small" data-testid="page-cancel" onClick={toolbar.cancel}>
              Cancel
            </Button>
          </Space>
        ) : (
          <Button
            size="small"
            data-testid="page-edit"
            disabled={editLock !== undefined}
            {...(editLock === undefined ? {} : { title: words.editLocks[editLock] })}
            onClick={toolbar.edit}
          >
            Edit page
          </Button>
        )
      ) : null}
      <Typography.Text type="secondary" data-testid="page-mode">
        {mode}
      </Typography.Text>
      {editing ? (
        <Typography.Text type="secondary" data-testid="pending-changes">
          {pendingChanges} change{pendingChanges === 1 ? "" : "s"}
        </Typography.Text>
      ) : null}
      {/* The reason a locked switch shows on hover: a title on the control's own wrapper (antd's checkbox keeps none). */}
      <span {...(overlayLock === undefined ? {} : { title: words.overlayLocks[overlayLock] })}>
        <Checkbox
          data-testid="toggle-user-overlay"
          checked={overlay}
          disabled={overlayLock !== undefined}
          onChange={(event) => toolbar.toggleOverlay(event.target.checked)}
        >
          user overlay
        </Checkbox>
      </span>
      {/* The role edited for (doc/roles-design.md): everyone, or one of the roles the host lists. */}
      {roleChoice ? (
        <>
          <label htmlFor="edit-role">for</label>
          <Select
            id="edit-role"
            data-testid="edit-role"
            className="ww-builder-field-narrow"
            size="small"
            value={roleChoice.chosen ?? EVERYONE}
            onChange={(value: string) => toolbar.selectRole?.(value === EVERYONE ? undefined : value)}
            options={[
              { value: EVERYONE, label: words.everyone },
              ...roleChoice.roles.map((role) => ({ value: role, label: role })),
            ]}
          />
        </>
      ) : null}
      <Tag data-testid="edit-target" className="ww-builder-toolbar-target">
        edits → {targetText(target, words)}
      </Tag>
    </Flex>
  );
}
