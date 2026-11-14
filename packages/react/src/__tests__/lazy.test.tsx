/**
 * Lazy widgets (doc/ADR/0018-lazy-widgets.md): a component's code is asked
 * for once, by the page that shows it; the cell says it is loading and
 * shows a placeholder meanwhile; code that does not arrive is that cell's
 * problem, reported to the host, and can be asked for again; a widget a
 * condition hides is not asked for until it shows; a lazy renderer and the
 * widgets under it are asked for together.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { NO_EVENTS, widgetBindingsSchema, type AnyWidgetDefinition, type WidgetProps } from "@wirework/schema";
import { createLayoutEngines } from "@wirework/engine";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";
import type { LayoutRendererProps } from "../layout";
import { lazyComponent, loadingOf } from "../lazy";
import { PageView, type PageViewProps } from "../PageView";
import { preloadPage } from "../usePreload";
import { cell, echo, layoutEngines, listEngine, registryWith, viewModels } from "./fixtures";

function Heavy() {
  return <span data-testid="heavy">here</span>;
}

/** A loader a test answers by hand: every call is counted, and settled when the test says. */
function loader<P>(component: ComponentType<P>) {
  const calls: { resolve: () => void; reject: (error: Error) => void }[] = [];
  const load = vi.fn(
    () =>
      new Promise<{ default: ComponentType<P> }>((resolve, reject) => {
        calls.push({ resolve: () => resolve({ default: component }), reject });
      }),
  );
  const settle = (answer: (call: (typeof calls)[number]) => void) =>
    act(async () => {
      const last = calls.at(-1);
      if (last === undefined) throw new Error("the code was never asked for");
      answer(last);
    });
  return {
    load,
    arrive: () => settle((call) => call.resolve()),
    fail: () => settle((call) => call.reject(new Error("offline"))),
  };
}

const heavy = (load: () => Promise<{ default: ComponentType<WidgetProps> }>): AnyWidgetDefinition => ({
  type: "heavy",
  io: { inputs: {} },
  events: NO_EVENTS,
  viewModel: widgetBindingsSchema({ inputs: {} }, NO_EVENTS),
  component: lazyComponent(load, { name: "heavy" }),
});

const heavyCell = (id: string) => cell({ id, widget: "heavy", model: "widgets.heavy" });
const models = (cells = [heavyCell("h1")], heavyTemplate: Record<string, unknown> = {}) =>
  viewModels(cells, { heavy: { default: heavyTemplate }, echo: { default: { inputs: { value: "demo.text" } } } });

function renderPage(definition: AnyWidgetDefinition, props: Partial<PageViewProps> = {}) {
  const store = createStore({ demo: { text: "hello" } });
  render(
    <PageView
      page="demo"
      viewModels={models()}
      registry={registryWith(echo, definition)}
      layoutEngines={layoutEngines()}
      store={store}
      bus={createEventBus()}
      {...props}
    />,
  );
  return { store };
}

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => vi.restoreAllMocks());

describe("a lazy widget", () => {
  it("shows a placeholder in a cell that says it is loading, then the widget", async () => {
    const { load, arrive } = loader<WidgetProps>(Heavy);
    renderPage(heavy(load));
    const shown = screen.getByTestId("cell");
    expect(shown.getAttribute("data-loading")).toBe("true");
    expect(screen.getByTestId("cell-loading").getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByTestId("heavy")).toBeNull();

    await arrive();
    expect(screen.getByTestId("heavy").textContent).toBe("here");
    expect(screen.queryByTestId("cell-loading")).toBeNull();
    expect(shown.hasAttribute("data-loading")).toBe(false);
  });

  it("asks for its code once, however many cells show it", async () => {
    const { load, arrive } = loader<WidgetProps>(Heavy);
    renderPage(heavy(load), { viewModels: models([heavyCell("h1"), heavyCell("h2"), cell()]) });
    expect(load).toHaveBeenCalledTimes(1);
    // The widget beside it is not held up.
    expect(screen.getByTestId("echo").textContent).toBe("hello");
    await arrive();
    expect(screen.getAllByTestId("heavy")).toHaveLength(2);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("makes code that does not arrive that cell's problem, tells the host, and asks again on request", async () => {
    const { load, arrive, fail } = loader<WidgetProps>(Heavy);
    const onError = vi.fn();
    renderPage(heavy(load), { viewModels: models([heavyCell("h1"), cell()]), onError });
    await fail();
    const problem = screen.getByTestId("widget-error");
    expect(problem.getAttribute("data-problem")).toBe("load-failed");
    expect(problem.textContent).toContain('"heavy" could not be loaded: offline');
    expect(screen.getByTestId("echo").textContent).toBe("hello");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ in: "widget", cell: "h1", widget: "heavy" });

    fireEvent.click(screen.getByTestId("widget-load-again"));
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("cell-loading")).toBeTruthy();
    await arrive();
    expect(screen.getByTestId("heavy")).toBeTruthy();
    expect(screen.queryByTestId("widget-error")).toBeNull();
  });

  it("is not asked for while a condition hides it, and is when it shows", async () => {
    const { load, arrive } = loader<WidgetProps>(Heavy);
    const hidden = { when: [{ path: "demo.open", is: "empty", not: true }] };
    const { store } = renderPage(heavy(load), { viewModels: models([heavyCell("h1")], hidden) });
    expect(screen.getByTestId("cell").getAttribute("data-when")).toBe("false");
    expect(load).not.toHaveBeenCalled();

    act(() => store.set("demo.open", "yes"));
    expect(load).toHaveBeenCalledTimes(1);
    await arrive();
    expect(screen.getByTestId("heavy")).toBeTruthy();
  });

  it("fails like a rejected import when the module has nothing to render", async () => {
    const component = lazyComponent<object>(() => Promise.resolve({} as { default: ComponentType<object> }), {
      name: "empty",
    });
    render(
      <>
        {[component].map((Lazy) => (
          <Lazy key="one" />
        ))}
      </>,
    );
    await act(async () => undefined);
    expect(screen.getByTestId("widget-error").textContent).toContain("the module has no default export to render");
  });
});

describe("a page's code, asked for at once", () => {
  it("asks for a lazy renderer and the lazy widgets under it together", async () => {
    const widget = loader<WidgetProps>(Heavy);
    const renderer = loader<LayoutRendererProps>(listEngine.renderer as ComponentType<LayoutRendererProps>);
    const engines = createLayoutEngines();
    engines.register({ ...listEngine, renderer: lazyComponent(renderer.load, { name: "list" }) });
    renderPage(heavy(widget.load), { layoutEngines: engines });
    // The widget cannot have mounted — its renderer is not there — and its code is on the way all the same.
    expect(screen.queryByTestId("cell")).toBeNull();
    expect(renderer.load).toHaveBeenCalledTimes(1);
    expect(widget.load).toHaveBeenCalledTimes(1);

    await renderer.arrive();
    await widget.arrive();
    expect(screen.getByTestId("heavy")).toBeTruthy();
  });

  it("can be asked for before the page opens, for a host's router", () => {
    const { load } = loader<WidgetProps>(Heavy);
    const definition = heavy(load);
    const input = { page: "demo", viewModels: models(), registry: registryWith(echo, definition) };
    preloadPage({ ...input, layoutEngines: layoutEngines() });
    preloadPage({ ...input, layoutEngines: layoutEngines() });
    expect(load).toHaveBeenCalledTimes(1);
    expect(loadingOf(definition.component)?.snapshot().status).toBe("loading");
    expect(loadingOf(echo.component)).toBeUndefined();
  });
});
