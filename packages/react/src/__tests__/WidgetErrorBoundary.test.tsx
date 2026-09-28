/**
 * Error boundaries: a crash is isolated to its placeholder, named after
 * what crashed, and a changed `resetKey` retries — a fixed configuration
 * recovers without a remount.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LayoutErrorBoundary, WidgetErrorBoundary } from "../WidgetErrorBoundary";

function Child({ crash }: { crash: boolean }) {
  if (crash) throw new Error("boom");
  return <span data-testid="child">fine</span>;
}

// React reports every caught error on the console; the placeholders are what the tests assert on.
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => vi.restoreAllMocks());

describe("WidgetErrorBoundary", () => {
  it("shows a placeholder naming the widget and the error instead of the crashed widget", () => {
    render(
      <WidgetErrorBoundary widgetType="crasher" resetKey={1}>
        <Child crash />
      </WidgetErrorBoundary>,
    );
    const placeholder = screen.getByTestId("widget-error");
    expect(placeholder.getAttribute("data-widget")).toBe("crasher");
    expect(placeholder.textContent).toBe('Widget "crasher" crashed: boom');
    expect(screen.queryByTestId("child")).toBeNull();
  });

  it("reports the crash to the host, with React's component stack", () => {
    const onError = vi.fn();
    render(
      <WidgetErrorBoundary widgetType="crasher" onError={onError}>
        <Child crash />
      </WidgetErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const [error, info] = onError.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("boom");
    expect(info).toMatchObject({ componentStack: expect.stringContaining("Child") });
  });

  it("retries when resetKey changes, and stays crashed when it does not", () => {
    const { rerender } = render(
      <WidgetErrorBoundary widgetType="crasher" resetKey={1}>
        <Child crash />
      </WidgetErrorBoundary>,
    );
    rerender(
      <WidgetErrorBoundary widgetType="crasher" resetKey={1}>
        <Child crash={false} />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByTestId("widget-error")).toBeTruthy();

    rerender(
      <WidgetErrorBoundary widgetType="crasher" resetKey={2}>
        <Child crash={false} />
      </WidgetErrorBoundary>,
    );
    expect(screen.queryByTestId("widget-error")).toBeNull();
    expect(screen.getByTestId("child").textContent).toBe("fine");
  });
});

describe("LayoutErrorBoundary", () => {
  it("shows a placeholder naming the engine", () => {
    render(
      <LayoutErrorBoundary engine="list">
        <Child crash />
      </LayoutErrorBoundary>,
    );
    const placeholder = screen.getByTestId("layout-error");
    expect(placeholder.getAttribute("data-engine")).toBe("list");
    expect(placeholder.textContent).toBe('Layout engine "list" crashed: boom');
  });
});
