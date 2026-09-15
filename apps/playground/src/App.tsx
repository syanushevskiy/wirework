/**
 * Playground host — ONLY presentation (guidelines: render-only components).
 * All boot and UI state logic lives in hooks/use-playground.ts and
 * hooks/use-page-editing.ts.
 * Styling: Tailwind + shadcn/ui (scoped to the playground app; engine and
 * widget packages stay on semantic CSS).
 */
import { PageView } from "@wirework/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleCard } from "./components/collapsible-card";
import { EventLog } from "./components/event-log";
import { StateInspector } from "./components/state-inspector";
import { WidgetBuilder } from "./components/widget-builder";
import { WidgetEditor } from "./components/widget-editor";
import { PAGES, usePlayground } from "./hooks/use-playground";

export function App() {
  const {
    registry,
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
    selectPage,
    target,
    withUserOverlay,
    setWithUserOverlay,
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
  } = usePlayground();

  return (
    <main className="mx-auto max-w-[100rem] p-6">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Wirework Playground</h1>

      {/* Left: state tree (editable) + collapsed diagnostics. Right: the live app. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(22rem,30rem)_1fr]">
        <div className="grid gap-6">
          <StateInspector store={store} />
          <EventLog bus={bus} />
          <CollapsibleCard
            id="validation"
            title="Validation"
            summary={
              <span data-testid="validation-status">
                {report.ok
                  ? "view models: OK"
                  : `view models: ${report.problems.length} problem(s)`}
              </span>
            }
          >
            <ul data-testid="validation-report" className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {report.problems.map((problem) => (
                <li key={`${problem.location}:${problem.message}`}>
                  <code className="font-mono text-xs">{problem.location}</code> —{" "}
                  {problem.message}
                </li>
              ))}
            </ul>
          </CollapsibleCard>
          <CollapsibleCard
            id="registration"
            title="Broken-widget registration"
            summary={`${rejections.length} definitions checked`}
          >
            <ul data-testid="registration-report" className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {rejections.map((line) => (
                <li key={line} data-rejected={!line.includes("ACCEPTED")}>
                  {line}
                </li>
              ))}
            </ul>
          </CollapsibleCard>
        </div>

        <div>
          <nav data-testid="nav" className="mb-4 flex flex-wrap items-center gap-2">
            {PAGES.map((name) => (
              <Button
                key={name}
                type="button"
                size="sm"
                variant={page === name ? "default" : "outline"}
                data-testid={`nav-${name}`}
                aria-pressed={page === name}
                onClick={() => selectPage(name)}
              >
                {name}
              </Button>
            ))}
            <div className="ml-4 flex items-center gap-2">
              <Checkbox
                id="toggle-user-overlay"
                data-testid="toggle-user-overlay"
                checked={withUserOverlay}
                onCheckedChange={(checked) => setWithUserOverlay(checked === true)}
              />
              <Label htmlFor="toggle-user-overlay">user overlay</Label>
            </div>
          </nav>

          {/* Page toolbar: engine of the shown template, the edit session, the edit target. */}
          <div data-testid="layout-toolbar" className="mb-4 flex flex-wrap items-center gap-2">
            <Label htmlFor="engine-select">engine</Label>
            {page === "builder" && !builderEngineLocked ? (
              /* Free choice until the first widget is placed; then locked. */
              <Select value={engine ?? ""} onValueChange={setBuilderEngine}>
                <SelectTrigger id="engine-select" data-testid="engine-select" className="w-48">
                  <SelectValue placeholder="choose an engine…" />
                </SelectTrigger>
                <SelectContent>
                  {engineNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <code data-testid="engine" className="font-mono text-xs">
                {engine ?? "—"}
              </code>
            )}
            {engine !== undefined ? (
              editing ? (
                <>
                  <Button type="button" size="sm" data-testid="page-save" onClick={save}>
                    Save page
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="page-cancel"
                    onClick={cancel}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="page-edit"
                  onClick={startEditing}
                >
                  Edit page
                </Button>
              )
            ) : null}
            <span data-testid="page-mode" className="text-xs text-muted-foreground">
              {editing ? "editing" : "view"}
            </span>
            {editing ? (
              <span data-testid="pending-changes" className="text-xs text-muted-foreground">
                {pendingChanges} change{pendingChanges === 1 ? "" : "s"}
              </span>
            ) : null}
            <span
              data-testid="edit-target"
              className="ml-auto rounded border px-2 py-0.5 text-xs text-muted-foreground"
            >
              edits → {target === "user" ? "user overlay" : "view models"}
            </span>
          </div>

          {page === "builder" ? (
            <WidgetBuilder registry={registry} store={store} actions={actions} onAdd={addWidget} />
          ) : null}

          {editingCell ? (
            <WidgetEditor
              key={editingCell.key}
              cell={editingCell}
              store={store}
              actions={actions}
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
