/**
 * NestedLayout — a layout inside a widget, rendered with the page's own
 * machinery: its cells read the store live and their reactions run on the
 * page's bus; outside a page it only says what it holds; too deep, it is a
 * problem placeholder and nothing recurses.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NO_EVENTS, pageViewModelSchema, widgetBindingsSchema, type AnyWidgetDefinition } from "@wirework/schema";
import { MAX_LAYOUT_DEPTH } from "@wirework/engine";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";
import { NestedLayout } from "../NestedLayout";
import { PageView } from "../PageView";
import { cell, echo, layoutEngines, registryWith, viewModels } from "./fixtures";

const boxSchema = widgetBindingsSchema({ inputs: {} }, NO_EVENTS).extend({ content: pageViewModelSchema.optional() });

/** A container: whatever its `content` holds, inside a box. */
const box: AnyWidgetDefinition = {
  type: "box",
  io: { inputs: {} },
  events: NO_EVENTS,
  viewModel: boxSchema,
  contains: ["content"],
  component: function Box({ viewModel }: { viewModel: z.infer<typeof boxSchema> }) {
    return (
      <div data-testid="box">
        <NestedLayout template={viewModel.content} />
      </div>
    );
  },
};

const layout = (cells: unknown[]) => ({ engine: "list", cells });

describe("NestedLayout", () => {
  it("renders the layout a container holds with the page's registries, its cells reading the store live", () => {
    const store = createStore({ demo: { text: "inside" } });
    render(
      <PageView
        page="demo"
        viewModels={viewModels([cell({ id: "box-1", widget: "box", model: "widgets.box" })], {
          box: { default: { content: layout([cell({ id: "inner" })]) } },
          echo: { default: { inputs: { value: "demo.text" } } },
        })}
        registry={registryWith(box, echo)}
        layoutEngines={layoutEngines()}
        store={store}
        bus={createEventBus()}
      />,
    );
    const nested = screen.getByTestId("layout");
    expect(nested.getAttribute("data-page")).toBe("demo/box-1");
    expect(nested.getAttribute("data-nested")).toBe("1");
    expect(screen.getByTestId("echo").textContent).toBe("inside");
    act(() => store.set("demo.text", "changed"));
    expect(screen.getByTestId("echo").textContent).toBe("changed");
    // The inner cell is a cell: the same element a page's own cells get.
    expect(nested.querySelector('[data-testid="cell"][data-cell="inner"]')).not.toBeNull();
  });

  it("reads the role layer for the cells inside a container, the user's own choice over it (doc/ADR/0012-roles.md)", () => {
    const store = createStore({ demo: { text: "inside", other: "elsewhere" } });
    const models = viewModels([cell({ id: "box-1", widget: "box", model: "widgets.box" })], {
      box: { default: { content: layout([cell({ id: "inner" })]) } },
      echo: { default: { inputs: { value: "demo.text" } }, other: { inputs: { value: "demo.other" } } },
    });
    const withRoles = {
      ...models,
      roles: { admin: { pages: { demo: { cells: { "box-1/inner": { view: "other" } } } } } },
    };
    const page = (roles: string[], userViewModels?: { pages: Record<string, unknown> }) => (
      <PageView
        page="demo"
        viewModels={withRoles}
        roles={roles}
        userViewModels={userViewModels as never}
        registry={registryWith(box, echo)}
        layoutEngines={layoutEngines()}
        store={store}
        bus={createEventBus()}
      />
    );
    const { rerender } = render(page([]));
    expect(screen.getByTestId("echo").textContent).toBe("inside");
    rerender(page(["admin"]));
    expect(screen.getByTestId("echo").textContent).toBe("elsewhere");
    rerender(page(["admin"], { pages: { demo: { cells: { "box-1/inner": { view: "default" } } } } }));
    expect(screen.getByTestId("echo").textContent).toBe("inside");
  });

  it("outside a page says only what it holds", () => {
    render(<NestedLayout template={layout([cell(), cell({ id: "c2" })])} />);
    expect(screen.getByTestId("layout-preview").textContent).toBe("2 widgets inside");
  });

  it("stops at the depth limit with a problem, never a recursion", () => {
    const widgets: Record<string, unknown> = { echo: { default: { inputs: { value: "demo.text" } } } };
    let content: unknown = layout([cell({ id: "leaf" })]);
    for (let depth = 1; depth <= MAX_LAYOUT_DEPTH; depth += 1) {
      widgets[`box${depth}`] = { default: { content } };
      content = layout([cell({ id: `box-${depth}`, widget: "box", model: `widgets.box${depth}` })]);
    }
    render(
      <PageView
        page="demo"
        viewModels={viewModels((content as { cells: never[] }).cells, widgets)}
        registry={registryWith(box, echo)}
        layoutEngines={layoutEngines()}
        store={createStore({ demo: { text: "deep" } })}
        bus={createEventBus()}
      />,
    );
    expect(screen.getByTestId("layout-problem").textContent).toContain("nested too deep");
    expect(screen.queryByTestId("echo")).toBeNull();
  });
});
