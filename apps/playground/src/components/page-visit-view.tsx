/**
 * The view of ONE page visit — ONLY presentation (guidelines: render-only
 * components). Left: the visit's state tree (editable) and the collapsed
 * diagnostics; right: the page toolbar, the builder or a widget editor when
 * they apply, and the live page. All logic lives in hooks/use-playground.ts,
 * which composes the @wirework/builder hooks. The router keys this component
 * by visit, so every piece of UI state here starts over with the visit.
 */
import { Flex, Select, Typography } from "antd";
import { PageView } from "@wirework/react";
import { PageExport, PageToolbar, PageViews, WidgetBuilder, WidgetEditor } from "@wirework/antd-builder";
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
    predicates,
    appearances,
    store,
    bus,
    report,
    rejections,
    page,
    stateSections,
    layoutPage,
    target,
    roles,
    people,
    person,
    signInAs,
    adding,
    addLock,
    addWidget,
    editLayout,
    wrapInCard,
    templateChoice,
    toolbar,
    views,
    exporting,
    shownViewModels,
    shownUserViewModels,
    editing,
    changeLayout,
    removeCellById,
    resetLayout,
    ownLayoutCells,
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
        {/* A demo page's own data and views, then the global settings and session; the builder's store whole. */}
        <StateInspector store={store} sections={stateSections} />
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
        {/* "Sign in as" (doc/roles-design.md): the HOST's, not a widget — the session request goes out again for the person picked. */}
        {people ? (
          <Flex gap="small" align="center" className="pg-sign-in" data-visit={visit.id}>
            <label htmlFor="sign-in-as">Signed in as</label>
            <Select<string>
              id="sign-in-as"
              data-testid="sign-in-as"
              className="pg-sign-in-select"
              size="small"
              {...(person === undefined ? { placeholder: "signing in…" } : { value: person })}
              onChange={signInAs}
              options={people}
            />
          </Flex>
        ) : null}
        {/* Page toolbar: engine of the shown template, the edit session, the edit target. */}
        <PageToolbar toolbar={toolbar} />
        {/* The page's views: prebuilt and the user's own, chosen, saved, shared as JSON. */}
        <PageViews views={views} />
        {/* The whole shared page as a file, for an admin to hand to a developer (doc/pages-as-code-design.md). */}
        <PageExport export={exporting} />
        <Typography.Paragraph type="secondary" data-testid="visit-note" className="pg-note">
          {page === BUILDER_PAGE
            ? "Opening this page starts it from its initial state: no data at all."
            : "Opening a page starts its own data over. The demo app's global state (app, view models, your overlay) stays until you open the builder or reload."}
        </Typography.Paragraph>

        {adding ? (
          <WidgetBuilder
            registry={registry}
            contracts={contracts}
            store={store}
            actions={actions}
            predicates={predicates}
            appearances={appearances}
            page={page}
            addLock={addLock}
            onAdd={addWidget}
          />
        ) : null}

        {editingCell ? (
          <WidgetEditor
            /* A fresh form per cell — and per template: a template chosen for an overlay prefills the form anew. */
            key={`${editingCell.key}:${editingCell.template ?? ""}`}
            cell={editingCell}
            store={store}
            actions={actions}
            predicates={predicates}
            appearances={appearances}
            /* An overlay — the user's own view, a role's — carries settings (and, for a role, a template choice), never wiring. */
            bindingsLocked={target !== "base"}
            templates={templateChoice}
            onSave={saveWidget}
            onCancel={clearCell}
          />
        ) : null}

        <PageView
          /* The page — or, inside a container, the layout shown under its nested name (doc/containers-design.md). */
          page={layoutPage}
          viewModels={shownViewModels}
          userViewModels={shownUserViewModels}
          roles={roles}
          registry={registry}
          layoutEngines={layoutEngines}
          actions={actions}
          predicates={predicates}
          appearances={appearances}
          /* The host already resolved this page (use-page-editing); reuse
             that plan instead of resolving the same inputs again. */
          plan={plan}
          store={store}
          bus={bus}
          editable={editing}
          onLayoutChange={changeLayout}
          onEditCell={selectCell}
          onRemoveCell={removeCellById}
          /* A container's content is edited as a layout — the user's own copy with the overlay on; a cell is wrapped in a card on the shared page only. */
          onEditLayout={editLayout}
          wrapCell={target === "base" ? { label: "Wrap in a card", onWrap: wrapInCard } : undefined}
          /* In a user's or a role's view every container can go back to the layout it had: its own one is dropped. */
          resetLayout={
            target === "base" ? undefined : { label: "Reset to original", cells: ownLayoutCells, onReset: resetLayout }
          }
          /* After Add and after Save page the page loads again: its `load`
             event and its widgets' run by the new configuration. */
          reloadKey={reloadKey}
        />
      </div>
    </div>
  );
}
