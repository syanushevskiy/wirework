/** ALL antd-counter logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";
import type { CounterEvents } from "../widgets/antd-counter";

export function useCounter(
  store: ReadableStore,
  emit: Emit<CounterEvents>,
  inputPath: string,
  step: number,
  fallback: number,
) {
  const raw = useStorePath<unknown>(store, inputPath);
  // Nothing at the path -> the port's declared default. Runtime reads are
  // not validated (data is live): a mis-wired reaction may put anything at
  // the input path. Stay resilient — SHOW it, never crash.
  const value = typeof raw === "number" ? raw : raw === undefined ? fallback : JSON.stringify(raw);

  // Read fresh at event time — a render-time snapshot could lose an
  // increment if two dispatches land before a re-render. The widget only
  // EMITS the next value; the view model's reaction writes the store.
  const increment = useCallback(() => {
    const current = store.get<unknown>(inputPath);
    emit("incremented", { value: (typeof current === "number" ? current : fallback) + step });
  }, [store, emit, inputPath, step]);

  return { value, increment };
}
