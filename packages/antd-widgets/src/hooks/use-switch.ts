/** ALL antd-switch logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { SwitchEvents } from "../widgets/antd-switch";

export function useSwitch(store: ReadableStore, emit: Emit<SwitchEvents>, path: string, port: PortDefinition<boolean>) {
  const checked = usePort(store, path, port) === true;
  // The widget only EMITS; the view model's reaction stores the new state.
  const change = useCallback((next: boolean) => emit("changed", { checked: next }), [emit]);
  return { checked, change };
}
