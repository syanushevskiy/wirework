/** The picture's arithmetic: spans, the rectangle rule on the shapes that bite, a drop placed or refused, the grid grown and shrunk, track sizes. */
import { describe, expect, it } from "vitest";
import {
  grownTo,
  holderIn,
  isDrawable,
  isRectangle,
  isTrackSize,
  placed,
  spanOf,
  spanText,
  tokensOf,
  trackParts,
  withSlot,
  withoutColumn,
  withoutRow,
} from "../areas";

const T = tokensOf(["a a b", "c d e", "f f f"]);

describe("spans", () => {
  it("reads a cell's rectangle, counted from 1 for a scenario, and none for a cell named nowhere", () => {
    expect(spanOf(T, "a")).toEqual({ r1: 0, c1: 0, r2: 0, c2: 1 });
    expect(spanText({ r1: 0, c1: 0, r2: 0, c2: 1 })).toBe("1-1/1-2");
    expect(spanOf(T, "f")).toEqual({ r1: 2, c1: 0, r2: 2, c2: 2 });
    expect(spanOf(T, "ghost")).toBeUndefined();
  });

  it("knows a rectangle from an L, a T, two islands and a hole", () => {
    expect(isRectangle(T, "a")).toBe(true);
    expect(isRectangle(tokensOf(["a a", "a ."]), "a")).toBe(false);
    expect(isRectangle(tokensOf(["a a a", ". a ."]), "a")).toBe(false);
    expect(isRectangle(tokensOf(["a . a"]), "a")).toBe(false);
    expect(isRectangle(tokensOf(["a a a", "a . a", "a a a"]), "a")).toBe(false);
    expect(isRectangle(tokensOf(["a a", "a a"]), "a")).toBe(true);
    expect(isDrawable(tokensOf(["a a", "a ."]))).toBe(false);
    expect(isDrawable(tokensOf(["a a", "b"]))).toBe(false);
    expect(isDrawable(T)).toBe(true);
    expect(isDrawable([])).toBe(false);
  });
});

describe("a drop", () => {
  it("places the rectangle, empties the cell's old slots and grows the grid to hold it", () => {
    expect(placed(T, "b", { r1: 1, c1: 2, r2: 1, c2: 2 })).toEqual(tokensOf(["a a .", "c d b", "f f f"]));
    expect(placed(T, "e", { r1: 0, c1: 3, r2: 0, c2: 3 })).toEqual(tokensOf(["a a b e", "c d . .", "f f f ."]));
    expect(placed(T, "c", { r1: 3, c1: 0, r2: 4, c2: 1 })).toEqual(
      tokensOf(["a a b", ". d e", "f f f", "c c .", "c c ."]),
    );
  });

  it("is refused where another cell holds a slot, never where the cell itself does", () => {
    expect(holderIn(T, "b", { r1: 0, c1: 1, r2: 0, c2: 2 })).toEqual({ row: 0, column: 1, id: "a" });
    expect(holderIn(T, "a", { r1: 0, c1: 0, r2: 0, c2: 1 })).toBeUndefined();
    expect(holderIn(T, "a", { r1: 0, c1: 3, r2: 0, c2: 4 })).toBeUndefined();
  });
});

describe("the slot table", () => {
  it("fills or empties one slot, growing the grid for a slot past its edge", () => {
    expect(withSlot(T, 1, 2, "b")).toEqual(tokensOf(["a a b", "c d b", "f f f"]));
    expect(withSlot(T, 0, 2, undefined)).toEqual(tokensOf(["a a .", "c d e", "f f f"]));
    expect(withSlot(tokensOf(["a"]), 0, 1, "b")).toEqual(tokensOf(["a b"]));
  });

  it("grows by whole rows and columns, every row the same length", () => {
    expect(grownTo(tokensOf(["a", "b b"]), 3, 3)).toEqual(tokensOf(["a . .", "b b .", ". . ."]));
    expect(grownTo([], 1, 1)).toEqual([["."]]);
  });

  it("removes a row or a column unless a cell would lose its only slots", () => {
    expect(withoutRow(T, 2)).toBeUndefined();
    expect(withoutRow(tokensOf(["a a", "a a", "b ."]), 0)).toEqual(tokensOf(["a a", "b ."]));
    expect(withoutRow(tokensOf(["a a", ". ."]), 1)).toEqual(tokensOf(["a a"]));
    expect(withoutColumn(T, 2)).toBeUndefined();
    expect(withoutColumn(T, 0)).toBeUndefined();
    expect(withoutColumn(tokensOf(["a a b", "c c ."]), 0)).toEqual(tokensOf(["a b", "c ."]));
  });
});

describe("track sizes", () => {
  it("reads what the browser reads and splits what the form edits", () => {
    for (const size of [
      "1fr",
      "2.5fr",
      "12rem",
      "200px",
      "33%",
      "auto",
      "min-content",
      "minmax(8rem, 1fr)",
      "repeat(2, 1fr)",
    ]) {
      expect(isTrackSize(size)).toBe(true);
    }
    for (const size of ["wide", "12", "fr", "1 fr", "minmax("]) expect(isTrackSize(size)).toBe(false);
    expect(trackParts("12rem")).toEqual({ number: "12", unit: "rem" });
    expect(trackParts("auto")).toEqual({ keyword: "auto" });
    expect(trackParts("minmax(8rem, 1fr)")).toBeUndefined();
  });
});
