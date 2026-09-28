/**
 * PageView — a pure renderer of the plan: widgets read the store live,
 * every problem is a visible placeholder (page, cell, an ignored overlay, a
 * crashing widget, a crashing layout renderer), a fixed configuration
 * recovers, and the edit chrome appears only with a callback to serve.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserViewModels } from "@wirework/schema";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";
import { PageView, type PageViewProps } from "../PageView";
import { cell, crasher, echo, layoutEngines, registryWith, viewModels } from "./fixtures";

const echoModels = (cells = [cell()]) => viewModels(cells, { echo: { default: { inputs: { value: "demo.text" } } } });

function renderPage(props: Partial<PageViewProps> = {}) {
  const store = createStore({ demo: { text: "hello" } });
  const view = (overrides: Partial<PageViewProps> = {}) => (
    <PageView
      page="demo"
      viewModels={echoModels()}
      registry={registryWith(echo, crasher)}
      layoutEngines={layoutEngines()}
      store={store}
      bus={createEventBus()}
      {...props}
      {...overrides}
    />
  );
  const rendered = render(view());
  return { store, rerender: (overrides: Partial<PageViewProps>) => rendered.rerender(view(overrides)) };
}

// React reports every caught error on the console; the placeholders are what the tests assert on.
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => vi.restoreAllMocks());

describe("PageView", () => {
  it("renders the page's cells through the engine, each widget reading the store live", () => {
    const { store } = renderPage();
    const page = screen.getByTestId("page");
    expect(page.getAttribute("data-engine")).toBe("list");
    expect(page.getAttribute("data-layout-mode")).toBe("view");
    expect(screen.getByTestId("cell").getAttribute("data-widget")).toBe("echo");
    expect(screen.getByTestId("echo").textContent).toBe("hello");

    act(() => store.set("demo.text", "changed"));
    expect(screen.getByTestId("echo").textContent).toBe("changed");
    // A healthy page reports nothing (no act warnings, no React complaints).
    expect(vi.mocked(console.error).mock.calls).toEqual([]);
  });

  it("shows the page problem instead of a page that cannot resolve", () => {
    renderPage({ page: "nope" });
    expect(screen.getByTestId("page-problem").textContent).toBe('Unknown page "nope"');
    expect(screen.queryByTestId("page")).toBeNull();
  });

  it("shows a cell problem in place of one cell and renders the others", () => {
    renderPage({ viewModels: echoModels([cell(), cell({ id: "c2", widget: "ghost" })]) });
    expect(screen.getByTestId("echo").textContent).toBe("hello");
    const problem = screen.getByTestId("cell-problem");
    expect(problem.getAttribute("data-problem")).toBe("unknown-widget");
    expect(problem.getAttribute("data-cell")).toBe("c2");
    expect(problem.textContent).toBe('Unknown widget "ghost"');
  });

  it("says when the user's overlay is ignored, and still shows the shared page", () => {
    const broken = { pages: { demo: { veiw: "compact" } } } as unknown as UserViewModels;
    renderPage({ userViewModels: broken });
    expect(screen.getByTestId("overlay-ignored").textContent).toContain("shared page is shown");
    expect(screen.getByTestId("echo").textContent).toBe("hello");
  });

  it("isolates a crashing widget to its cell, reports it, and recovers when its view model is fixed", () => {
    const onError = vi.fn();
    const crashing = (crash: boolean) =>
      viewModels([cell({ widget: "crasher", model: "widgets.crasher" })], { crasher: { default: { crash } } });
    const { rerender } = renderPage({ viewModels: crashing(true), onError });
    expect(screen.getByTestId("widget-error").getAttribute("data-widget")).toBe("crasher");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      in: "widget",
      cell: "c1",
      widget: "crasher",
      error: expect.objectContaining({ message: "the widget is broken" }),
    });

    rerender({ viewModels: crashing(false), onError });
    expect(screen.queryByTestId("widget-error")).toBeNull();
    expect(screen.getByTestId("crasher").textContent).toBe("fine");
  });

  it("isolates a crashing layout renderer to the page, and reports it", () => {
    const onError = vi.fn();
    renderPage({
      viewModels: viewModels([cell()], { echo: { default: { inputs: { value: "demo.text" } } } }, {}, { crash: true }),
      onError,
    });
    expect(screen.getByTestId("layout-error").getAttribute("data-engine")).toBe("list");
    expect(screen.queryByTestId("echo")).toBeNull();
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      in: "layout",
      engine: "list",
      error: expect.objectContaining({ message: "the list is broken" }),
    });
  });

  it("renders the edit chrome only in edit mode with a callback, and reports the cell it serves", () => {
    const onEditCell = vi.fn();
    const { rerender } = renderPage({ editable: true });
    expect(screen.getByTestId("page").getAttribute("data-layout-mode")).toBe("edit");
    expect(screen.queryByTestId("cell-edit")).toBeNull();

    rerender({ editable: true, onEditCell });
    fireEvent.click(screen.getByTestId("cell-edit"));
    expect(onEditCell).toHaveBeenCalledWith("c1");
    expect(screen.queryByTestId("cell-remove")).toBeNull();
  });
});
