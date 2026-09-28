/**
 * The view of ONE page visit — ONLY presentation (guidelines: render-only
 * components). Left: the visit's state tree (editable) and the collapsed
 * diagnostics; right: the page toolbar, the builder or a widget editor when
 * they apply, and the live page. All logic lives in hooks/use-playground.ts,
 * which composes the @wirework/builder hooks. The router keys this component
 * by visit, so every piece of UI state here starts over with the visit.
 */
import { Typography } from "antd";
import { PageView } from "@wirework/react";
import { PageToolbar, WidgetBuilder, WidgetEditor } from "@wirework/antd-builder";
import type { PageVisit, Playground } from "../boot";
import { BUILDER_PAGE, usePlayground } from "../hooks/use-playground";
import { CollapsibleCard } from "./collapsible-card";
import { EventLog } from "./event-log";
import { StateInspector } from "./state-inspector";

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
    store,
    bus,
    report,
    rejections,
    page,
    target,
    addLock,
    addWidget,
    toolbar,
    shownViewModels,
    shownUserViewModels,
    editing,
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
        <PageToolbar toolbar={toolbar} />
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
            addLock={addLock}
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
