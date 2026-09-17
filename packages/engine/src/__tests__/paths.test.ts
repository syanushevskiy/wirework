/** Path surgery: the helpers every editor and resolver is built on. */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createStore } from "@wirework/store";
import { collectPaths, compatibleStorePaths, deepMerge, deletePath, getPath, setPath } from "../index";

describe("getPath", () => {
  it("reads nested values and stops at absent ones", () => {
    expect(getPath({ a: { b: 1 } }, "a.b")).toBe(1);
    expect(getPath({ a: { b: 1 } }, "a.c")).toBeUndefined();
    expect(getPath(undefined, "a")).toBeUndefined();
  });

  it("never reads through the prototype chain", () => {
    expect(getPath({}, "constructor")).toBeUndefined();
    expect(getPath({}, "__proto__")).toBeUndefined();
    expect(getPath({}, "toString")).toBeUndefined();
  });
});

describe("setPath", () => {
  it("clones only along the path and creates missing containers", () => {
    const tree = { kept: { x: 1 }, a: {} };
    const next = setPath(tree, "a.b.c", 2);
    expect(next).toEqual({ kept: { x: 1 }, a: { b: { c: 2 } } });
    expect(next.kept).toBe(tree.kept);
    expect(tree).toEqual({ kept: { x: 1 }, a: {} });
  });

  it("regression: traverses an array by index instead of replacing it", () => {
    const next = setPath({ cells: [{ id: "a" }, { id: "b" }] }, "cells.1.id", "B");
    expect(Array.isArray(next.cells)).toBe(true);
    expect(next.cells).toEqual([{ id: "a" }, { id: "B" }]);
  });

  it("refuses a non-numeric segment through an array, and bad segments", () => {
    expect(() => setPath({ cells: [] }, "cells.first", 1)).toThrow(/numeric index/);
    expect(() => setPath({}, "a.__proto__", 1)).toThrow(/forbidden segment/);
    expect(() => setPath({}, "a..b", 1)).toThrow(/empty segment/);
  });

  it("regression: refuses to write through a primitive, exactly like the store", () => {
    expect(() => setPath({ a: 5 }, "a.b", 1)).toThrow(/holds a number/);
  });

  it("regression: a missing container is a map for an id and a list only for index 0", () => {
    expect(setPath({}, "byId.123456.name", "x")).toEqual({ byId: { "123456": { name: "x" } } });
    expect(setPath({}, "rows.0", "x")).toEqual({ rows: ["x"] });
  });

  it("regression: accepts explicit segments so a name may contain a dot", () => {
    const next = setPath({ widgets: { x: { "v1.0": { text: "keep" } } } }, ["widgets", "x", "v1.0"], { text: "edited" });
    expect(next).toEqual({ widgets: { x: { "v1.0": { text: "edited" } } } });
  });
});

describe("deletePath", () => {
  it("removes a leaf and returns the SAME tree for an unknown path", () => {
    expect(deletePath({ a: { b: 1, c: 2 } }, "a.b")).toEqual({ a: { c: 2 } });
    const tree = { a: 1 };
    expect(deletePath(tree, "nope.here")).toBe(tree);
  });

  it("regression: walks arrays like setPath does", () => {
    expect(deletePath({ cells: [{ id: "a", x: 1 }] }, "cells.0.x")).toEqual({ cells: [{ id: "a" }] });
    expect(deletePath({ cells: ["a", "b", "c"] }, "cells.1")).toEqual({ cells: ["a", "c"] });
  });
});

describe("getPath", () => {
  it("regression: accepts explicit segments so a template name may contain a dot", () => {
    expect(getPath({ x: { "v1.0": 1 } }, ["x", "v1.0"])).toBe(1);
    expect(getPath({ x: { "v1.0": 1 } }, "x.v1.0")).toBeUndefined();
  });
});

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
