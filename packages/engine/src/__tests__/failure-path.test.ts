/**
 * The failure-path fixture (@wirework/view-data-models-examples): every cell
 * of page "broken" is wrong in a documented way, and resolution must report
 * EACH one as its own typed problem — or render it, where rendering is the
 * point (crash isolation happens in the adapter, the fallback is reported).
 * The widgets are the standard contracts plus minimal stand-ins with the
 * antd types' declarations; the layout engine is a stand-in flex-rows.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { AnyLayoutEngine, AnyWidgetDefinition, CellBase, PageViewModel } from "@wirework/schema";
import { failurePathViewModels } from "@wirework/view-data-models-examples";
import { buttonContract, labelContract } from "@wirework/widget-contracts";
import { createActions, resolvePage, validateViewModels, type ResolvedPagePlan } from "../index";
import { enginesWith, registryWith } from "./fixtures";

const component = () => null;
const label: AnyWidgetDefinition = { ...labelContract, type: "antd-label", component };
const button: AnyWidgetDefinition = { ...buttonContract, type: "antd-button", component };
const counterIo = { inputs: { value: { value: z.number(), default: 0 } } };
const counterEvents = { incremented: { payload: z.object({ value: z.number() }), required: true, primary: "value" } };
const counter: AnyWidgetDefinition = {
  type: "antd-counter",
  io: counterIo,
  events: counterEvents,
  viewModel: z
    .object({
      inputs: z.object({ value: z.string() }).strict(),
      on: z.object({ incremented: z.array(z.unknown()).optional() }).strict().default({}),
      step: z.number().default(1),
      label: z.string().default("Increment"),
    })
    .strict(),
  component,
};
const crash: AnyWidgetDefinition = {
  type: "antd-crash",
  io: { inputs: {} },
  events: {},
  viewModel: z.object({ inputs: z.object({}).strict().default({}), on: z.object({}).strict().default({}), message: z.string() }).strict(),
  component,
};

interface RowsTemplate extends PageViewModel {
  rows: CellBase[][];
}
const flexRows: AnyLayoutEngine = {
  name: "flex-rows",
  template: { parse: (raw: unknown) => raw as RowsTemplate },
  empty: () => ({ engine: "flex-rows", rows: [] }),
  cells: (template: RowsTemplate) => template.rows.flat(),
  appendCell: (template: RowsTemplate) => template,
  removeCell: (template: RowsTemplate) => template,
  applyChange: (template: RowsTemplate) => template,
  renderer: component,
};

const input = () => ({
  viewModels: failurePathViewModels,
  page: "broken",
  registry: registryWith(label, button, counter, crash),
  layoutEngines: enginesWith(flexRows),
  actions: createActions(),
});

describe("failurePathViewModels", () => {
  const plan = resolvePage(input()) as ResolvedPagePlan;
  const byId = (id: string) => plan.cells.find((cell) => cell.key === id);

  it("resolves the page itself", () => {
    expect(plan.problem).toBeUndefined();
    expect(plan.cells).toHaveLength(10);
  });

  it.each([
    ["ghost", "unknown-widget"],
    ["dangling", "dangling-model-path"],
    ["bad-template", "invalid-view-model"],
    ["orphan", "missing-template"],
    ["bad-reaction", "invalid-view-model"],
    ["unreacted", "unmet-contract"],
    ["bad-action", "unmet-contract"],
  ])("cell %s is reported as %s", (id, kind) => {
    expect(byId(id)?.problem?.kind).toBe(kind);
  });

  it("renders what should render: the crashing widget (isolated later), its healthy neighbour", () => {
    expect(byId("crash")?.problem).toBeUndefined();
    expect(byId("healthy")?.problem).toBeUndefined();
  });

  it("a missing template with a default falls back — and says so", () => {
    expect(byId("fallback-label")?.problem).toBeUndefined();
    expect(byId("fallback-label")?.fallback).toEqual({ requested: "nope", used: "default" });
  });

  it("boot validation reports every broken cell, with the fallback as a warning", () => {
    const { registry, layoutEngines, actions } = input();
    const report = validateViewModels(registry, layoutEngines, failurePathViewModels, undefined, actions);
    expect(report.ok).toBe(false);
    const cells = (severity: "error" | "warning") =>
      report.problems.filter((problem) => problem.severity === severity).map((problem) => /#([\w-]+)/.exec(problem.location)?.[1]);
    expect(new Set(cells("error"))).toEqual(
      new Set(["ghost", "dangling", "bad-template", "orphan", "bad-reaction", "unreacted", "bad-action"]),
    );
    expect(cells("warning")).toEqual(["fallback-label"]);
  });
});
