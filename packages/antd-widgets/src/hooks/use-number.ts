/** ALL antd-number logic lives here (guidelines: render-only components). */
import { useCallback, useId } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { NumberEvents } from "../widgets/antd-number";

export function useNumber(
  store: ReadableStore,
  emit: Emit<NumberEvents>,
  path: string,
  port: PortDefinition<number | null>,
) {
  /** Associates the visible label with the field. */
  const id = useId();
  const value = usePort(store, path, port) ?? null;
  // The widget only EMITS; the view model's reaction stores the number. antd
  // hands over text while a number is half-typed: that is "empty" until it is one.
  const change = useCallback(
    (next: number | string | null) => emit("changed", { value: typeof next === "number" ? next : null }),
    [emit],
  );
  return { id, value, change };
}
