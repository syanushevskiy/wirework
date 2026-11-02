/**
 * useWhen — a cell's condition as a live answer: shown without one, hidden
 * or shown as the store changes under the paths it reads, a host predicate
 * from the registry given, and a predicate that throws as an error — never
 * a throw out of the hook.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { When } from "@wirework/schema";
import { createPredicates } from "@wirework/engine";
import { createStore } from "@wirework/store";
import { useWhen } from "../useWhen";

const notEmpty: When = [{ path: "run.error", is: "empty", not: true }];

describe("useWhen", () => {
  it("is shown without a condition, and follows the store with one", () => {
    const store = createStore({ run: {} });
    expect(renderHook(() => useWhen(store, undefined)).result.current).toEqual({ shown: true });
    const { result } = renderHook(() => useWhen(store, notEmpty));
    expect(result.current).toEqual({ shown: false, text: "unless run.error is empty" });
    act(() => store.set("run.error", "There is no run"));
    expect(result.current.shown).toBe(true);
    act(() => store.set("run.error", ""));
    expect(result.current.shown).toBe(false);
  });

  it("evaluates a host predicate from the registry given", () => {
    const predicates = createPredicates();
    predicates.register({
      name: "runs/retryable",
      description: "an even id",
      phrase: "can be retried",
      test: (run) => Number((run as { id?: string } | null)?.id) % 2 === 0,
    });
    const store = createStore({ run: { data: { id: "123457" } } });
    const { result } = renderHook(() => useWhen(store, [{ path: "run.data", is: "runs/retryable" }], { predicates }));
    expect(result.current.shown).toBe(false);
    act(() => store.set("run.data", { id: "123456" }));
    expect(result.current.shown).toBe(true);
  });

  it("turns a throwing predicate into an error reported once, not a throw, and recovers when the value changes", () => {
    const predicates = createPredicates();
    predicates.register({
      name: "host/picky",
      description: "throws on a number",
      phrase: "is fine",
      test: (value) => {
        if (typeof value === "number") throw new Error("numbers are not fine");
        return true;
      },
    });
    const store = createStore({ x: 1 });
    const onError = vi.fn();
    const { result, rerender } = renderHook(() =>
      // A fresh callback every render, as a host's inline arrow is: still one report per error.
      useWhen(store, [{ path: "x", is: "host/picky" }], { predicates, onError: (...args) => onError(...args) }),
    );
    expect(result.current.shown).toBe(false);
    expect(result.current.error?.message).toBe("numbers are not fine");
    rerender();
    expect(onError).toHaveBeenCalledTimes(1);
    act(() => store.set("x", "one"));
    expect(result.current).toEqual({ shown: true, text: "when x is fine" });
    act(() => store.set("x", 2));
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
