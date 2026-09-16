/**
 * Shared cell renderer for every layout engine: a problem placeholder, or
 * the widget inside its error boundary with a cell-scoped `emit` and a
 * READ-ONLY view of the store (writes happen through reactions).
 * Placement is the caller's job — engines pass a style (flex) or wrap the
 * cell in a grid item (react-grid-layout).
 */
import { useMemo, type ComponentType, type CSSProperties } from "react";
import type { EventBus, Store, WidgetProps } from "@wirework/schema";
import { readableStore, type CellProblem, type ResolvedCell, type ResolvedCellOk } from "@wirework/engine";
import { useCellEmitter } from "./useCellEmitter";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";

export interface CellViewProps {
  cell: ResolvedCell;
  page: string;
  store: Store;
  bus: EventBus;
  style?: CSSProperties;
  /** flex-rows width token, exposed as data-width for CSS/media refinement. */
  width?: string;
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

function ProblemCell({ cell, problem, style }: CellViewProps & { problem: CellProblem }) {
  return (
    <div
      role="alert"
      className="ww-cell ww-cell-problem"
      style={style}
      data-testid="cell-problem"
      data-cell={cell.key}
      data-widget={cell.widget}
      data-problem={problem.kind}
    >
      {problemMessage(problem)}
    </div>
  );
}

function WidgetCell({ cell, page, store, bus, style, width }: CellViewProps & { cell: ResolvedCellOk }) {
  const emit = useCellEmitter(bus, cell.definition, page, cell.key);
  const readable = useMemo(() => readableStore(store), [store]);
  // The registry stores framework-agnostic definitions; this adapter renders
  // React components (see ReactWidgetDefinition).
  const Widget = cell.definition.component as ComponentType<WidgetProps>;
  return (
    <div
      className="ww-cell"
      style={style}
      data-testid="cell"
      data-cell={cell.key}
      data-widget={cell.widget}
      data-kind={cell.definition.kind}
      data-width={width}
      data-fallback={cell.fallback?.used}
    >
      {/* resetKey: a re-resolved view model clears a previous crash state */}
      <WidgetErrorBoundary widgetType={cell.widget} resetKey={cell.viewModel}>
        <Widget viewModel={cell.viewModel} store={readable} emit={emit} />
      </WidgetErrorBoundary>
    </div>
  );
}

export function CellView(props: CellViewProps) {
  const { cell } = props;
  // `problem` discriminates the union: no narrowing helper, no re-spread.
  if (cell.problem) return <ProblemCell {...props} problem={cell.problem} />;
  return <WidgetCell {...props} cell={cell} />;
}
