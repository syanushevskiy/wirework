/** ALL antd-checkbox logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { CheckboxEvents } from "../widgets/antd-checkbox";

export function useCheckbox(
  store: ReadableStore,
  emit: Emit<CheckboxEvents>,
  path: string,
  port: PortDefinition<boolean>,
) {
  const checked = usePort(store, path, port) === true;
  // The widget only EMITS; the view model's reaction stores the new state.
  const change = useCallback((next: boolean) => emit("changed", { checked: next }), [emit]);
  return { checked, change };
}
