/** The picture's arithmetic: spans, the rectangle rule on the shapes that bite, a drop placed or refused, the grid grown and shrunk, track sizes. */
import { describe, expect, it } from "vitest";
import {
  claimed,
  cleared,
  dropped,
  grownTo,
  holderIn,
  isDrawable,
  isRectangle,
  isTrackSize,
  placed,
  resizedSpan,
  spanOf,
  spanText,
  swapped,
  tokensOf,
  trackParts,
  unplaced,
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

  it("knows the slot another cell holds in a rectangle, never one the cell itself does", () => {
    expect(holderIn(T, "b", { r1: 0, c1: 1, r2: 0, c2: 2 })).toEqual({ row: 0, column: 1, id: "a" });
    expect(holderIn(T, "a", { r1: 0, c1: 0, r2: 0, c2: 1 })).toBeUndefined();
    expect(holderIn(T, "a", { r1: 0, c1: 3, r2: 0, c2: 4 })).toBeUndefined();
  });

  it("onto another widget swaps the two places, whatever their sizes", () => {
    expect(dropped(T, "b", { row: 0, column: 0 })).toEqual(tokensOf(["b b a", "c d e", "f f f"]));
    expect(dropped(T, "c", { row: 2, column: 1 })).toEqual(tokensOf(["a a b", "f d e", "c c c"]));
    expect(swapped(T, "a", "f")).toEqual(tokensOf(["f f b", "c d e", "a a a"]));
  });

  it("onto a free slot keeps the cell's size where it fits, and takes the one slot where it does not", () => {
    const G = tokensOf(["a a .", ". . .", "b . ."]);
    // Grabbed by its second slot and let go over row 2 column 3: the rectangle stays under the pointer.
    expect(dropped(G, "a", { row: 1, column: 2 }, { dr: 0, dc: 1 })).toEqual(tokensOf([". . .", ". a a", "b . ."]));
    // Never past the edge unless the pointer is: grabbed by its first slot at the last column, it is pushed back in.
    expect(dropped(G, "a", { row: 1, column: 2 })).toEqual(tokensOf([". . .", ". a a", "b . ."]));
    // b is in the way of both the grabbed place and the corner: one slot it is.
    expect(dropped(tokensOf(["a a .", ". b ."]), "a", { row: 1, column: 0 })).toEqual(tokensOf([". . .", "a b ."]));
    // On its own slots nothing moves.
    expect(dropped(G, "a", { row: 0, column: 1 }, { dr: 0, dc: 1 })).toEqual(G);
    // Past the edge — a "+" slot — the grid grows.
    expect(dropped(tokensOf(["a", "b"]), "b", { row: 0, column: 1 })).toEqual(tokensOf(["a b", ". ."]));
  });

  it("from the tray takes one free slot, or the place of the widget it lands on — which goes to the tray", () => {
    const G = tokensOf(["a a .", "b . ."]);
    expect(dropped(G, "x", { row: 1, column: 1 })).toEqual(tokensOf(["a a .", "b x ."]));
    const taken = dropped(G, "x", { row: 0, column: 1 });
    expect(taken).toEqual(tokensOf(["x x .", "b . ."]));
    expect(unplaced(taken, ["a", "b", "x"])).toEqual(["a"]);
    expect(cleared(G, "a")).toEqual(tokensOf([". . .", "b . ."]));
  });
});

describe("a resize", () => {
  const ROW = tokensOf(["a a b"]);

  it("pulls one edge to a slot, never to less than one slot", () => {
    const span = { r1: 1, c1: 1, r2: 2, c2: 2 };
    expect(resizedSpan(span, "e", { row: 0, column: 4 })).toEqual({ ...span, c2: 4 });
    expect(resizedSpan(span, "w", { row: 0, column: 0 })).toEqual({ ...span, c1: 0 });
    expect(resizedSpan(span, "n", { row: 0, column: 9 })).toEqual({ ...span, r1: 0 });
    expect(resizedSpan(span, "s", { row: 1, column: 9 })).toEqual({ ...span, r2: 1 });
    expect(resizedSpan(span, "se", { row: 3, column: 3 })).toEqual({ ...span, r2: 3, c2: 3 });
    expect(resizedSpan(span, "e", { row: 0, column: 0 })).toEqual({ ...span, c2: 1 });
    expect(resizedSpan(span, "w", { row: 0, column: 5 })).toEqual({ ...span, c1: 2 });
  });

  it("over a neighbour's only slot leaves the neighbour with none — off the grid", () => {
    const next = claimed(ROW, "a", { r1: 0, c1: 0, r2: 0, c2: 2 });
    expect(next).toEqual(tokensOf(["a a a"]));
    expect(unplaced(next, ["a", "b"])).toEqual(["b"]);
  });

  it("shrinks a neighbour that still has a rectangle left, and frees the slots the cell lets go", () => {
    expect(claimed(tokensOf(["a b b"]), "a", { r1: 0, c1: 0, r2: 0, c2: 1 })).toEqual(tokensOf(["a a b"]));
    expect(claimed(ROW, "a", { r1: 0, c1: 0, r2: 0, c2: 0 })).toEqual(tokensOf(["a . b"]));
    expect(claimed(tokensOf(["a b", ". b"]), "a", { r1: 0, c1: 0, r2: 0, c2: 1 })).toEqual(tokensOf(["a a", ". b"]));
  });

  it("takes a neighbour off the grid when what it has left is no rectangle, and touches nobody else", () => {
    // b is a 2×2 block; a's corner bites one slot of it: an L is left, so b goes. c, an L already, is not this resize's business.
    const before = tokensOf(["a b b c", ". b b c", ". . c c"]);
    expect(claimed(before, "a", { r1: 0, c1: 0, r2: 0, c2: 1 })).toEqual(tokensOf(["a a . c", ". . . c", ". . c c"]));
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
