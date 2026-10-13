/** The event bus contract: order, filters, isolation and the loop guard. */
import { describe, expect, it, vi } from "vitest";
import type { WidgetEvent } from "@wirework/schema";
import { createEventBus, EventLoopError } from "../index";

type Envelope = Omit<WidgetEvent, "seq">;

const envelope = (overrides: Partial<Envelope> = {}): Envelope => ({
  widget: "counter",
  name: "incremented",
  payload: { value: 1 },
  source: { page: "demo", cell: "c1" },
  ...overrides,
});

describe("createEventBus", () => {
  it("stamps a monotonic seq and notifies matching subscribers in registration order", () => {
    const bus = createEventBus();
    const seen: string[] = [];
    bus.subscribe({}, (event) => seen.push(`all#${event.seq}`));
    bus.subscribe({ cell: "c1" }, (event) => seen.push(`c1#${event.seq}`));
    bus.subscribe({ cell: "c2" }, () => seen.push("c2"));
    bus.subscribe({ widget: "counter", name: "incremented", page: "demo", cell: "c1" }, () => seen.push("exact"));
    bus.subscribe({ page: "other" }, () => seen.push("other"));
    bus.emit(envelope());
    bus.emit(envelope());
    expect(seen).toEqual(["all#1", "c1#1", "exact", "all#2", "c1#2", "exact"]);
  });

  it("isolates a throwing listener from the rest", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const bus = createEventBus();
    const healthy = vi.fn();
    bus.subscribe({}, () => {
      throw new Error("listener bug");
    });
    bus.subscribe({}, healthy);
    expect(() => bus.emit(envelope())).not.toThrow();
    expect(healthy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("snapshots subscribers per emit: (un)subscribing during notification is safe", () => {
    const bus = createEventBus();
    const late = vi.fn();
    const stop = bus.subscribe({}, () => {
      stop();
      bus.subscribe({}, late);
    });
    bus.emit(envelope());
    expect(late).not.toHaveBeenCalled();
    bus.emit(envelope());
    expect(late).toHaveBeenCalledOnce();
  });

  it("regression: a re-emitting listener throws EventLoopError at the ORIGINAL emitter", () => {
    const bus = createEventBus();
    const listener = vi.fn((event: WidgetEvent) => bus.emit(event));
    bus.subscribe({}, listener);
    expect(() => bus.emit(envelope())).toThrow(EventLoopError);
    expect(listener).toHaveBeenCalledTimes(32);
  });

  it("regression: a BRANCHING loop stops at the first trip instead of running 2^depth emits", () => {
    const bus = createEventBus();
    let calls = 0;
    bus.subscribe({}, (event) => {
      calls += 1;
      bus.emit(event);
      bus.emit(event);
    });
    expect(() => bus.emit(envelope())).toThrow(EventLoopError);
    expect(calls).toBe(32);
  });

  it("recovers after a loop: the depth counter is back to zero", () => {
    const bus = createEventBus();
    const stop = bus.subscribe({}, (event) => bus.emit(event));
    expect(() => bus.emit(envelope())).toThrow(EventLoopError);
    stop();
    const listener = vi.fn();
    bus.subscribe({}, listener);
    expect(() => bus.emit(envelope())).not.toThrow();
    expect(listener).toHaveBeenCalledOnce();
  });
});
