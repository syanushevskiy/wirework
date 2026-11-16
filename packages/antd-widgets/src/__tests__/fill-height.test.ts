import { describe, expect, it } from "vitest";
import { fillHeight, scrolledAbove } from "../fill-height";

describe("fillHeight", () => {
  it("is the room from the box's top to the bottom of the window, less the gap", () => {
    expect(fillHeight(1000, 300, 16, 200)).toBe(684);
    expect(fillHeight(1000, 300, 0, 200)).toBe(700);
  });

  it("is whole pixels, never past the bottom", () => {
    expect(fillHeight(1000, 300.6, 16, 200)).toBe(683);
  });

  it("is never less than the least — a short window, or a box that starts below it", () => {
    expect(fillHeight(500, 300, 16, 320)).toBe(320);
    expect(fillHeight(500, 900, 16, 320)).toBe(320);
  });
});

describe("scrolledAbove", () => {
  it("adds up how far every ancestor is scrolled, the element's own scroll left out", () => {
    const page = { scrollTop: 400, parentElement: null };
    const content = { scrollTop: 120, parentElement: page };
    const box = { scrollTop: 999, parentElement: content };
    expect(scrolledAbove(box)).toBe(520);
    expect(scrolledAbove(page)).toBe(0);
  });
});
