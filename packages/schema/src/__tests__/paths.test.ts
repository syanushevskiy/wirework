/**
 * The ONE set of path rules, shared by the store, the engine and widgets:
 * own properties only, canonical array indices, which container a missing
 * step becomes, and what throws.
 */
import { describe, expect, it } from "vitest";
import { deletePath, getPath, isIndexSegment, isPlainObject, setPath } from "../index";

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

  it("reads an array by canonical index only", () => {
    expect(getPath({ rows: ["a", "b"] }, "rows.1")).toBe("b");
    expect(getPath({ rows: ["a", "b"] }, "rows.01")).toBeUndefined();
    expect(getPath({ rows: ["a", "b"] }, "rows.length")).toBeUndefined();
  });

  it("regression: accepts explicit segments so a template name may contain a dot", () => {
    expect(getPath({ x: { "v1.0": 1 } }, ["x", "v1.0"])).toBe(1);
    expect(getPath({ x: { "v1.0": 1 } }, "x.v1.0")).toBeUndefined();
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

  it("regression: refuses to write through a primitive", () => {
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

describe("helpers", () => {
  it("isIndexSegment accepts canonical indices only", () => {
    expect(["0", "12"].every(isIndexSegment)).toBe(true);
    expect(["01", "-1", "1.5", "length", ""].some(isIndexSegment)).toBe(false);
  });

  it("isPlainObject rejects arrays, null and class instances", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
    expect([[], null, new Date(), "x"].some(isPlainObject)).toBe(false);
  });
});
