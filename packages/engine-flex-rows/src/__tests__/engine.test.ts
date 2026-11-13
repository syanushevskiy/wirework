/** The flex-rows plugin: the shared engine promises, its rows, and what edit mode's changes do to them. */
import { describe, expect, it } from "vitest";
import { layoutEngineProblems } from "@wirework/engine";
import { flexRowsEngine } from "../engine";
import { dropChange } from "../operations";
import type { FlexDrop, FlexRowsPage } from "../schema";

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

  /** The template after the cell is dropped there — the drop must change something. */
  const drop = (template: FlexRowsPage, id: string, where: FlexDrop): FlexRowsPage => {
    const change = dropChange(template, id, where);
    if (!change) throw new Error(`the drop of ${id} changes nothing`);
    return flexRowsEngine.applyChange(template, change);
  };

  it("drops a cell before or after another, in its row or across rows, a row left empty going with it", () => {
    expect(ids(drop(page(), "b", { on: "cell", id: "a", side: "before" }))).toEqual([["b", "a"], ["c"]]);
    expect(ids(drop(page(), "a", { on: "cell", id: "b", side: "after" }))).toEqual([["b", "a"], ["c"]]);
    expect(ids(drop(page(), "c", { on: "cell", id: "b", side: "after" }))).toEqual([["a", "b", "c"]]);
    expect(ids(drop(page(), "c", { on: "cell", id: "b", side: "before" }))).toEqual([["a", "c", "b"]]);
    expect(ids(drop(page(), "a", { on: "cell", id: "c", side: "before" }))).toEqual([["b"], ["a", "c"]]);
    // The row keeps its classes when a cell leaves it, and the cell its own.
    const across = drop(page(), "a", { on: "cell", id: "c", side: "after" });
    expect(across.rows[0]?.classes).toBe("items-center");
    expect(across.rows[1]?.cells[1]).toEqual(cell("a", "flex-1"));
    // Where it already is — on itself, or on the side of its neighbour it stands at — nothing changes.
    expect(dropChange(page(), "a", { on: "cell", id: "a", side: "swap" })).toBeUndefined();
    expect(dropChange(page(), "a", { on: "cell", id: "b", side: "before" })).toBeUndefined();
    expect(dropChange(page(), "b", { on: "cell", id: "a", side: "after" })).toBeUndefined();
    expect(dropChange(page(), "a", { on: "cell", id: "nope", side: "before" })).toBeUndefined();
  });

  it("swaps two cells' places, each keeping its classes", () => {
    const swapped = drop(page(), "a", { on: "cell", id: "c", side: "swap" });
    expect(ids(swapped)).toEqual([["c", "b"], ["a"]]);
    expect(swapped.rows[1]?.cells[0]).toEqual(cell("a", "flex-1"));
    expect(ids(drop(page(), "b", { on: "cell", id: "a", side: "swap" }))).toEqual([["b", "a"], ["c"]]);
    // An unknown cell swaps with nobody.
    expect(flexRowsEngine.applyChange(page(), { kind: "swap", id: "a", with: "nope" })).toEqual(page());
    expect(flexRowsEngine.applyChange(page(), { kind: "swap", id: "nope", with: "a" })).toEqual(page());
  });

  it("gives a cell dropped between two rows a row of its own, wherever that is", () => {
    expect(ids(drop(page(), "b", { on: "gap", row: 0 }))).toEqual([["b"], ["a"], ["c"]]);
    expect(ids(drop(page(), "a", { on: "gap", row: 1 }))).toEqual([["b"], ["a"], ["c"]]);
    expect(ids(drop(page(), "a", { on: "gap", row: 2 }))).toEqual([["b"], ["c"], ["a"]]);
    // A cell alone in its row, dropped on the strip above or below it, stays where it is.
    expect(dropChange(page(), "c", { on: "gap", row: 1 })).toBeUndefined();
    expect(dropChange(page(), "c", { on: "gap", row: 2 })).toBeUndefined();
    expect(ids(drop(page(), "c", { on: "gap", row: 0 }))).toEqual([["c"], ["a", "b"]]);
  });

  it("still moves a cell to a place by number: before the first row or past the last makes a new one", () => {
    expect(ids(flexRowsEngine.applyChange(page(), { kind: "move", id: "a", row: -1, index: 0 }))).toEqual([
      ["a"],
      ["b"],
      ["c"],
    ]);
    expect(ids(flexRowsEngine.applyChange(page(), { kind: "move", id: "a", row: 2, index: 0 }))).toEqual([
      ["b"],
      ["c"],
      ["a"],
    ]);
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
