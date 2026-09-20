/**
 * The store's contract, in the cases that used to be checked only by
 * whether a demo page looked right (team-tiger: Sasha, Katya, Alexei).
 * Every "regression" case below is a bug this suite was written to catch.
 */
import { describe, expect, it, vi } from "vitest";
import { createStore as createZustandStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore, fromZustand } from "../index";
import { z } from "zod";

describe("get", () => {
  it("reads nested paths and returns undefined for absent ones", () => {
    const store = createStore({ a: { b: { c: 1 } } });
    expect(store.get("a.b.c")).toBe(1);
    expect(store.get("a.b.missing")).toBeUndefined();
    expect(store.get("nope.at.all")).toBeUndefined();
  });

  it("never reads through the prototype chain", () => {
    const store = createStore({ a: {} });
    expect(() => store.get("a.__proto__")).toThrow(/forbidden segment/);
    expect(store.get("a.hasOwnProperty")).toBeUndefined();
  });

  it("rejects an empty path", () => {
    expect(() => createStore({}).get("")).toThrow(/non-empty/);
  });

  it("getAs validates and returns undefined instead of a wrong shape", () => {
    const store = createStore({ n: 1, s: "text" });
    expect(store.getAs("n", z.number())).toBe(1);
    expect(store.getAs("s", z.number())).toBeUndefined();
    expect(store.getAs("missing", z.number())).toBeUndefined();
  });
});

