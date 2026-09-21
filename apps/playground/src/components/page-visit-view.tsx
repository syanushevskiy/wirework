/**
 * The view of ONE page visit — ONLY presentation (guidelines: render-only
 * components). Left: the visit's state tree (editable) and the collapsed
 * diagnostics; right: the page toolbar, the builder or a widget editor when
 * they apply, and the live page. All logic lives in hooks/use-playground.ts
 * and hooks/use-page-editing.ts. The router keys this component by visit,
 * so every piece of UI state here starts over with the visit.
 */
import { Button, Checkbox, Flex, Select, Space, Tag, Typography } from "antd";
import { PageView } from "@wirework/react";
import type { PageVisit, Playground } from "../boot";
import { BUILDER_PAGE, usePlayground } from "../hooks/use-playground";
import { CollapsibleCard } from "./collapsible-card";
import { EventLog } from "./event-log";
import { StateInspector } from "./state-inspector";
import { WidgetBuilder } from "./widget-builder";
import { WidgetEditor } from "./widget-editor";

export interface PageVisitViewProps {
  playground: Playground;
  visit: PageVisit;
}

export function PageVisitView({ playground, visit }: PageVisitViewProps) {
  const {
    registry,
    contracts,
    layoutEngines,
    actions,
    engineNames,
    builderEngineLocked,
    setBuilderEngine,
    store,
    bus,
    report,
    rejections,
    page,
    target,
    withUserOverlay,
    userOverlayAvailable,
    setWithUserOverlay,
    canEditPages,
    addLocked,
    addWidget,
    shownViewModels,
    shownUserViewModels,
    engine,
    editing,
    pendingChanges,
    startEditing,
    save,
    cancel,
    changeLayout,
    removeCellById,
    editingCell,
    selectCell,
    clearCell,
    saveWidget,
    plan,
    reloadKey,
  } = usePlayground(playground, visit);

  return (
    /* Left: state tree (editable) + collapsed diagnostics. Right: the live app. */
    <div className="pg-columns">
      <div className="pg-side">
        <StateInspector store={store} />
        <EventLog bus={bus} />
        <CollapsibleCard
          id="validation"
          title="Validation"
          summary={
            <span data-testid="validation-status">
              {/* Warnings (an engaged fallback) do not fail a boot. */}
              {report.ok
                ? report.warnings.length === 0
                  ? "view models: OK"
                  : `view models: OK, ${report.warnings.length} warning(s)`
                : `view models: ${report.errors.length} problem(s)`}
            </span>
          }
        >
          <ul data-testid="validation-report" className="pg-report">
            {report.problems.map((problem) => (
              <li key={`${problem.location}:${problem.message}`} data-severity={problem.severity}>
                <Typography.Text code>{problem.location}</Typography.Text>{" "}
                <Typography.Text type={problem.severity === "error" ? "danger" : "warning"}>
                  {problem.severity}
                </Typography.Text>{" "}
                <Typography.Text type="secondary">— {problem.message}</Typography.Text>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
        <CollapsibleCard
          id="registration"
          title="Broken-widget registration"
          summary={`${rejections.length} definitions checked`}
        >
          <ul data-testid="registration-report" className="pg-report">
            {rejections.map((line) => (
              <li key={line} data-rejected={!line.includes("ACCEPTED")}>
                <Typography.Text type="secondary">{line}</Typography.Text>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      </div>

      <div>
        {/* Page toolbar: engine of the shown template, the edit session, the edit target. */}
        <Flex wrap gap="small" align="center" data-testid="layout-toolbar" className="pg-toolbar">
          <label htmlFor="engine-select">engine</label>
          {page === BUILDER_PAGE && !builderEngineLocked ? (
            /* Free choice until the first widget is placed; then locked. */
            <Select
              id="engine-select"
              data-testid="engine-select"
              className="pg-field"
              placeholder="choose an engine…"
              value={engine ?? undefined}
              onChange={setBuilderEngine}
              options={engineNames.map((name) => ({ value: name, label: name }))}
            />
          ) : (
            <Typography.Text code data-testid="engine">
              {engine ?? "—"}
            </Typography.Text>
          )}
          {engine !== undefined ? (
            editing ? (
              <Space size="small">
                <Button size="small" type="primary" data-testid="page-save" onClick={save}>
                  Save page
                </Button>
                <Button size="small" data-testid="page-cancel" onClick={cancel}>
                  Cancel
                </Button>
              </Space>
            ) : (
              <Button
                size="small"
                data-testid="page-edit"
                disabled={!canEditPages}
                title={canEditPages ? undefined : "Your permissions do not include editing pages (app.permissions.editPages)"}
                onClick={startEditing}
              >
                Edit page
              </Button>
            )
          ) : null}
          <Typography.Text type="secondary" data-testid="page-mode">
            {editing ? "editing" : "view"}
          </Typography.Text>
          {editing ? (
            <Typography.Text type="secondary" data-testid="pending-changes">
              {pendingChanges} change{pendingChanges === 1 ? "" : "s"}
            </Typography.Text>
          ) : null}
          {/* On the builder there is nothing to personalise before the first widget. */}
          <Checkbox
            data-testid="toggle-user-overlay"
            checked={withUserOverlay}
            disabled={!userOverlayAvailable}
            title={userOverlayAvailable ? undefined : "Add a widget first — there is nothing to personalise yet"}
            onChange={(event) => setWithUserOverlay(event.target.checked)}
          >
            user overlay
          </Checkbox>
          <Tag data-testid="edit-target" className="pg-spacer">
            edits → {target === "user" ? "user overlay" : "view models"}
          </Tag>
        </Flex>
        <Typography.Paragraph type="secondary" data-testid="visit-note" className="pg-note">
          {page === BUILDER_PAGE
            ? "Opening this page starts it from its initial state: no data at all."
            : "Opening a page starts its own data over. The demo app's global state (app, view models, your overlay) stays until you open the builder or reload."}
        </Typography.Paragraph>

        {page === BUILDER_PAGE ? (
          <WidgetBuilder
            registry={registry}
            contracts={contracts}
            store={store}
            actions={actions}
            page={page}
            addLocked={addLocked}
            onAdd={addWidget}
          />
        ) : null}

        {editingCell ? (
          <WidgetEditor
            key={editingCell.key}
            cell={editingCell}
            store={store}
            actions={actions}
            bindingsLocked={target === "user"}
            onSave={saveWidget}
            onCancel={clearCell}
          />
        ) : null}

        <PageView
          page={page}
          viewModels={shownViewModels}
          userViewModels={shownUserViewModels}
          registry={registry}
          layoutEngines={layoutEngines}
          actions={actions}
          /* The host already resolved this page (use-page-editing); reuse
             that plan instead of resolving the same inputs again. */
          plan={plan}
          store={store}
          bus={bus}
          editable={editing}
          onLayoutChange={changeLayout}
          onEditCell={selectCell}
          onRemoveCell={removeCellById}
          /* After Add and after Save page the page loads again: its `load`
             event and its widgets' run by the new configuration. */
          reloadKey={reloadKey}
        />
      </div>
    </div>
  );
}
