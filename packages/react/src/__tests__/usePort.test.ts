/**
 * usePort — an input port's value, validated by the port: the declared
 * default for an unbound port, for nothing at the path and for a value the
 * validator rejects; parsed once per stored value, so an object port keeps
 * its identity between renders.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { PortDefinition } from "@wirework/schema";
import { createStore } from "@wirework/store";
import { usePort } from "../usePort";

const count: PortDefinition<number> = { value: z.number(), default: 7 };
const point: PortDefinition<{ x: number }> = { value: z.object({ x: z.number() }), default: { x: 0 } };

describe("usePort", () => {
  it("reads the declared default for an unbound port, an empty path and a rejected value", () => {
    const store = createStore({ runs: { count: "many" } });
    expect(renderHook(() => usePort(store, undefined, count)).result.current).toBe(7);
    expect(renderHook(() => usePort(store, "runs.missing", count)).result.current).toBe(7);
    expect(renderHook(() => usePort(store, "runs.count", count)).result.current).toBe(7);
  });

  it("reads the value the validator accepts and follows the store", () => {
    const store = createStore({ runs: { count: 3 } });
    const { result } = renderHook(() => usePort(store, "runs.count", count));
    expect(result.current).toBe(3);

    act(() => store.set("runs.count", 4));
    expect(result.current).toBe(4);
    act(() => store.set("runs.count", "four"));
    expect(result.current).toBe(7);
  });

  it("parses once per stored value: an object port keeps its identity across renders", () => {
    const store = createStore({ pos: { x: 1 } });
    const { result, rerender } = renderHook(() => usePort(store, "pos", point));
    const first = result.current;
    expect(first).toEqual({ x: 1 });

    rerender();
    expect(result.current).toBe(first);
    act(() => store.set("pos", { x: 2 }));
    expect(result.current).toEqual({ x: 2 });
  });
});
