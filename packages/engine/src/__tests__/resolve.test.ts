/**
 * Page resolution: the fallback chain, every cell problem, and the
 * invariants that used to hold only by convention.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { createActions, resolvePage, type ResolveInput } from "../index";
import { defaultReaction, sameReaction, withDefaultReactions } from "../reactions";
import { checkTemplate, pickTemplate } from "../resolve";
import { cell, counter, enginesWith, listEngine, page, plain, registryWith } from "./fixtures";

const templates = {
  counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n", from: "value" }] } } },
};

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

describe("default write-back — an event that writesBack to a port", () => {
  /** The counter as a CONTROLLED widget: `changed` writes the value back to `value` by default. */
  const dial: AnyWidgetDefinition = {
    ...counter,
    type: "dial",
    events: { changed: { payload: z.object({ value: z.number() }), primary: "value", writesBack: "value" } },
  };
  const fallback = { set: "demo.n", from: "value" };
  const on = (template: Record<string, unknown>) =>
    (checkTemplate(dial, template, undefined).viewModel as { on: Record<string, unknown[]> }).on;

  it("needs no reaction in the template: the default is in the resolved view model, first", () => {
    expect(checkTemplate(dial, { inputs: { value: "demo.n" } }, undefined).problem).toBeUndefined();
    expect(on({ inputs: { value: "demo.n" } })).toEqual({ changed: [fallback] });
    expect(on({ inputs: { value: "demo.n" }, on: { changed: [{ call: "runs/load" }] } })).toEqual({
      changed: [fallback, { call: "runs/load" }],
    });
  });

  it("is not doubled when the template spells it out — wherever it placed it", () => {
    expect(on({ inputs: { value: "demo.n" }, on: { changed: [fallback] } })).toEqual({ changed: [fallback] });
    const placed = { changed: [{ call: "runs/load" }, fallback] };
    expect(on({ inputs: { value: "demo.n" }, on: placed })).toEqual(placed);
  });

  it("follows the port: the path bound, the primary field, the whole payload without one", () => {
    const changed = dial.events["changed"];
    if (!changed) throw new Error("dial declares changed");
    expect(defaultReaction(changed, { value: "demo.n" })).toEqual(fallback);
    expect(defaultReaction({ ...changed, primary: undefined }, { value: "demo.n" })).toEqual({ set: "demo.n" });
    expect(defaultReaction(changed, {})).toBeUndefined();
    expect(defaultReaction({ payload: changed.payload }, { value: "demo.n" })).toBeUndefined();
    // A widget without one is left exactly as parsed.
    const parsed = { inputs: { value: "demo.n" }, on: { changed: [fallback] } };
    expect(withDefaultReactions(counter, parsed)).toBe(parsed);
  });

  it("sameReaction: the same write, or the same call with the same arguments", () => {
    expect(sameReaction({ set: "a", from: "v" }, { set: "a", from: "v" })).toBe(true);
    expect(sameReaction({ set: "a" }, { set: "a", from: "v" })).toBe(false);
    expect(sameReaction({ set: "a", value: 1 }, { set: "a", value: 1 })).toBe(true);
    expect(sameReaction({ set: "a", value: 1 }, { set: "a" })).toBe(false);
    expect(sameReaction({ call: "x", with: { a: 1 } }, { call: "x", with: { a: 1 } })).toBe(true);
    expect(sameReaction({ call: "x" }, { set: "x" })).toBe(false);
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
    expect(kinds({ viewModels: page([cell({ model: "widgets.nowhere" })], templates) })).toEqual([
      "dangling-model-path",
    ]);
    expect(kinds({ viewModels: page([cell({ template: "loud" })], { counter: { other: {} } }) })).toEqual([
      "missing-template",
    ]);
    expect(kinds({ viewModels: page([cell()], { counter: { default: { inputs: { value: 42 } } } }) })).toEqual([
      "invalid-view-model",
    ]);
    // The schema accepts this template; the CONTRACT does not, because a
    // required event with no reaction leaves widget state nowhere to go.
    expect(kinds({ viewModels: page([cell()], { counter: { default: { inputs: { value: "demo.n" } } } }) })).toEqual([
      "unmet-contract",
    ]);
  });

  it("a model path holding anything but a plain object is dangling — the same rule as boot validation", () => {
    const resolved = plan({ viewModels: page([cell()], { counter: [templates.counter.default] }) });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.cells[0]?.problem?.kind).toBe("dangling-model-path");
  });

  it("regression: a repeated cell id is a problem, not a second live cell", () => {
    const resolved = plan({ viewModels: page([cell(), cell()], templates) });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.cells[0]?.problem).toBeUndefined();
    expect(resolved.cells[1]?.problem?.kind).toBe("duplicate-cell-id");
  });

  it("regression: a structurally broken overlay is ignored, not applied", () => {
    const resolved = plan({
      userViewModels: {
        pages: { demo: { view: "mine", templates: { mine: { engine: "list", cells: [] } }, cells: [] } },
      } as never,
    });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.view).toBe("default");
    expect(resolved.cells).toHaveLength(1);
    // ...and never silently: the plan says why the user's view is not applied.
    expect(resolved.overlayProblem).toMatch(/user view models ignored/);
  });

  it("regression: the layout engine's validation findings are warnings on the plan", () => {
    const strict = {
      ...listEngine,
      name: "strict",
      template: { parse: (raw: unknown) => raw },
      validate: () => ["cell c1 has no tab"],
    };
    const resolved = plan({
      layoutEngines: enginesWith(listEngine, strict),
      viewModels: { pages: { demo: { default: { engine: "strict", cells: [cell()] } } }, widgets: templates },
    });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.warnings).toEqual(["cell c1 has no tab"]);
    expect(resolved.cells[0]?.problem).toBeUndefined();
  });

  it("the page's own fallback is reported, and a user template overrides a base one of the same name", () => {
    const fallback = plan({ userViewModels: { pages: { demo: { view: "gone" } } } });
    expect(fallback.fallback).toEqual({ requested: "gone", used: "default" });
    const overridden = plan({
      userViewModels: { pages: { demo: { templates: { default: { engine: "list", cells: [] } } } } },
    });
    if (overridden.problem !== undefined) throw new Error("expected a plan");
    expect(overridden.cells).toHaveLength(0);
  });

  it("applies a valid overlay: selected view and per-cell settings", () => {
    const resolved = plan({
      viewModels: page([cell()], {
        counter: { ...templates.counter, loud: { ...templates.counter.default, label: "LOUD" } },
      }),
      userViewModels: {
        pages: { demo: { cells: { c1: { view: "loud", settings: { loud: { label: "OVERRIDE" } } } } } },
      },
    });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.cells[0]?.template).toBe("loud");
    expect(resolved.cells[0]?.viewModel).toMatchObject({ label: "OVERRIDE" });
  });

  it("reports a reaction calling an unregistered action", () => {
    const resolved = plan({
      viewModels: page([cell()], {
        counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ call: "nope" }] } } },
      }),
      actions: createActions(),
    });
    if (resolved.problem !== undefined) throw new Error("expected a plan");
    expect(resolved.cells[0]?.problem?.kind).toBe("unmet-contract");
  });

  it("regression: a reaction list left explicitly undefined is no reaction — a problem, never a crash", () => {
    const resolved = plan({
      viewModels: page([cell()], { counter: { default: { inputs: { value: "demo.n" }, on: { changed: undefined } } } }),
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
