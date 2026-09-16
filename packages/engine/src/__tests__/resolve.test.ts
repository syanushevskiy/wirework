/**
 * Page resolution: the fallback chain, every cell problem, and the
 * invariants that used to hold only by convention.
 */
import { describe, expect, it } from "vitest";
import { createActions, pickTemplate, resolvePage, type ResolveInput } from "../index";
import { cell, counter, enginesWith, listEngine, page, plain, registryWith } from "./fixtures";

const templates = { counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n", from: "value" }] } } } };

const input = (overrides: Partial<ResolveInput> = {}): ResolveInput => ({
  viewModels: page([cell()], templates),
  page: "demo",
  registry: registryWith(counter, plain),
  layoutEngines: enginesWith(listEngine),
  ...overrides,
});

const plan = (overrides: Partial<ResolveInput> = {}) => resolvePage(input(overrides));

describe("pickTemplate", () => {
  it("takes the first present candidate and reports a fallback", () => {
    expect(pickTemplate({ default: {} }, ["missing", "default"])).toEqual({
      name: "default",
      fallback: { requested: "missing", used: "default" },
    });
    expect(pickTemplate({ loud: {} }, ["loud", "default"])).toEqual({ name: "loud" });
    expect(pickTemplate({}, ["default"])).toBeUndefined();
  });

  it("regression: never resolves an inherited member as a template", () => {
    expect(pickTemplate({ default: {} }, ["valueOf", "default"])?.name).toBe("default");
    expect(pickTemplate({}, ["toString"])).toBeUndefined();
  });
});

describe("resolvePage", () => {
  it("resolves a healthy page", () => {
    const resolved = plan();
    expect(resolved.problem).toBeUndefined();
    if (resolved.problem !== undefined) return;
    expect(resolved.engine).toBe("list");
    expect(resolved.cells).toHaveLength(1);
    expect(resolved.cells[0]?.problem).toBeUndefined();
    expect(resolved.cells[0]?.viewModel).toMatchObject({ label: "Count" });
  });

  it("reports an unknown page, view and layout engine as page problems", () => {
    expect(plan({ page: "nope" }).problem).toMatch(/Unknown page/);
    expect(
      plan({ viewModels: { pages: { demo: { other: { engine: "list", cells: [] } } }, widgets: {} } }).problem,
    ).toMatch(/no template "default"/);
    expect(
      plan({ viewModels: { pages: { demo: { default: { engine: "nope", cells: [] } } }, widgets: {} } }).problem,
    ).toMatch(/unknown layout engine/);
  });

  it("reports each cell problem by kind", () => {
    const kinds = (input: Partial<ResolveInput>) => {
      const resolved = plan(input);
      return resolved.problem === undefined ? resolved.cells.map((c) => c.problem?.kind) : [resolved.problem];
    };
    expect(kinds({ viewModels: page([cell({ widget: "ghost" })], templates) })).toEqual(["unknown-widget"]);
    expect(kinds({ viewModels: page([cell({ model: "widgets.nowhere" })], templates) })).toEqual(["dangling-model-path"]);
    expect(kinds({ viewModels: page([cell({ template: "loud" })], { counter: { other: {} } }) })).toEqual(["missing-template"]);
    expect(kinds({ viewModels: page([cell()], { counter: { default: { inputs: { value: 42 } } } }) })).toEqual(["invalid-view-model"]);
    // The schema accepts this template; the CONTRACT does not, because a
    // required event with no reaction leaves widget state nowhere to go.
    expect(kinds({ viewModels: page([cell()], { counter: { default: { inputs: { value: "demo.n" } } } }) })).toEqual([
      "unmet-contract",
    ]);
  });

  it("regression: a repeated cell id is a problem, not a second live cell", () => {
    const resolved = plan({ viewModels: page([cell(), cell()], templates) });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.cells[0]?.problem).toBeUndefined();
    expect(resolved.cells[1]?.problem?.kind).toBe("duplicate-cell-id");
  });

  it("regression: a structurally broken overlay is ignored, not applied", () => {
    const resolved = plan({
      userViewModels: { pages: { demo: { view: "mine", templates: { mine: { engine: "list", cells: [] } }, cells: [] } } } as never,
    });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.view).toBe("default");
    expect(resolved.cells).toHaveLength(1);
  });

  it("applies a valid overlay: selected view and per-cell settings", () => {
    const resolved = plan({
      viewModels: page([cell()], { counter: { ...templates.counter, loud: { ...templates.counter.default, label: "LOUD" } } }),
      userViewModels: { pages: { demo: { cells: { c1: { view: "loud", settings: { loud: { label: "OVERRIDE" } } } } } } },
    });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.cells[0]?.template).toBe("loud");
    expect(resolved.cells[0]?.viewModel).toMatchObject({ label: "OVERRIDE" });
  });

  it("reports a reaction calling an unregistered action", () => {
    const resolved = plan({
      viewModels: page([cell()], { counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ call: "nope" }] } } } }),
      actions: createActions(),
    });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.cells[0]?.problem?.kind).toBe("unmet-contract");
  });

  it("regression: an engine that throws while listing cells is a page problem", () => {
    const broken = {
      ...listEngine,
      name: "broken",
      template: { parse: (raw: unknown) => raw },
      cells: () => {
        throw new Error("engine bug");
      },
    };
    const resolved = plan({
      layoutEngines: enginesWith(listEngine, broken),
      viewModels: { pages: { demo: { default: { engine: "broken", cells: [] } } }, widgets: {} },
    });
    expect(resolved.problem).toMatch(/failed to list cells: engine bug/);
  });
});
