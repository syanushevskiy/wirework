/**
 * Shared cell renderer for every layout engine: a problem placeholder, or
 * the widget inside its error boundary with a cell-scoped `emit` and a
 * READ-ONLY view of the store (writes happen through reactions).
 * Placement is the engine renderer's job: it wraps what `renderCell`
 * returns in its own item (a grid item, a flex row slot, a tab).
 *
 * A cell with a CONDITION (`when`, doc/conditions-design.md) keeps its
 * place whatever the answer: `data-when` says it, and while the condition
 * does not hold the widget is unmounted — or, in edit mode, shown dimmed
 * with a note saying why it would be hidden, so it can still be found and
 * edited. A predicate that throws is a crash of this cell: the placeholder,
 * and a report to the host.
 */
import { useMemo, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import type { Appearance, EventBus, Store, When, WidgetProps } from "@wirework/schema";
import {
  readableStore,
  type CellProblem,
  type PredicateRegistry,
  type ResolvedCell,
  type ResolvedCellOk,
} from "@wirework/engine";
import { useCellEmitter } from "./useCellEmitter";
import { useWhen } from "./useWhen";
import { WidgetCrash, WidgetErrorBoundary } from "./WidgetErrorBoundary";

export interface CellViewProps {
  cell: ResolvedCell;
  page: string;
  store: Store;
  bus: EventBus;
  /** The predicates a `when` may name; the standard ones alone when absent. */
  predicates?: PredicateRegistry | undefined;
  /** Edit mode: a cell whose condition does not hold stays visible, dimmed, with the reason. */
  editable?: boolean | undefined;
  /** The widget crashed (its placeholder is shown): for the host to report. */
  onError?: ((error: Error, info: ErrorInfo) => void) | undefined;
}

function problemMessage(problem: CellProblem): string {
  switch (problem.kind) {
    case "unknown-widget":
      return `Unknown widget "${problem.widget}"`;
    case "dangling-model-path":
      return `Dangling model path "${problem.path}"`;
    case "missing-template":
      return `No template "${problem.template}" at "${problem.path}"`;
    case "invalid-view-model":
      return `Invalid view model: ${problem.message}`;
    case "unmet-contract":
      return `Unmet contract: ${problem.message}`;
    case "duplicate-cell-id":
      return `Duplicate cell id "${problem.id}" — ids must be unique on a page`;
  }
}

function ProblemCell({ cell, problem }: CellViewProps & { problem: CellProblem }) {
  return (
    <div
      role="alert"
      className="ww-cell ww-cell-problem"
      data-testid="cell-problem"
      data-cell={cell.key}
      data-widget={cell.widget}
      data-problem={problem.kind}
    >
      {problemMessage(problem)}
    </div>
  );
}

/** The condition and the appearance of a resolved view model, if it declares them. The one cast: the widget's own schema parsed it. */
const showingOf = (viewModel: unknown): { when?: When; appear?: Appearance } =>
  (viewModel as { when?: When; appear?: Appearance } | null) ?? {};

function WidgetCell({
  cell,
  page,
  store,
  bus,
  predicates,
  editable = false,
  onError,
}: CellViewProps & { cell: ResolvedCellOk }) {
  const emit = useCellEmitter(bus, cell.definition, page, cell.key);
  const readable = useMemo(() => readableStore(store), [store]);
  const { when, appear } = showingOf(cell.viewModel);
  // A throwing predicate is reported by the hook, like a crashing widget.
  const { shown, error, text } = useWhen(readable, when, { predicates, onError });
  // The registry stores framework-agnostic definitions; this adapter renders
  // React components (see ReactWidgetDefinition).
  const Widget = cell.definition.component as ComponentType<WidgetProps>;
  const hiddenNow = !shown && error === undefined;
  return (
    <div
      className={hiddenNow && editable ? "ww-cell ww-cell-hidden-now" : "ww-cell"}
      data-testid="cell"
      data-cell={cell.key}
      data-widget={cell.widget}
      data-kind={cell.definition.kind}
      data-fallback={cell.fallback?.used}
      {...(when === undefined ? {} : { "data-when": String(shown) })}
      {...(appear === undefined ? {} : { "data-appear": appear })}
    >
      {error ? (
        <WidgetCrash widgetType={cell.widget} error={error} />
      ) : hiddenNow && !editable ? null : (
        <Appearing appear={appear}>
          {hiddenNow ? (
            <div className="ww-cell-note" data-testid="cell-hidden-note">
              hidden now — shows {text}
            </div>
          ) : null}
          {/* resetKey: a re-resolved view model clears a previous crash state */}
          <WidgetErrorBoundary widgetType={cell.widget} resetKey={cell.viewModel} onError={onError}>
            <Widget viewModel={cell.viewModel} store={readable} emit={emit} />
          </WidgetErrorBoundary>
        </Appearing>
      )}
    </div>
  );
}

/**
 * The element a widget APPEARS on: mounted when its condition turns true,
 * so the declared appearance plays as a mount animation (styles.css). A
 * widget without one gets no element at all.
 */
function Appearing({ appear, children }: { appear: Appearance | undefined; children: ReactNode }) {
  return appear === undefined ? children : <div className={`ww-appear ww-appear-${appear}`}>{children}</div>;
}

export function CellView(props: CellViewProps) {
  const { cell } = props;
  // `problem` discriminates the union: no narrowing helper, no re-spread.
  if (cell.problem) return <ProblemCell {...props} problem={cell.problem} />;
  return <WidgetCell {...props} cell={cell} />;
}
