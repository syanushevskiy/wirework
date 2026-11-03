/**
 * Appearances: the registry starts with the standard five and takes the
 * host's own under the name grammar; `appear` / `disappear` naming a
 * stranger is a contract problem, reported by resolve like an unknown
 * predicate.
 */
import { describe, expect, it } from "vitest";
import { APPEARANCES } from "@wirework/schema";
import { STANDARD_APPEARANCES, appearanceProblems, createAppearances } from "../index";
import { contractProblems } from "../resolve";
import { counter } from "./fixtures";

describe("appearances", () => {
  it("starts with the standard five, takes a host's own, and refuses a malformed one", () => {
    const appearances = createAppearances();
    expect(appearances.keys()).toEqual(APPEARANCES);
    appearances.register({ name: "drop", description: "Drops in" });
    expect(appearances.get("drop")?.description).toBe("Drops in");
    expect(() => appearances.register({ name: "Drop In", description: "x" })).toThrow(/Drop In/);
    expect(() => appearances.register({ name: "plain", description: "" })).toThrow(/has no description/);
    expect(() => STANDARD_APPEARANCES.register({ name: "late", description: "too late" })).toThrow(/sealed/);
  });

  it("reports a name nobody registered, for appear and disappear alike", () => {
    expect(appearanceProblems({ appear: "fade", disappear: "zoom" })).toEqual([]);
    expect(appearanceProblems({ appear: "drop" })).toEqual([
      'appear names an unknown appearance "drop" (registered: fade, slide-up, slide-down, zoom, flip)',
    ]);
    const appearances = createAppearances();
    appearances.register({ name: "drop", description: "Drops in" });
    expect(appearanceProblems({ appear: "drop", disappear: "nope" }, appearances)).toEqual([
      'disappear names an unknown appearance "nope" (registered: fade, slide-up, slide-down, zoom, flip, drop)',
    ]);
  });

  it("is part of the contract check, beside the condition", () => {
    const viewModel = { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n" }] }, disappear: "wobble" };
    expect(contractProblems(counter, viewModel)).toMatch(/disappear names an unknown appearance "wobble"/);
    const appearances = createAppearances();
    appearances.register({ name: "wobble", description: "Wobbles" });
    expect(contractProblems(counter, viewModel, { appearances })).toBeUndefined();
  });
});
