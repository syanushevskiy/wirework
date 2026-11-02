/** ALL antd-rate logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { RateEvents } from "../widgets/antd-rate";

export function useRate(store: ReadableStore, emit: Emit<RateEvents>, path: string, port: PortDefinition<number>) {
  const value = usePort(store, path, port) ?? 0;
  // The widget only EMITS; the view model's reaction stores the score (antd reports a cleared score as 0).
  const change = useCallback((next: number) => emit("changed", { value: next }), [emit]);
  return { value, change };
}
