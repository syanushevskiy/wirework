import { describe, expect, it } from "vitest";
import { rowPosition, rowWindow, sameRowWindow, sliceWindow } from "../row-window";

/** A 400 px box of 40 px rows: ten rows fit, the window is twenty. */
const box = { boxHeight: 400, rowHeight: 40 };

describe("rowWindow", () => {
  it("renders every row when fewer are held than the window", () => {
    expect(rowWindow({ ...box, scrollTop: 0, count: 15 })).toEqual({
      start: 0,
      end: 15,
      above: 0,
      below: 0,
      rowHeight: 40,
    });
  });

  it("renders twice the box from the top, the rest as blank space below", () => {
    expect(rowWindow({ ...box, scrollTop: 0, count: 100 })).toMatchObject({ start: 0, end: 20, above: 0, below: 3200 });
  });

  it("keeps half a box above the first visible row", () => {
    // Scrolled to row 50: five rows above it, twenty in all.
    expect(rowWindow({ ...box, scrollTop: 2000, count: 100 })).toMatchObject({
      start: 45,
      end: 65,
      above: 1800,
      below: 1400,
    });
  });

  it("fills the window backwards at the end of the list", () => {
    expect(rowWindow({ ...box, scrollTop: 3600, count: 100 })).toMatchObject({
      start: 80,
      end: 100,
      above: 3200,
      below: 0,
    });
  });

  it("renders nothing for an empty list", () => {
    expect(rowWindow({ ...box, scrollTop: 0, count: 0 })).toMatchObject({ start: 0, end: 0, above: 0, below: 0 });
  });

  it("shows at least two rows while the box has no height yet, so there is something to measure", () => {
    expect(rowWindow({ scrollTop: 0, boxHeight: 0, rowHeight: 40, count: 100 })).toMatchObject({ start: 0, end: 2 });
  });

  it("survives a row height of zero", () => {
    expect(rowWindow({ scrollTop: 0, boxHeight: 400, rowHeight: 0, count: 5 })).toMatchObject({ start: 0, end: 5 });
  });
});

describe("sliceWindow — a list of which only a slice is held", () => {
  // Two thousand rows, the two hundred from row 500 held; scrolled to row 600: the window is rows 595–615.
  const whole = rowWindow({ ...box, scrollTop: 600 * 40, count: 2000 });

  it("renders the slice's rows that fall into the window, the blank space that of the whole list", () => {
    expect(sliceWindow(whole, 2000, 500, 200)).toEqual({
      start: 95,
      end: 115,
      above: 595 * 40,
      below: (2000 - 615) * 40,
      rowHeight: 40,
    });
  });

  it("renders nothing where the slice is not, and keeps the list as tall", () => {
    const far = rowWindow({ ...box, scrollTop: 1200 * 40, count: 2000 });
    const shown = sliceWindow(far, 2000, 500, 200);
    expect(shown.end - shown.start).toBe(0);
    expect(shown.above + shown.below).toBe(2000 * 40);
  });

  it("renders the part of the window the slice covers when it ends inside it", () => {
    const edge = rowWindow({ ...box, scrollTop: 695 * 40, count: 2000 });
    // The window is rows 690–710; the slice ends at 700.
    expect(sliceWindow(edge, 2000, 500, 200)).toMatchObject({ start: 190, end: 200, below: 1300 * 40 });
  });
});

describe("rowPosition — where a list stands", () => {
  it("is the first row in view and how many fit the box", () => {
    expect(rowPosition(400 * 40, 400, 40, 2000)).toEqual({ position: 400, visible: 10 });
  });

  it("never stands past the position that shows the end, and forgives a hair of a pixel", () => {
    expect(rowPosition(5000 * 40, 400, 40, 2000)).toEqual({ position: 1990, visible: 10 });
    expect(rowPosition(400 * 40 - 0.2, 400, 40, 2000).position).toBe(400);
    expect(rowPosition(0, 400, 40, 3)).toEqual({ position: 0, visible: 3 });
  });
});

describe("sameRowWindow", () => {
  it("compares the four numbers", () => {
    const window = rowWindow({ ...box, scrollTop: 0, count: 100 });
    expect(sameRowWindow(window, { ...window })).toBe(true);
    expect(sameRowWindow(window, { ...window, end: 19 })).toBe(false);
  });
});
