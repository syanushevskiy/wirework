import { describe, expect, it } from "vitest";
import { rowWindow, sameRowWindow } from "../row-window";

/** A 400 px box of 40 px rows: ten rows fit, the window is twenty. */
const box = { boxHeight: 400, rowHeight: 40 };

describe("rowWindow", () => {
  it("renders every row when fewer are held than the window", () => {
    expect(rowWindow({ ...box, scrollTop: 0, count: 15 })).toEqual({ start: 0, end: 15, above: 0, below: 0 });
  });

  it("renders twice the box from the top, the rest as blank space below", () => {
    expect(rowWindow({ ...box, scrollTop: 0, count: 100 })).toEqual({ start: 0, end: 20, above: 0, below: 3200 });
  });

  it("keeps half a box above the first visible row", () => {
    // Scrolled to row 50: five rows above it, twenty in all.
    expect(rowWindow({ ...box, scrollTop: 2000, count: 100 })).toEqual({
      start: 45,
      end: 65,
      above: 1800,
      below: 1400,
    });
  });

  it("fills the window backwards at the end of the list", () => {
    expect(rowWindow({ ...box, scrollTop: 3600, count: 100 })).toEqual({
      start: 80,
      end: 100,
      above: 3200,
      below: 0,
    });
  });

  it("renders nothing for an empty list", () => {
    expect(rowWindow({ ...box, scrollTop: 0, count: 0 })).toEqual({ start: 0, end: 0, above: 0, below: 0 });
  });

  it("shows at least two rows while the box has no height yet, so there is something to measure", () => {
    expect(rowWindow({ scrollTop: 0, boxHeight: 0, rowHeight: 40, count: 100 })).toMatchObject({ start: 0, end: 2 });
  });

  it("survives a row height of zero", () => {
    expect(rowWindow({ scrollTop: 0, boxHeight: 400, rowHeight: 0, count: 5 })).toMatchObject({ start: 0, end: 5 });
  });
});

describe("sameRowWindow", () => {
  it("compares the four numbers", () => {
    const window = rowWindow({ ...box, scrollTop: 0, count: 100 });
    expect(sameRowWindow(window, { ...window })).toBe(true);
    expect(sameRowWindow(window, { ...window, end: 19 })).toBe(false);
  });
});
