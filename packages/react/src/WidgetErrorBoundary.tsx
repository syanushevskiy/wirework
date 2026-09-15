/**
 * Per-cell error boundary: a widget that throws during render is isolated to
 * its own cell — the rest of the page keeps working (team-tiger UX/QA ask).
 * A changed `resetKey` (e.g. a re-resolved view model) clears the error so a
 * fixed configuration can recover without a full remount.
 */
import { Component, type ReactNode } from "react";

interface Props {
  widgetType: string;
  /** When this value changes, a previous crash state is cleared. */
  resetKey?: unknown;
  children: ReactNode;
}

interface State {
  error?: Error;
  prevResetKey?: unknown;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (!Object.is(props.resetKey, state.prevResetKey)) {
      return { error: undefined, prevResetKey: props.resetKey };
    }
    return null;
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <div
          role="alert"
          className="ww-widget-error"
          data-testid="widget-error"
          data-widget={this.props.widgetType}
        >
          Widget &quot;{this.props.widgetType}&quot; crashed: {error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
