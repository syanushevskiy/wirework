/**
 * Page toolbar — ONLY presentation (logic in @wirework/builder's
 * usePageToolbar): the engine of the shown template (a choice while the
 * page is empty), Edit / Save / Cancel with the pending count, the
 * user-overlay switch and where edits go. Every lock the hook reports as a
 * code is said here in words — the defaults below, or the host's own.
 */
import { Button, Checkbox, Flex, Select, Space, Tag, Typography } from "antd";
import type { EditLock, EditTarget, OverlayLock, PageToolbarState } from "@wirework/builder";

export interface PageToolbarTexts {
  /** Why the page cannot be edited, by reason. */
  editLocks: Record<EditLock, string>;
  /** Why the overlay cannot be turned on, by reason. */
  overlayLocks: Record<OverlayLock, string>;
  /** Where edits go, by target. */
  targets: Record<EditTarget, string>;
}

export const DEFAULT_PAGE_TOOLBAR_TEXTS: PageToolbarTexts = {
  editLocks: {
    permission: "Your permissions do not include editing pages",
    loading: "Whether you may edit pages is not known yet",
  },
  overlayLocks: { "no-widgets": "Add a widget first — there is nothing to personalise yet" },
  targets: { user: "user overlay", base: "view models" },
};

export interface PageToolbarProps {
  toolbar: PageToolbarState;
  /** The words for the codes the hook reports; the defaults are English. */
  texts?: Partial<PageToolbarTexts> | undefined;
}

export function PageToolbar({ toolbar, texts }: PageToolbarProps) {
  const words = { ...DEFAULT_PAGE_TOOLBAR_TEXTS, ...texts };
  const { engineChoice, engine, hasPage, mode, editing, pendingChanges, editLock, overlay, overlayLock, target } =
    toolbar;

  return (
    <Flex wrap gap="small" align="center" data-testid="layout-toolbar" className="ww-builder-toolbar">
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
      <Tag data-testid="edit-target" className="ww-builder-toolbar-target">
        edits → {words.targets[target]}
      </Tag>
    </Flex>
  );
}
