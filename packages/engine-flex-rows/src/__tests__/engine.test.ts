/** The flex-rows plugin: the shared engine promises, and its rows. */
import { describe, expect, it } from "vitest";
import { layoutEngineProblems } from "@wirework/engine";
import { flexRowsEngine } from "../engine";

const cell = (id: string) => ({ id, widget: "w", model: `widgets.${id}`, template: "default" });

describe("flexRowsEngine", () => {
  it("keeps every layout-engine promise", () => {
    expect(layoutEngineProblems(flexRowsEngine)).toEqual([]);
  });

  it("appends a full-width row per cell, and drops a row once its last cell is removed", () => {
    const template = flexRowsEngine.appendCell(flexRowsEngine.appendCell(flexRowsEngine.empty(), cell("a")), cell("b"));
    expect(template.rows).toHaveLength(2);
    expect(template.rows[0]?.[0]).toMatchObject({ id: "a", width: "full" });
    expect(flexRowsEngine.removeCell(template, "a").rows).toHaveLength(1);
  });

  it("lists cells across rows in reading order", () => {
    const template = {
      engine: "flex-rows" as const,
      rows: [
        [{ ...cell("a"), width: "m-6/12" }, { ...cell("b"), width: "m-6/12" }],
        [{ ...cell("c"), width: "full" }],
      ],
    };
    expect(flexRowsEngine.cells(template).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
