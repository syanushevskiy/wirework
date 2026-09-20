/** The per-cell emitter: what a widget's `emit` guarantees to every subscriber. */
import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "@wirework/events";
import { createEmitter, WidgetEventError } from "../index";
import { counter } from "./fixtures";

const source = { page: "demo", cell: "c1" };

describe("createEmitter", () => {
  it("emits a declared event with the validated payload and the engine's source stamp", () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.subscribe({}, listener);
    createEmitter(bus, counter, source)("changed", { value: 3 });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ widget: "counter", name: "changed", payload: { value: 3 }, source }),
    );
  });

  it("refuses an event the widget does not declare — inherited names included", () => {
    const emit = createEmitter(createEventBus(), counter, source);
    expect(() => emit("nope", {})).toThrow(WidgetEventError);
    expect(() => emit("nope", {})).toThrow(/does not declare event "nope" \(declared: changed\)/);
    expect(() => emit("toString", {})).toThrow(/does not declare event "toString"/);
  });

  it("refuses a payload the declaration rejects, and never reaches the bus", () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.subscribe({}, listener);
    const emit = createEmitter(bus, counter, source);
    expect(() => emit("changed", { value: "three" })).toThrow(/event "changed" payload rejected/);
    expect(listener).not.toHaveBeenCalled();
  });
});
