/** Boot validation: severity, and the same answers the renderer gives. */
import { describe, expect, it } from "vitest";
import { createActions, validateViewModels, type ValidationReport } from "../index";
import { cell, counter, enginesWith, listEngine, page, plain, registryWith } from "./fixtures";

const templates = { counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n", from: "value" }] } } } };
const registry = () => registryWith(counter, plain);
const engines = () => enginesWith(listEngine);

const check = (viewModels: unknown, userViewModels?: unknown, actions = createActions()): ValidationReport =>
  validateViewModels(registry(), engines(), viewModels as never, userViewModels as never, actions);

const messages = (report: ValidationReport, severity: "error" | "warning") =>
  report.problems.filter((problem) => problem.severity === severity).map((problem) => problem.message);

describe("validateViewModels", () => {
  it("passes a healthy tree", () => {
    const report = check(page([cell()], templates));
    expect(report).toMatchObject({ ok: true, problems: [], errors: [], warnings: [] });
  });

  it("regression: shape-checks the base tree instead of walking garbage", () => {
    const report = check({ pages: "abc", widgets: {} });
    expect(report.ok).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]?.message).toMatch(/invalid view models/);
  });

  it("reports unknown widgets, dangling models and rejected templates as errors", () => {
    expect(messages(check(page([cell({ widget: "ghost" })], templates)), "error")[0]).toMatch(/unknown widget "ghost"/);
    expect(messages(check(page([cell({ model: "widgets.nowhere" })], templates)), "error")[0]).toMatch(/dangling model path/);
    expect(messages(check(page([cell()], { counter: { default: { inputs: { value: 1 } } } })), "error")[0]).toMatch(
      /rejected by the widget/,
    );
  });

  it("regression: an engaged fallback is a WARNING, so the report stays ok", () => {
    const report = check(page([cell({ template: "loud" })], templates));
    expect(report.ok).toBe(true);
    expect(messages(report, "warning")[0]).toMatch(/falling back to "default"/);
  });

  it("regression: a duplicate cell id is reported once, as an error", () => {
    const report = check(page([cell(), cell()], templates));
    expect(messages(report, "error")).toEqual([expect.stringMatching(/duplicate cell id "c1"/)]);
  });

  it("reports a broken overlay once and says it is ignored", () => {
    const report = check(page([cell()], templates), { pages: { demo: { cells: [] } } });
    expect(report.ok).toBe(false);
    expect(messages(report, "error")[0]).toMatch(/invalid user view models.*ignored entirely/s);
  });

  it("reports dead user configuration", () => {
    const report = check(page([cell()], templates), {
      pages: { demo: { view: "nope", cells: { c1: { settings: { ghost: { label: "x" } } } } }, other: {} },
    });
    expect(messages(report, "warning")).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/user-selected page view "nope" does not exist/),
        expect.stringMatching(/user settings reference unknown template "ghost"/),
      ]),
    );
    expect(messages(report, "error")).toEqual([expect.stringMatching(/unknown page "other"/)]);
  });

  it("validates the user's OWN page templates at their own location", () => {
    const report = check(page([cell()], templates), {
      pages: { demo: { templates: { mine: { engine: "nope", cells: [] } } } },
    });
    expect(report.problems[0]?.location).toBe("user pages.demo.templates.mine");
    expect(report.problems[0]?.message).toMatch(/unknown layout engine/);
  });

  it("agrees with the renderer about a reaction calling an unknown action", () => {
    const withCall = page([cell()], { counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ call: "nope" }] } } } });
    expect(messages(check(withCall), "error")[0]).toMatch(/unknown actions: nope/);
  });
});