describe("set", () => {
  it("clones only the containers along the written path", () => {
    const store = createStore({ kept: { deep: 1 }, changed: { value: 1 } });
    const before = store.get("kept");
    store.set("changed.value", 2);
    expect(store.get("kept")).toBe(before);
    expect(store.get("changed.value")).toBe(2);
  });

  it("regression: a missing container followed by index 0 starts a LIST", () => {
    const store = createStore({});
    store.set("rows.0.name", "first");
    expect(Array.isArray(store.get("rows"))).toBe(true);
    expect(store.get("rows")).toEqual([{ name: "first" }]);
  });

  it("regression: a missing container followed by a numeric id is a MAP, not a sparse array", () => {
    const store = createStore({ runs: {} });
    store.set("runs.byId.123456.name", "Nightly");
    expect(Array.isArray(store.get("runs.byId"))).toBe(false);
    expect(store.get("runs.byId")).toEqual({ "123456": { name: "Nightly" } });
  });

  it("regression: an array is addressed by canonical index only", () => {
    const store = createStore({ rows: ["a", "b"] });
    expect(store.get("rows.1")).toBe("b");
    expect(store.get("rows.01")).toBeUndefined();
    expect(store.get("rows.length")).toBeUndefined();
    expect(() => store.set("rows.01", "x")).toThrow(/numeric index/);
  });

  it("regression: never reads a missing child through the prototype chain", () => {
    const store = createStore({});
    store.set("toString.x", 1);
    expect(store.get("toString")).toEqual({ x: 1 });
  });

  it("writes through an existing array by index", () => {
    const store = createStore({ rows: [{ name: "a" }, { name: "b" }] });
    store.set("rows.1.name", "B");
    expect(store.get("rows")).toEqual([{ name: "a" }, { name: "B" }]);
  });

  it("refuses a non-numeric segment through an array", () => {
    const store = createStore({ rows: [] });
    expect(() => store.set("rows.first", 1)).toThrow(/numeric index/);
  });

  it("regression: refuses to silently replace a primitive parent", () => {
    const store = createStore({ name: "Bob" });
    expect(() => store.set("name.first", "x")).toThrow(/holds a string/);
    expect(store.get("name")).toBe("Bob");
  });

  it("regression: refuses configuration paths, which setConfig accepts", () => {
    const store = createStore({ viewModels: { pages: {} } });
    expect(() => store.set("viewModels.pages", {})).toThrow(/setConfig/);
    expect(() => store.set("userViewModels", {})).toThrow(/setConfig/);
    store.setConfig("viewModels.pages.demo", { default: { engine: "x" } });
    expect(store.get("viewModels.pages.demo")).toEqual({ default: { engine: "x" } });
  });

  it("blocks prototype-polluting writes", () => {
    const store = createStore({});
    expect(() => store.set("__proto__.bad", 1)).toThrow(/forbidden segment/);
    expect(({} as Record<string, unknown>)["bad"]).toBeUndefined();
  });

  it("does nothing when the value is unchanged", () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    store.subscribe("a", listener);
    store.set("a", 1);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("subscribe", () => {
  it("notifies the path, its ancestors and its descendants", () => {
    const store = createStore({ a: { b: { c: 1 } } });
    const exact = vi.fn();
    const ancestor = vi.fn();
    const descendant = vi.fn();
    const unrelated = vi.fn();
    store.subscribe("a.b", exact);
    store.subscribe("a", ancestor);
    store.subscribe("a.b.c", descendant);
    store.subscribe("other", unrelated);
    store.set("a.b", { c: 2 });
    expect(exact).toHaveBeenCalledOnce();
    expect(ancestor).toHaveBeenCalledOnce();
    expect(descendant).toHaveBeenCalledOnce();
    expect(unrelated).not.toHaveBeenCalled();
  });

  it("the root path hears everything, and unsubscribe stops it", () => {
    const store = createStore({});
    const root = vi.fn();
    const stop = store.subscribe("", root);
    store.set("anything", 1);
    stop();
    store.set("anything", 2);
    expect(root).toHaveBeenCalledOnce();
  });

  it("isolates a throwing listener from the others", () => {
    const store = createStore({ a: 1 });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const healthy = vi.fn();
    store.subscribe("a", () => {
      throw new Error("boom");
    });
    store.subscribe("a", healthy);
    store.set("a", 2);
    expect(healthy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("survives a listener that unsubscribes during notification", () => {
    const store = createStore({ a: 1 });
    const second = vi.fn();
    const stop = store.subscribe("a", () => stop());
    store.subscribe("a", second);
    expect(() => store.set("a", 2)).not.toThrow();
    expect(second).toHaveBeenCalledOnce();
  });

  it("stays quiet when a rewritten ancestor holds the same value at the path", () => {
    const store = createStore({ a: { b: { c: 1 } } });
    const ancestor = vi.fn();
    const descendant = vi.fn();
    store.subscribe("a.b", ancestor);
    store.subscribe("a.b.c", descendant);
    store.set("a.b", { c: 1 });
    expect(ancestor).toHaveBeenCalledOnce();
    expect(descendant).not.toHaveBeenCalled();
  });

  it("announces a change once when a listener writes during notification", () => {
    const store = createStore({ a: 1, b: 0 });
    const onB = vi.fn();
    store.subscribe("a", () => store.set("b", 1));
    store.subscribe("b", onB);
    store.set("a", 2);
    expect(store.get("b")).toBe(1);
    expect(onB).toHaveBeenCalledOnce();
  });
});

describe("replace", () => {
  it("swaps the whole tree and notifies the subscribers whose value changed", () => {
    const store = createStore({ a: 1, kept: 5 });
    const root = vi.fn();
    const gone = vi.fn();
    const arrived = vi.fn();
    const kept = vi.fn();
    store.subscribe("", root);
    store.subscribe("a", gone);
    store.subscribe("b", arrived);
    store.subscribe("kept", kept);
    store.replace({ b: 2, kept: 5 });
    expect(store.get("a")).toBeUndefined();
    expect(store.get("b")).toBe(2);
    expect(root).toHaveBeenCalledOnce();
    expect(gone).toHaveBeenCalledOnce();
    expect(arrived).toHaveBeenCalledOnce();
    expect(kept).not.toHaveBeenCalled();
  });
});

describe("fromZustand", () => {
  it("writes into the Zustand store the host created", () => {
    const api = createZustandStore<Record<string, unknown>>()(() => ({ a: { b: 1 } }));
    const store = fromZustand(api);
    store.set("a.b", 2);
    expect(api.getState()).toEqual({ a: { b: 2 } });
    expect(store.snapshot()).toBe(api.getState());
  });

  it("hears a state changed underneath it (time travel, rehydration)", () => {
    const api = createZustandStore<Record<string, unknown>>()(() => ({ a: { b: 1 }, other: 1 }));
    const store = fromZustand(api);
    const changed = vi.fn();
    const untouched = vi.fn();
    store.subscribe("a.b", changed);
    store.subscribe("other", untouched);
    api.setState({ a: { b: 2 }, other: 1 }, true);
    expect(store.get("a.b")).toBe(2);
    expect(changed).toHaveBeenCalledOnce();
    expect(untouched).not.toHaveBeenCalled();
  });

  it("works through middleware", () => {
    const api = createZustandStore<Record<string, unknown>>()(subscribeWithSelector<Record<string, unknown>>(() => ({ n: 1 })));
    const store = fromZustand(api);
    const selected = vi.fn();
    api.subscribe((state) => state["n"], selected);
    store.set("n", 2);
    expect(selected).toHaveBeenCalledWith(2, 1);
    expect(() => store.set("viewModels.pages", {})).toThrow(/setConfig/);
  });
});
