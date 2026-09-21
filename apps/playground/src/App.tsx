/**
 * Playground host — ONLY presentation (guidelines: render-only components).
 * All boot and UI state logic lives in hooks/use-playground.ts and
 * hooks/use-page-editing.ts.
 * Styling: Ant Design components plus the app's own semantic classes
 * (index.css); engine and widget packages stay on semantic CSS.
 */
import { Button, Checkbox, Flex, Select, Space, Tag, Typography } from "antd";
import { PageView } from "@wirework/react";
import { CollapsibleCard } from "./components/collapsible-card";
import { EventLog } from "./components/event-log";
import { StateInspector } from "./components/state-inspector";
import { WidgetBuilder } from "./components/widget-builder";
import { WidgetEditor } from "./components/widget-editor";
import { BUILDER_PAGE, usePlayground } from "./hooks/use-playground";

export function App() {
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
    pages,
    page,
    visitId,
    selectPage,
    target,
    withUserOverlay,
    userOverlayAvailable,
    setWithUserOverlay,
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
  } = usePlayground();

  return (
    <main className="pg-main">
      <Typography.Title level={2}>Wirework Playground</Typography.Title>

      {/* Left: state tree (editable) + collapsed diagnostics. Right: the live app. */}
      <div className="pg-columns">
        <div className="pg-side">
          {/* A new visit is a new store: an unapplied draft of the old one goes with it. */}
          <StateInspector key={visitId} store={store} />
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
                <li
                  key={`${problem.location}:${problem.message}`}
                  data-severity={problem.severity}
                >
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
          <Flex wrap gap="small" align="center" data-testid="nav" className="pg-nav" component="nav">
            {pages.map((name) => (
              <Button
                key={name}
                size="small"
                type={page === name ? "primary" : "default"}
                data-testid={`nav-${name}`}
                aria-pressed={page === name}
                onClick={() => selectPage(name)}
              >
                {name}
              </Button>
            ))}
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
            <Typography.Text type="secondary" data-testid="visit-note">
              opening a page starts it from its initial state
            </Typography.Text>
          </Flex>

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
                <Button size="small" data-testid="page-edit" onClick={startEditing}>
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
            <Tag data-testid="edit-target" className="pg-spacer">
              edits → {target === "user" ? "user overlay" : "view models"}
            </Tag>
          </Flex>

          {page === BUILDER_PAGE ? (
            <WidgetBuilder
              key={visitId}
              registry={registry}
              contracts={contracts}
              store={store}
              actions={actions}
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
          />
        </div>
      </div>
    </main>
  );
}
