import { describe, expect, it } from "vitest";
import { rowPosition, rowWindow, sameRowWindow, sliceRequest, sliceWindow, windowServes } from "../row-window";

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

describe("sliceRequest — what a windowed list asks for, ahead of time", () => {
  // Two thousand rows, the two hundred from row 400 held: rows 400–600.
  const ask = (start: number, end: number, offset = 400, held = 200) =>
    sliceRequest({ start, end }, offset, held, 2000);

  it("asks for nothing while the window is in the middle of the rows held", () => {
    expect(ask(480, 500)).toBeUndefined();
    expect(ask(529, 549)).toBeUndefined();
  });

  it("asks for the batch after once the window passes three quarters of the rows held — they are still in view", () => {
    expect(ask(530, 550)).toEqual({ offset: 600, edge: "after" });
    expect(ask(580, 600)).toEqual({ offset: 600, edge: "after" });
  });

  it("asks for the batch before the same way, towards the start", () => {
    expect(ask(450, 470)).toEqual({ offset: 400, edge: "before" });
    expect(ask(451, 471)).toBeUndefined();
  });

  it("asks for nothing past the ends of the list", () => {
    expect(sliceRequest({ start: 1980, end: 2000 }, 1800, 200, 2000)).toBeUndefined();
    expect(sliceRequest({ start: 0, end: 20 }, 0, 200, 2000)).toBeUndefined();
  });

  it("asks for a slice around the window when it left the rows held", () => {
    expect(ask(1200, 1220)).toEqual({ offset: 1200, edge: "around" });
    expect(ask(590, 610)).toEqual({ offset: 590, edge: "around" });
    expect(sliceRequest({ start: 0, end: 20 }, 0, 0, 2000)).toEqual({ offset: 0, edge: "around" });
  });

  it("asks for nothing of an empty list", () => {
    expect(sliceRequest({ start: 0, end: 0 }, 0, 0, 0)).toBeUndefined();
  });

  it("regression: asks for nothing ahead of time while the rows held are fewer than six windows — it would never stop", () => {
    // Sixty rows held, a window of thirty-six: past three quarters AND within the first quarter at once.
    expect(sliceRequest({ start: 112, end: 148 }, 100, 60, 2000)).toBeUndefined();
    // Out of them it still asks for the slice around the window.
    expect(sliceRequest({ start: 140, end: 176 }, 100, 60, 2000)).toEqual({ offset: 140, edge: "around" });
  });

  it("does not go back and forth once three batches are held", () => {
    // Rows 200–800 after the batch 600–800 joined: the window that asked for it, at row 450, asks for nothing now.
    expect(sliceRequest({ start: 430, end: 450 }, 200, 600, 2000)).toBeUndefined();
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

describe("a window that stays while it serves", () => {
  // Made with the box at row 50: rows 45–64.
  const made = rowWindow({ ...box, scrollTop: 2000, count: 100 });

  it("serves while the rows in view lie inside it with a row to spare on either side", () => {
    expect(windowServes(made, { ...box, scrollTop: 2000, count: 100 })).toBe(true);
    // Four rows on: the view ends at row 63, one before the window's last.
    expect(windowServes(made, { ...box, scrollTop: 2160, count: 100 })).toBe(true);
    expect(windowServes(made, { ...box, scrollTop: 2200, count: 100 })).toBe(false);
    // Four rows back: the view begins at row 46, one after the window's first.
    expect(windowServes(made, { ...box, scrollTop: 1840, count: 100 })).toBe(true);
    expect(windowServes(made, { ...box, scrollTop: 1800, count: 100 })).toBe(false);
    // A row cut by the box's edge counts as in view.
    expect(windowServes(made, { ...box, scrollTop: 2170, count: 100 })).toBe(false);
  });

  it("needs no spare row where it already reaches the list's end", () => {
    expect(windowServes(rowWindow({ ...box, scrollTop: 0, count: 100 }), { ...box, scrollTop: 0, count: 100 })).toBe(
      true,
    );
    const last = rowWindow({ ...box, scrollTop: 3600, count: 100 });
    expect(windowServes(last, { ...box, scrollTop: 3600, count: 100 })).toBe(true);
  });

  it("does not serve rows of another height: every blank space is measured in rows", () => {
    expect(windowServes(made, { ...box, rowHeight: 44, scrollTop: 2000, count: 100 })).toBe(false);
  });

  it("is made with its spare rows ahead of a view that is heading somewhere, so it serves for longer", () => {
    // Going down: one row above the view, nine below it — nine rows of scrolling before it is made again.
    const down = rowWindow({ ...box, scrollTop: 2000, count: 100, heading: "down" });
    expect(down).toMatchObject({ start: 49, end: 69 });
    expect(windowServes(down, { ...box, scrollTop: 2320, count: 100 })).toBe(true);
    expect(windowServes(down, { ...box, scrollTop: 2360, count: 100 })).toBe(false);
    // Going up: eight above, and below the view one row and one for a row cut by the box's edge.
    const up = rowWindow({ ...box, scrollTop: 2000, count: 100, heading: "up" });
    expect(up).toMatchObject({ start: 42, end: 62 });
    expect(windowServes(up, { ...box, scrollTop: 1720, count: 100 })).toBe(true);
    expect(windowServes(up, { ...box, scrollTop: 1680, count: 100 })).toBe(false);
  });
});

describe("sameRowWindow", () => {
  it("compares the four numbers", () => {
    const window = rowWindow({ ...box, scrollTop: 0, count: 100 });
    expect(sameRowWindow(window, { ...window })).toBe(true);
    expect(sameRowWindow(window, { ...window, end: 19 })).toBe(false);
  });
});
