/** The react-grid-layout plugin: the shared engine promises, and its placements. */
import { describe, expect, it } from "vitest";
import { layoutEngineProblems } from "@wirework/engine";
import { reactGridLayoutEngine } from "../engine";

const cell = (id: string) => ({ id, widget: "w", model: `widgets.${id}`, template: "default" });

describe("reactGridLayoutEngine", () => {
  it("keeps every layout-engine promise", () => {
    expect(layoutEngineProblems(reactGridLayoutEngine)).toEqual([]);
  });

  it("appends each cell as a full-width band below the lowest one", () => {
    const one = reactGridLayoutEngine.appendCell(reactGridLayoutEngine.empty(), cell("a"));
    const two = reactGridLayoutEngine.appendCell(one, cell("b"));
    expect(two.cells.map(({ id, x, y, w }) => ({ id, x, y, w }))).toEqual([
      { id: "a", x: 0, y: 0, w: 12 },
      { id: "b", x: 0, y: 2, w: 12 },
    ]);
  });

  it("applyChange moves reported cells only and ignores unknown ids", () => {
    const template = reactGridLayoutEngine.appendCell(reactGridLayoutEngine.appendCell(reactGridLayoutEngine.empty(), cell("a")), cell("b"));
    const moved = reactGridLayoutEngine.applyChange(template, { b: { x: 6, y: 0, w: 6, h: 2 }, ghost: { x: 0, y: 0, w: 1, h: 1 } });
    expect(moved.cells.find((c) => c.id === "b")).toMatchObject({ x: 6, y: 0, w: 6 });
    expect(moved.cells.find((c) => c.id === "a")).toEqual(template.cells[0]);
    expect(moved.cells).toHaveLength(2);
  });

  it("validate reports a cell wider than the grid", () => {
    const template = { engine: "react-grid-layout" as const, cells: [{ ...cell("a"), x: 8, y: 0, w: 6, h: 1 }] };
    expect(reactGridLayoutEngine.validate?.(template)).toEqual([expect.stringMatching(/exceeds the grid/)]);
  });
});
