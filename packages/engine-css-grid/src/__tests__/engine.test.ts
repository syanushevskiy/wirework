/** The css-grid plugin: the shared engine promises, its picture, and what edit mode's changes do to it. */
import { describe, expect, it } from "vitest";
import { layoutEngineProblems } from "@wirework/engine";
import { cssGridEngine } from "../engine";
import type { CssGridPage } from "../schema";

const cell = (id: string) => ({ id, widget: "w", model: `widgets.${id}`, template: "default" });

/** The run page's skeleton in small: a over two columns with b beside it, then c d e. */
const page = (): CssGridPage => ({
  engine: "css-grid",
  columns: ["1fr", "1fr", "12rem"],
  areas: ["a a b", "c d e"],
  cells: ["a", "b", "c", "d", "e"].map(cell),
});

describe("cssGridEngine", () => {
  it("keeps every layout-engine promise", () => {
    expect(layoutEngineProblems(cssGridEngine)).toEqual([]);
  });

  it("appends a row per cell across every column, two rows for a tall one", () => {
    const one = cssGridEngine.appendCell(cssGridEngine.empty(), cell("a"));
    expect(one.areas).toEqual(["a"]);
    const two = cssGridEngine.appendCell(page(), cell("f"));
    expect(two.areas).toEqual(["a a b", "c d e", "f f f"]);
    expect(cssGridEngine.appendCell(page(), cell("card"), "tall").areas).toEqual([
      "a a b",
      "c d e",
      "card card card",
      "card card card",
    ]);
    const sized = cssGridEngine.appendCell({ ...page(), rows: ["auto", "8rem"] }, cell("f"));
    expect(sized.rows).toEqual(["auto", "8rem", "auto"]);
  });

  it("removes a cell with its slots emptied, a row left all empty gone with its size", () => {
    const withoutB = cssGridEngine.removeCell(page(), "b");
    expect(withoutB.areas).toEqual(["a a .", "c d e"]);
    expect(withoutB.cells.map((c) => c.id)).toEqual(["a", "c", "d", "e"]);
    const tall = cssGridEngine.appendCell({ ...page(), rows: ["auto", "auto"] }, cell("f"));
    const withoutF = cssGridEngine.removeCell(tall, "f");
    expect(withoutF.areas).toEqual(["a a b", "c d e"]);
    expect(withoutF.rows).toEqual(["auto", "auto"]);
    const same = page();
    expect(cssGridEngine.removeCell(same, "ghost")).toBe(same);
  });

  it("applies the whole picture with the tracks that follow it, and the tracks alone", () => {
    const grown = cssGridEngine.applyChange(page(), {
      kind: "areas",
      areas: ["a a b .", "c d e ."],
      columns: ["1fr", "1fr", "12rem", "1fr"],
    });
    expect(grown.areas).toEqual(["a a b .", "c d e ."]);
    expect(grown.columns).toEqual(["1fr", "1fr", "12rem", "1fr"]);
    const sized = cssGridEngine.applyChange(page(), { kind: "tracks", columns: ["2fr", "1fr", "12rem"], gap: "1rem" });
    expect(sized.columns).toEqual(["2fr", "1fr", "12rem"]);
    expect(sized.gap).toBe("1rem");
    expect(sized.areas).toEqual(page().areas);
  });

  it("validates the picture: a non-rectangle, a token that is no cell, a cell with no slot, tracks off the grid, a size that is not CSS", () => {
    expect(cssGridEngine.validate?.(page())).toEqual([]);
    const l = { ...page(), areas: ["a a b", "a d e"] };
    expect(cssGridEngine.validate?.(l)).toEqual([
      'area "a" is not a rectangle — the browser drops the picture',
      'cell "c" has no slot and is placed after the grid',
    ]);
    expect(cssGridEngine.validate?.({ ...page(), areas: ["a a b", "c d ghost"] })).toEqual([
      'slot row 2 column 3 names "ghost", which is not a cell',
      'cell "e" has no slot and is placed after the grid',
    ]);
    expect(cssGridEngine.validate?.({ ...page(), areas: ["a a b", "c d"] })).toContain(
      "row 2 has 2 slots, the widest row 3",
    );
    expect(cssGridEngine.validate?.({ ...page(), columns: ["1fr", "wide"] })).toEqual([
      "columns has 2 sizes for 3 columns",
      'columns[1] "wide" is not a track size',
    ]);
    expect(cssGridEngine.validate?.({ ...page(), rows: ["auto", "minmax(8rem, 1fr)"], gap: "big" })).toEqual([
      'gap "big" is not a length',
    ]);
  });

  it("rejects a change it does not know", () => {
    expect(() => cssGridEngine.change.parse({ kind: "move", id: "a" })).toThrow();
  });
});
