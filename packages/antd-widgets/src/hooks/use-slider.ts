/** ALL antd-slider logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { SliderEvents } from "../widgets/antd-slider";

export function useSlider(store: ReadableStore, emit: Emit<SliderEvents>, path: string, port: PortDefinition<number>) {
  const value = usePort(store, path, port) ?? 0;
  // The widget only EMITS; the view model's reaction stores the new number.
  const change = useCallback((next: number) => emit("changed", { value: next }), [emit]);
  return { value, change };
}
