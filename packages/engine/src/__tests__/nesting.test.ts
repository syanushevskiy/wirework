/**
 * Layouts inside widgets: which layouts a container holds, the overlay as
 * the cells inside see it, the registry's check of `contains`, and boot
 * validation walking into a card — and refusing one too deep.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NO_EVENTS, widgetBindingsSchema, pageViewModelSchema, type AnyWidgetDefinition } from "@wirework/schema";
import { createRegistry, validateViewModels } from "../index";
import { innerCellKey, innerOverlay, layoutsOf, MAX_LAYOUT_DEPTH } from "../nesting";
import { cell, counter, enginesWith, listEngine, plain, registryWith } from "./fixtures";

/** A container: `content` holds a layout, `tabs` a list of items with one each. */
const box: AnyWidgetDefinition = {
  type: "box",
  io: { inputs: {} },
  events: NO_EVENTS,
  viewModel: widgetBindingsSchema({ inputs: {} }, NO_EVENTS).extend({
    content: pageViewModelSchema.optional(),
    tabs: z.array(z.object({ key: z.string(), content: pageViewModelSchema.optional() })).optional(),
  }),
  contains: ["content", "tabs"],
  component: () => null,
};

const layout = (cells: unknown[]) => ({ engine: "list", cells });

describe("layoutsOf", () => {
  it("lists a layout setting and every item's content, by their paths, skipping what is not there", () => {
    const viewModel = {
      inputs: {},
      on: {},
      content: layout([]),
      tabs: [{ key: "a", content: layout([cell()]) }, { key: "b" }],
    };
    expect(layoutsOf(box, viewModel).map(({ path }) => path)).toEqual(["content", "tabs.0.content"]);
    expect(layoutsOf(box, { inputs: {}, on: {} })).toEqual([]);
    expect(layoutsOf(counter, { inputs: {}, on: {} })).toEqual([]);
  });
});

describe("innerOverlay", () => {
  it("re-keys the container's inner cells to their own ids, composing for a layout inside a layout", () => {
    const overlay = {
      pages: {
        demo: {
          cells: {
            "card-1/button": { view: "loud" },
            "card-1/card-2/x": { view: "deep" },
            "tabs-1/tabs.0.content/y": { view: "tab" },
            other: { view: "outer" },
          },
        },
      },
    };
    expect(innerOverlay(overlay, "demo", "card-1", "content")).toEqual({
      pages: { demo: { cells: { button: { view: "loud" }, "card-2/x": { view: "deep" } } } },
    });
    expect(innerOverlay(innerOverlay(overlay, "demo", "card-1", "content"), "demo", "card-2", "content")).toEqual({
      pages: { demo: { cells: { x: { view: "deep" } } } },
    });
    expect(innerOverlay(overlay, "demo", "tabs-1", "tabs.0.content")).toEqual({
      pages: { demo: { cells: { y: { view: "tab" } } } },
    });
    expect(innerOverlay(overlay, "demo", "nobody", "content")).toBeUndefined();
    expect(innerCellKey("card-1", "content", "b")).toBe("card-1/b");
    expect(innerCellKey("tabs-1", "tabs.1.content", "b")).toBe("tabs-1/tabs.1.content/b");
  });
});

describe("a widget that contains layouts", () => {
  it("must name settings it has", () => {
    const registry = createRegistry();
    expect(() => registry.register(box)).not.toThrow();
    expect(() => registry.register({ ...box, type: "bad", contains: ["body"] })).toThrow(
      /contains a layout at "body", which is not one of its settings/,
    );
  });

  it("is validated at boot into its layouts, the inner cells located under the container", () => {
    const report = (content: unknown) =>
      validateViewModels({
        viewModels: {
          pages: { demo: { default: layout([cell({ id: "box-1", widget: "box", model: "widgets.box" })]) } },
          widgets: {
            box: { default: { content } },
            counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n" }] } } },
          },
        },
        registry: registryWith(box, counter, plain),
        layoutEngines: enginesWith(listEngine),
      });
    expect(
      report(layout([cell({ id: "inner", widget: "counter" })])).errors.map((problem) => problem.location),
    ).toEqual([]);
    const broken = report(layout([cell({ id: "inner", widget: "ghost" })]));
    expect(broken.errors.map((problem) => [problem.location, problem.message])).toEqual([
      [
        "pages.demo.default cell[0] (#box-1) content cell[0] (#inner)",
        expect.stringContaining('unknown widget "ghost"'),
      ],
    ]);
    expect(report({ engine: "nope", cells: [] }).errors[0]?.message).toMatch(/unknown layout engine "nope"/);
  });

  it("refuses a layout nested too deep", () => {
    const nest = (depth: number): { engine: string; cells: unknown[] } =>
      depth === 0 ? layout([]) : layout([cell({ id: `box-${depth}`, widget: "box", model: `widgets.box${depth}` })]);
    const widgets: Record<string, unknown> = {};
    for (let depth = 1; depth <= MAX_LAYOUT_DEPTH; depth += 1)
      widgets[`box${depth}`] = { default: { content: nest(depth - 1) } };
    const report = validateViewModels({
      viewModels: { pages: { demo: { default: nest(MAX_LAYOUT_DEPTH) } }, widgets },
      registry: registryWith(box),
      layoutEngines: enginesWith(listEngine),
    });
    expect(report.errors.map((problem) => problem.message)).toEqual([
      `layouts nested too deep (at most ${MAX_LAYOUT_DEPTH})`,
    ]);
  });
});
