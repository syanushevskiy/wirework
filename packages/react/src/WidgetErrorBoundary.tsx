/**
 * Error boundaries. A widget that throws during render is isolated to its
 * own cell — the rest of the page keeps working (team-tiger UX/QA ask); a
 * layout renderer that throws (a malformed model from the inspector or a
 * saved overlay) is isolated to the page, so the host app and its tools
 * stay usable (team-tiger review, Ren). A changed `resetKey` (e.g. a
 * re-resolved view model or plan) clears the error so a fixed
 * configuration can recover without a full remount.
 */
import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  /** When this value changes, a previous crash state is cleared. */
  resetKey?: unknown;
  /** What renders instead of the crashed subtree. */
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
}

interface State {
  error?: Error;
  prevResetKey?: unknown;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: State): Partial<State> | null {
    if (!Object.is(props.resetKey, state.prevResetKey)) {
      return { error: undefined, prevResetKey: props.resetKey };
    }
    return null;
  }

  render(): ReactNode {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

export interface WidgetErrorBoundaryProps {
  widgetType: string;
  resetKey?: unknown;
  children: ReactNode;
}

export function WidgetErrorBoundary({ widgetType, resetKey, children }: WidgetErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKey={resetKey}
      fallback={(error) => (
        <div role="alert" className="ww-widget-error" data-testid="widget-error" data-widget={widgetType}>
          Widget &quot;{widgetType}&quot; crashed: {error.message}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export interface LayoutErrorBoundaryProps {
  engine: string;
  resetKey?: unknown;
  children: ReactNode;
}

export function LayoutErrorBoundary({ engine, resetKey, children }: LayoutErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKey={resetKey}
      fallback={(error) => (
        <div role="alert" className="ww-page-problem" data-testid="layout-error" data-engine={engine}>
          Layout engine &quot;{engine}&quot; crashed: {error.message}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
