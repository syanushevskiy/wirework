/** The flex-rows plugin: the shared engine promises, its rows, and what edit mode's changes do to them. */
import { describe, expect, it } from "vitest";
import { layoutEngineProblems } from "@wirework/engine";
import { flexRowsEngine } from "../engine";
import { moveTarget } from "../operations";
import type { FlexRowsPage } from "../schema";

const cell = (id: string, classes?: string) => ({
  id,
  widget: "w",
  model: `widgets.${id}`,
  template: "default",
  ...(classes === undefined ? {} : { classes }),
});

/** Two rows: a and b side by side, c alone. */
const page = (): FlexRowsPage => ({
  engine: "flex-rows",
  rows: [{ classes: "items-center", cells: [cell("a", "flex-1"), cell("b")] }, { cells: [cell("c")] }],
});

const ids = (template: FlexRowsPage): string[][] => template.rows.map((row) => row.cells.map((c) => c.id));

describe("flexRowsEngine", () => {
  it("keeps every layout-engine promise", () => {
    expect(layoutEngineProblems(flexRowsEngine)).toEqual([]);
  });

  it("appends a row per cell, and drops a row once its last cell is removed", () => {
    const template = flexRowsEngine.appendCell(flexRowsEngine.appendCell(flexRowsEngine.empty(), cell("a")), cell("b"));
    expect(ids(template)).toEqual([["a"], ["b"]]);
    expect(ids(flexRowsEngine.removeCell(template, "a"))).toEqual([["b"]]);
  });

  it("lists cells across rows in reading order", () => {
    expect(flexRowsEngine.cells(page()).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("sets a cell's and a row's classes, trimmed, and drops the key when they are cleared", () => {
    const classed = flexRowsEngine.applyChange(page(), { kind: "cell", id: "b", classes: "  basis-1/3 self-end " });
    expect(classed.rows[0]?.cells[1]).toMatchObject({ id: "b", classes: "basis-1/3 self-end" });
    const cleared = flexRowsEngine.applyChange(classed, { kind: "cell", id: "a", classes: "" });
    expect(cleared.rows[0]?.cells[0]).toEqual(cell("a"));
    const row = flexRowsEngine.applyChange(page(), { kind: "row", row: 1, classes: "justify-between" });
    expect(row.rows[1]?.classes).toBe("justify-between");
    expect(flexRowsEngine.applyChange(row, { kind: "row", row: 0, classes: " " }).rows[0]).not.toHaveProperty(
      "classes",
    );
  });

  it("moves a cell within its row and across rows, a row left empty going with it, a new row made at either end", () => {
    const apply = (template: FlexRowsPage, id: string, direction: "left" | "right" | "up" | "down") => {
      const change = moveTarget(template, id, direction);
      if (!change) throw new Error(`no move for ${id}`);
      return flexRowsEngine.applyChange(template, change);
    };
    expect(ids(apply(page(), "b", "left"))).toEqual([["b", "a"], ["c"]]);
    expect(ids(apply(page(), "a", "right"))).toEqual([["b", "a"], ["c"]]);
    expect(ids(apply(page(), "c", "up"))).toEqual([["a", "b", "c"]]);
    expect(ids(apply(page(), "a", "down"))).toEqual([["b"], ["a", "c"]]);
    expect(ids(apply(page(), "b", "down"))).toEqual([["a"], ["b", "c"]]);
    // Before the first row, or past the last: a new one. Alone in its row already: nothing changes.
    expect(ids(apply(page(), "a", "up"))).toEqual([["a"], ["b"], ["c"]]);
    expect(ids(flexRowsEngine.applyChange(page(), { kind: "move", id: "a", row: 2, index: 0 }))).toEqual([
      ["b"],
      ["c"],
      ["a"],
    ]);
    expect(ids(apply(page(), "c", "down"))).toEqual(ids(page()));
    // The row keeps its classes when a cell leaves it; an unknown cell moves nothing.
    expect(apply(page(), "b", "down").rows[0]?.classes).toBe("items-center");
    expect(moveTarget(page(), "nope", "up")).toBeUndefined();
    expect(flexRowsEngine.applyChange(page(), { kind: "move", id: "nope", row: 0, index: 0 })).toEqual(page());
  });

  it("names, per row and per cell, every class the vocabulary does not have", () => {
    const template: FlexRowsPage = {
      engine: "flex-rows",
      rows: [
        { classes: "justify-between bg-red-500", cells: [cell("a", "flex-1 p-4 text-sm"), cell("b", "self-end")] },
      ],
    };
    expect(flexRowsEngine.validate?.(template)).toEqual([
      "row 1: unknown classes bg-red-500 (Tailwind's layout classes only)",
      'cell "a": unknown classes text-sm (Tailwind\'s layout classes only)',
    ]);
    expect(flexRowsEngine.validate?.(page())).toEqual([]);
  });
});
