/** The gridstack plugin: the shared engine promises, and its placements. */
import { describe, expect, it } from "vitest";
import { layoutEngineProblems } from "@wirework/engine";
import { gridstackEngine } from "../engine";

const cell = (id: string) => ({ id, widget: "w", model: `widgets.${id}`, template: "default" });

describe("gridstackEngine", () => {
  it("keeps every layout-engine promise", () => {
    expect(layoutEngineProblems(gridstackEngine)).toEqual([]);
  });

  it("applyChange moves reported cells only and ignores unknown ids", () => {
    const template = gridstackEngine.appendCell(gridstackEngine.appendCell(gridstackEngine.empty(), cell("a")), cell("b"));
    const moved = gridstackEngine.applyChange(template, { a: { x: 0, y: 4, w: 6, h: 2 }, ghost: { x: 0, y: 0, w: 1, h: 1 } });
    expect(moved.cells.find((c) => c.id === "a")).toMatchObject({ y: 4, w: 6 });
    expect(moved.cells.find((c) => c.id === "b")).toEqual(template.cells[1]);
  });

  it("validate reports a cell wider than the grid", () => {
    const template = { engine: "gridstack" as const, cells: [{ ...cell("a"), x: 10, y: 0, w: 4, h: 2 }] };
    expect(gridstackEngine.validate?.(template)).toEqual([expect.stringMatching(/exceeds the grid/)]);
  });
});
