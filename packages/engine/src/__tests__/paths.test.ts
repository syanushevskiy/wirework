/**
 * The engine's path TOOLING: overlay merge and path enumeration. Reading
 * and writing a path is @wirework/schema's, tested there.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createStore } from "@wirework/store";
import { collectPaths, compatibleStorePaths, deepMerge } from "../paths";

describe("deepMerge", () => {
  it("merges plain objects recursively and replaces everything else", () => {
    expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 3 } })).toEqual({ a: { b: 1, c: 3 } });
    expect(deepMerge([1, 2, 3], [9])).toEqual([9]);
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, "text")).toBe("text");
  });

  it("drops keys that would pollute the prototype", () => {
    const merged = deepMerge({}, JSON.parse('{"__proto__":{"bad":1}}')) as Record<string, unknown>;
    expect(merged["bad"]).toBeUndefined();
    expect(({} as Record<string, unknown>)["bad"]).toBeUndefined();
  });
});

describe("collectPaths", () => {
  it("lists branches and leaves, including array indexes", () => {
    const paths = collectPaths({ a: { b: 1 }, list: [{ x: 1 }] });
    expect(paths).toContain("a");
    expect(paths).toContain("a.b");
    expect(paths).toContain("list.0.x");
  });

  it("skips keys no store path could address, and terminates on cycles", () => {
    const cyclic: Record<string, unknown> = { ok: 1, "with space": 2, "with.dot": 3 };
    cyclic["self"] = cyclic;
    const paths = collectPaths(cyclic);
    expect(paths).toContain("ok");
    expect(paths.some((path) => path.includes(" ") || path.includes("with.dot"))).toBe(false);
    expect(paths.length).toBeLessThan(100);
  });
});

describe("compatibleStorePaths", () => {
  it("offers only paths whose current value fits the port", () => {
    const store = createStore({ demo: { counter: 2, name: "x" } });
    expect(compatibleStorePaths(store, z.number())).toEqual(["demo.counter"]);
  });

  it("regression: never offers a configuration path", () => {
    const store = createStore({ viewModels: { pages: {} }, userViewModels: {}, demo: { n: 1 } });
    const paths = compatibleStorePaths(store, z.unknown());
    expect(paths.some((path) => path.startsWith("viewModels") || path.startsWith("userViewModels"))).toBe(false);
    expect(paths).toContain("demo.n");
  });
});
