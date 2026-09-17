/** The reaction interpreter: what a user's `on` section actually does. */
import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";
import { bindReactions, createActions, reactionValue, resolvePage, type ResolveInput } from "../index";
import { cell, counter, enginesWith, listEngine, page, plain, registryWith } from "./fixtures";

const emit = (bus: ReturnType<typeof createEventBus>, payload: unknown, cellId = "c1") =>
  bus.emit({ widget: "counter", name: "changed", payload, source: { page: "demo", cell: cellId } });

const bind = (on: unknown, actions = createActions()) => {
  const store = createStore({ demo: { n: 0 } });
  const bus = createEventBus();
  const input: ResolveInput = {
    viewModels: page([cell()], { counter: { default: { inputs: { value: "demo.n" }, on } } }),
    page: "demo",
    registry: registryWith(counter, plain),
    layoutEngines: enginesWith(listEngine),
    actions,
  };
  const plan = resolvePage(input);
  const unbind = bindReactions(bus, store, plan, actions);
  return { store, bus, unbind, plan };
};

describe("reactionValue", () => {
  it("prefers a literal, then the named field, then the whole payload", () => {
    expect(reactionValue({ set: "a", value: 7 }, { value: 1 })).toBe(7);
    expect(reactionValue({ set: "a", from: "value" }, { value: 1 })).toBe(1);
    expect(reactionValue({ set: "a" }, { value: 1 })).toEqual({ value: 1 });
    expect(reactionValue({ set: "a", from: "deep.value" }, { deep: { value: 2 } })).toBe(2);
  });
});

describe("bindReactions", () => {
  it("writes the store when the cell's event fires, and stops after unbind", () => {
    const { store, bus, unbind } = bind({ changed: [{ set: "demo.n", from: "value" }] });
    emit(bus, { value: 5 });
    expect(store.get("demo.n")).toBe(5);
    unbind();
    emit(bus, { value: 9 });
    expect(store.get("demo.n")).toBe(5);
  });

  it("ignores events from another cell", () => {
    const { store, bus } = bind({ changed: [{ set: "demo.n", from: "value" }] });
    emit(bus, { value: 5 }, "other-cell");
    expect(store.get("demo.n")).toBe(0);
  });

  it("regression: runs an event's reactions in declaration order, awaiting async actions", async () => {
    const order: string[] = [];
    const actions = createActions();
    actions.register({
      name: "runs/load",
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push("load");
      },
    });
    actions.register({ name: "nav/go", handler: () => void order.push("navigate") });
    const { bus } = bind({ changed: [{ call: "runs/load" }, { call: "nav/go" }] }, actions);
    emit(bus, { value: 1 });
    await vi.waitFor(() => expect(order).toEqual(["load", "navigate"]));
  });

  it("regression: a failing reaction stops its own chain and never throws at the emitter", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const actions = createActions();
    actions.register({ name: "boom", handler: () => { throw new Error("nope"); } });
    const { store, bus } = bind({ changed: [{ call: "boom" }, { set: "demo.n", from: "value" }] }, actions);
    expect(() => emit(bus, { value: 5 })).not.toThrow();
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(store.get("demo.n")).toBe(0);
    spy.mockRestore();
  });

  it("regression: synchronous reactions run synchronously, even after a synchronous action", () => {
    const actions = createActions();
    actions.register({ name: "log-it", handler: () => undefined });
    const { store, bus } = bind({ changed: [{ call: "log-it" }, { set: "demo.n", from: "value" }] }, actions);
    emit(bus, { value: 4 });
    // No await: a controlled widget reads its own write in the same tick.
    expect(store.get("demo.n")).toBe(4);
  });

  it("regression: unbinding stops a chain waiting on an async action and aborts its signal", async () => {
    let release: () => void = () => undefined;
    let seen: AbortSignal | undefined;
    const actions = createActions();
    actions.register({
      name: "runs/load",
      handler: ({ signal }) => {
        seen = signal;
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    });
    const { store, bus, unbind } = bind({ changed: [{ call: "runs/load" }, { set: "demo.n", from: "value" }] }, actions);
    emit(bus, { value: 7 });
    unbind();
    expect(seen?.aborted).toBe(true);
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.get("demo.n")).toBe(0);
  });

  it("a rejected async action stops its chain", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const actions = createActions();
    actions.register({ name: "runs/load", handler: async () => Promise.reject(new Error("offline")) });
    const { store, bus } = bind({ changed: [{ call: "runs/load" }, { set: "demo.n", from: "value" }] }, actions);
    emit(bus, { value: 2 });
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(store.get("demo.n")).toBe(0);
    spy.mockRestore();
  });

  it("hands the action the event, the store and its static args", () => {
    const handler = vi.fn();
    const actions = createActions();
    actions.register({ name: "log-it", handler });
    const { bus, store } = bind({ changed: [{ call: "log-it", with: { level: "info" } }] }, actions);
    emit(bus, { value: 3 });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ store, args: { level: "info" }, event: expect.objectContaining({ payload: { value: 3 } }) }),
    );
  });

  it("binds nothing for a cell that could not be resolved", () => {
    const store = createStore({});
    const bus = createEventBus();
    const plan = resolvePage({
      viewModels: page([cell({ widget: "ghost" })], {}),
      page: "demo",
      registry: registryWith(counter),
      layoutEngines: enginesWith(listEngine),
    });
    expect(() => bindReactions(bus, store, plan)()).not.toThrow();
  });
});
