/**
 * PageView — a pure renderer of the plan: widgets read the store live,
 * every problem is a visible placeholder (page, cell, an ignored overlay, a
 * crashing widget, a crashing layout renderer), a fixed configuration
 * recovers, and the edit chrome appears only with a callback to serve.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserViewModels } from "@wirework/schema";
import { createPredicates } from "@wirework/engine";
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

  it("shows the page as the user's roles see it, the last role's view winning (doc/roles-design.md)", () => {
    const admin = { engine: "list", cells: [cell(), cell({ id: "c2" })] };
    const withRoles = {
      ...echoModels(),
      roles: {
        admin: { pages: { demo: { view: "admin", templates: { admin } } } },
        ops: { pages: { demo: { view: "default" } } },
      },
    };
    const { rerender } = renderPage({ viewModels: withRoles, roles: ["admin"] });
    expect(screen.getByTestId("page").getAttribute("data-view")).toBe("admin");
    expect(screen.getAllByTestId("echo")).toHaveLength(2);
    rerender({ viewModels: withRoles, roles: ["admin", "ops"] });
    expect(screen.getByTestId("page").getAttribute("data-view")).toBe("default");
    expect(screen.getAllByTestId("echo")).toHaveLength(1);
    rerender({ viewModels: withRoles, roles: ["ops", "admin"] });
    expect(screen.getByTestId("page").getAttribute("data-view")).toBe("admin");
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

  describe("a cell with a condition", () => {
    const conditional = (when: unknown) =>
      viewModels([cell()], { echo: { default: { inputs: { value: "demo.text" }, when } } });
    const notEmpty = [{ path: "demo.text", is: "empty", not: true }];

    it("keeps its place and shows its widget only while the condition holds", () => {
      const { store } = renderPage({ viewModels: conditional(notEmpty) });
      expect(screen.getByTestId("cell").getAttribute("data-when")).toBe("true");
      expect(screen.getByTestId("echo").textContent).toBe("hello");

      act(() => store.set("demo.text", ""));
      expect(screen.getByTestId("cell").getAttribute("data-when")).toBe("false");
      expect(screen.queryByTestId("echo")).toBeNull();

      act(() => store.set("demo.text", "back"));
      expect(screen.getByTestId("echo").textContent).toBe("back");
    });

    it("in edit mode stays visible, dimmed, with the reason it would be hidden", () => {
      const { store } = renderPage({ viewModels: conditional(notEmpty), editable: true, onEditCell: vi.fn() });
      act(() => store.set("demo.text", ""));
      const hidden = screen.getByTestId("cell");
      expect(hidden.getAttribute("data-when")).toBe("false");
      expect(hidden.className).toContain("ww-cell-hidden-now");
      expect(screen.getByTestId("cell-hidden-note").textContent).toBe("hidden now — shows unless demo.text is empty");
      expect(screen.getByTestId("echo")).toBeTruthy();
      expect(screen.getByTestId("cell-edit")).toBeTruthy();
    });

    it("carries no data-when without a condition", () => {
      renderPage();
      expect(screen.getByTestId("cell").hasAttribute("data-when")).toBe(false);
    });

    it("plays its disappearance on the way out, in reverse, and leaves when it ends", () => {
      const animated = viewModels([cell()], {
        echo: { default: { inputs: { value: "demo.text" }, when: notEmpty, appear: "fade", disappear: "zoom" } },
      });
      const { store } = renderPage({ viewModels: animated });
      const shown = screen.getByTestId("cell").querySelector<HTMLElement>(".ww-appear");
      expect(shown?.style.animationName).toBe("ww-fade");
      expect(shown?.classList.contains("ww-disappear")).toBe(false);

      act(() => store.set("demo.text", ""));
      const cellElement = screen.getByTestId("cell");
      expect(cellElement.getAttribute("data-when")).toBe("false");
      expect(cellElement.getAttribute("data-disappear")).toBe("zoom");
      // Still mounted, on its way out: the disappearance plays in reverse.
      const leaving = cellElement.querySelector<HTMLElement>(".ww-disappear");
      if (!leaving) throw new Error("nothing is leaving");
      expect(leaving.style.animationName).toBe("ww-zoom");
      expect(screen.getByTestId("echo")).toBeTruthy();

      fireEvent.animationEnd(leaving);
      expect(screen.queryByTestId("echo")).toBeNull();
      expect(cellElement.querySelector(".ww-appear")).toBeNull();
    });

    it("stays when its condition turns true again before the way out ended", () => {
      const animated = viewModels([cell()], {
        echo: { default: { inputs: { value: "demo.text" }, when: notEmpty, disappear: "zoom" } },
      });
      const { store } = renderPage({ viewModels: animated });
      act(() => store.set("demo.text", ""));
      expect(screen.getByTestId("cell").querySelector(".ww-disappear")).not.toBeNull();
      act(() => store.set("demo.text", "back"));
      expect(screen.getByTestId("cell").querySelector(".ww-disappear")).toBeNull();
      expect(screen.getByTestId("echo").textContent).toBe("back");
    });

    it("shows an appearance nobody registered as a cell problem", () => {
      renderPage({
        viewModels: viewModels([cell()], {
          echo: { default: { inputs: { value: "demo.text" }, when: notEmpty, appear: "drop" } },
        }),
      });
      expect(screen.getByTestId("cell-problem").textContent).toContain('unknown appearance "drop"');
    });

    it("shows a condition that names an unknown predicate as a cell problem", () => {
      renderPage({ viewModels: conditional([{ path: "demo.text", is: "demo/nope" }]) });
      const problem = screen.getByTestId("cell-problem");
      expect(problem.getAttribute("data-problem")).toBe("unmet-contract");
      expect(problem.textContent).toContain('unknown predicate "demo/nope"');
    });

    it("isolates a predicate that throws to its cell, and reports it", () => {
      const predicates = createPredicates();
      predicates.register({
        name: "demo/picky",
        description: "throws",
        phrase: "is fine",
        test: () => {
          throw new Error("the predicate is broken");
        },
      });
      const onError = vi.fn();
      renderPage({ viewModels: conditional([{ path: "demo.text", is: "demo/picky" }]), predicates, onError });
      expect(screen.getByTestId("widget-error").textContent).toContain("the predicate is broken");
      expect(screen.getByTestId("cell").getAttribute("data-when")).toBe("false");
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0]?.[0]).toMatchObject({ in: "widget", cell: "c1", widget: "echo" });
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
