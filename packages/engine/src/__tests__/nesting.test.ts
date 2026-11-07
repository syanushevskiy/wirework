/**
 * Layouts inside widgets: which layouts a container holds, the overlay as
 * the cells inside see it, the registry's check of `contains`, and boot
 * validation walking into a card — and refusing one too deep.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NO_EVENTS, widgetBindingsSchema, pageViewModelSchema, type AnyWidgetDefinition } from "@wirework/schema";
import { createRegistry, validateViewModels } from "../index";
import {
  innerCellKey,
  innerOverlay,
  innerOverlays,
  innerOverlaysAt,
  layoutPathAt,
  layoutsOf,
  locateLayoutAt,
  MAX_LAYOUT_DEPTH,
  updateUserLayoutAt,
} from "../nesting";
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

describe("the layout at a chain — located, as the user sees it, and the user's own copy of it", () => {
  const engines = enginesWith(listEngine);
  const inner = layout([cell({ id: "inner", widget: "box", model: "widgets.inner" })]);
  const viewModels = {
    pages: { demo: { default: layout([cell({ id: "box-1", widget: "box", model: "widgets.box-1" })]) } },
    widgets: {
      "box-1": { default: { content: inner, tabs: [{ key: "a", content: layout([cell({ id: "a1" })]) }] } },
      inner: { default: { content: layout([cell({ id: "deep" })]) } },
    },
  };
  const mine = layout([cell({ id: "mine" })]);
  const overlay = {
    pages: {
      demo: {
        cells: {
          "box-1": { settings: { default: { content: mine } } },
          "box-1/inner": { settings: { default: { content: layout([]) } } },
          "box-1/mine": { view: "loud" },
          "box-1/inner/deep": { view: "deep" },
        },
      },
    },
  };

  it("finds the base layout's path and the container's setting that holds it, for a setting and for an item of a list", () => {
    expect(locateLayoutAt(engines, viewModels, [], "demo", "box-1")).toEqual({
      path: ["widgets", "box-1", "default", "content"],
      container: { key: "box-1", template: "default" },
      holder: { setting: "content", value: inner, within: [] },
      template: inner,
    });
    expect(locateLayoutAt(engines, viewModels, [], "demo", "box-1/tabs.0.content")).toMatchObject({
      path: ["widgets", "box-1", "default", "tabs", "0", "content"],
      holder: { setting: "tabs", within: ["0", "content"] },
      template: layout([cell({ id: "a1" })]),
    });
    expect(layoutPathAt(engines, viewModels, "demo", "box-1/inner")).toEqual([
      "widgets",
      "inner",
      "default",
      "content",
    ]);
    expect(locateLayoutAt(engines, viewModels, [], "demo", "nobody")).toBeUndefined();
    expect(locateLayoutAt(engines, viewModels, [], "demo", "box-1/nobody")).toBeUndefined();
  });

  it("shows the user's own copy under the container's overlay key, a layout inside it read from that copy", () => {
    expect(locateLayoutAt(engines, viewModels, [overlay], "demo", "box-1")).toMatchObject({ template: mine });
    // The user's copy of box-1 has no "inner" cell any more, so the chain below it leads nowhere for them.
    expect(locateLayoutAt(engines, viewModels, [overlay], "demo", "box-1/inner")).toBeUndefined();
    const base = { pages: overlay.pages.demo.cells["box-1/inner"] };
    expect(
      locateLayoutAt(
        engines,
        viewModels,
        [{ pages: { demo: { cells: { "box-1/inner": base.pages } } } }],
        "demo",
        "box-1/inner",
      ),
    ).toMatchObject({ container: { key: "box-1/inner", template: "default" }, template: layout([]) });
  });

  it("reads a container's layout through every layer in order: a role's copy, then the user's over it", () => {
    const role = { pages: { demo: { cells: { "box-1": { settings: { default: { content: layout([]) } } } } } } };
    expect(locateLayoutAt(engines, viewModels, [role], "demo", "box-1")).toMatchObject({ template: layout([]) });
    expect(locateLayoutAt(engines, viewModels, [role, overlay], "demo", "box-1")).toMatchObject({ template: mine });
    // A role's own page template is searched for the chain's first cell like a base one.
    const roleLayout = {
      pages: { demo: { templates: { admin: layout([cell({ id: "box-2", widget: "box", model: "widgets.box-1" })]) } } },
    };
    expect(locateLayoutAt(engines, viewModels, [roleLayout], "demo", "box-2")).toMatchObject({
      container: { key: "box-2", template: "default" },
      template: inner,
    });
  });

  it("writes the user's own copy as the container's setting, the user's other settings kept — the whole list for a tab", () => {
    const located = locateLayoutAt(engines, viewModels, [], "demo", "box-1");
    if (!located) throw new Error("not located");
    const own = { pages: { demo: { cells: { "box-1": { settings: { default: { title: "Mine" } } } } } } };
    expect(updateUserLayoutAt(own, "demo", located, mine)).toEqual({
      pages: { demo: { cells: { "box-1": { settings: { default: { title: "Mine", content: mine } } } } } },
    });
    const tab = locateLayoutAt(engines, viewModels, [], "demo", "box-1/tabs.0.content");
    if (!tab) throw new Error("not located");
    expect(updateUserLayoutAt({}, "demo", tab, mine)).toEqual({
      pages: { demo: { cells: { "box-1": { settings: { default: { tabs: [{ key: "a", content: mine }] } } } } } },
    });
  });

  it("narrows every overlay to the cells of the layout at a chain, keyed under the nested page name", () => {
    expect(innerOverlaysAt([overlay], "demo", "box-1", "demo/box-1")).toEqual([
      {
        pages: {
          "demo/box-1": {
            cells: {
              inner: { settings: { default: { content: layout([]) } } },
              mine: { view: "loud" },
              "inner/deep": { view: "deep" },
            },
          },
        },
      },
    ]);
    expect(innerOverlaysAt([overlay], "demo", "box-1/inner", "demo/box-1/inner")).toEqual([
      { pages: { "demo/box-1/inner": { cells: { deep: { view: "deep" } } } } },
    ]);
    // A layer with nothing for the cells inside is left out, so the list keeps the order of the ones that have.
    const role = { pages: { demo: { cells: { "box-1/mine": { view: "role" } } } } };
    expect(innerOverlaysAt([role, {}, overlay], "demo", "box-1", "demo/box-1").map((o) => o.pages)).toEqual([
      { "demo/box-1": { cells: { mine: { view: "role" } } } },
      expect.objectContaining({ "demo/box-1": expect.objectContaining({ cells: expect.anything() }) }),
    ]);
    expect(innerOverlaysAt([overlay], "demo", "nobody", "demo/nobody")).toEqual([]);
    expect(innerOverlaysAt([], "demo", "box-1", "demo/box-1")).toEqual([]);
    expect(innerOverlays([role, overlay], "demo", "box-1", "content")).toEqual([
      { pages: { demo: { cells: { mine: { view: "role" } } } } },
      innerOverlay(overlay, "demo", "box-1", "content"),
    ]);
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
