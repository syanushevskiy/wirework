/** The grid operations both grid engines are built on. */
import { describe, expect, it } from "vitest";
import { gridOperations, gridPlacementsSchema, type GridTemplate } from "../index";

interface Template extends GridTemplate {
  engine: "test-grid";
}

const grid = gridOperations<Template>({ empty: () => ({ engine: "test-grid", cells: [] }) });
const cell = (id: string) => ({ id, widget: "w", model: `widgets.${id}`, template: "default" });

describe("gridOperations", () => {
  it("appends each cell as a full-width band below the lowest one, two rows high", () => {
    const two = grid.appendCell(grid.appendCell(grid.empty(), cell("a")), cell("b"));
    expect(two.cells.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))).toEqual([
      { id: "a", x: 0, y: 0, w: 12, h: 2 },
      { id: "b", x: 0, y: 2, w: 12, h: 2 },
    ]);
    expect(grid.cells(two).map((placed) => placed.id)).toEqual(["a", "b"]);
  });

  it("respects the template's own column count and the engine's cell height", () => {
    const narrow = gridOperations<Template>({
      empty: () => ({ engine: "test-grid", cols: 6, cells: [] }),
      cellRows: 3,
    });
    expect(narrow.appendCell(narrow.empty(), cell("a")).cells[0]).toMatchObject({ w: 6, h: 3 });
  });

  it("removes a cell and leaves the others in place", () => {
    const two = grid.appendCell(grid.appendCell(grid.empty(), cell("a")), cell("b"));
    expect(grid.removeCell(two, "a").cells.map((placed) => placed.id)).toEqual(["b"]);
    expect(grid.removeCell(two, "ghost")).toEqual(two);
  });

  it("applyChange moves the cells a change names and ignores unknown ids", () => {
    const two = grid.appendCell(grid.appendCell(grid.empty(), cell("a")), cell("b"));
    const moved = grid.applyChange(two, { b: { x: 6, y: 0, w: 6, h: 2 }, ghost: { x: 0, y: 0, w: 1, h: 1 } });
    expect(moved.cells.find((placed) => placed.id === "b")).toMatchObject({ x: 6, y: 0, w: 6 });
    expect(moved.cells.find((placed) => placed.id === "a")).toEqual(two.cells[0]);
    expect(moved.cells).toHaveLength(2);
  });

  it("validate names a cell wider than the grid", () => {
    const template: Template = { engine: "test-grid", cells: [{ ...cell("a"), x: 8, y: 0, w: 6, h: 1 }] };
    expect(grid.validate(template)).toEqual(["cells[0] (#a) exceeds the grid: x 8 + w 6 > 12 columns"]);
    expect(grid.validate(grid.empty())).toEqual([]);
  });

  it("refuses a placement that is not whole and positive", () => {
    expect(gridPlacementsSchema.safeParse({ a: { x: 0, y: 0, w: 0, h: 1 } }).success).toBe(false);
    expect(gridPlacementsSchema.safeParse({ a: { x: 1.5, y: 0, w: 1, h: 1 } }).success).toBe(false);
    expect(gridPlacementsSchema.safeParse({ a: { x: 0, y: 0, w: 1, h: 1 } }).success).toBe(true);
  });
});
