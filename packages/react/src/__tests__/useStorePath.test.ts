/**
 * useStorePath — the canonical reactive read of a store path: a write at
 * the path re-renders with the new value, a changed path reads the other
 * value, and an undefined path (an optional port left unbound) subscribes
 * to nothing and reads undefined.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createStore } from "@wirework/store";
import { useStorePath } from "../useStorePath";

describe("useStorePath", () => {
  it("reads the value at the path and follows writes to it", () => {
    const store = createStore({ runs: { count: 1 } });
    const { result } = renderHook(() => useStorePath<number>(store, "runs.count"));
    expect(result.current).toBe(1);

    act(() => store.set("runs.count", 2));
    expect(result.current).toBe(2);
  });

  it("reads the other path when the path changes", () => {
    const store = createStore({ a: "first", b: "second" });
    const { result, rerender } = renderHook(({ path }) => useStorePath<string>(store, path), {
      initialProps: { path: "a" },
    });
    expect(result.current).toBe("first");

    rerender({ path: "b" });
    expect(result.current).toBe("second");
  });

  it("reads undefined for an undefined path, whatever the store holds", () => {
    const store = createStore({ runs: { count: 1 } });
    const { result } = renderHook(() => useStorePath(store, undefined));
    expect(result.current).toBeUndefined();

    act(() => store.set("runs.count", 2));
    expect(result.current).toBeUndefined();
  });
});
