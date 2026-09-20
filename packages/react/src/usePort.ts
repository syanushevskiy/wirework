/**
 * usePort — the value at an input port's bound path, VALIDATED by the
 * port's own validator: an unbound port, an empty path or a value the
 * validator rejects all give the port's declared default. One hook instead
 * of a hand-written "read, check, fall back" per widget (team-tiger review:
 * seven copies, and the one without a check crashed the table on a
 * malformed value from the inspector).
 *
 * Widgets that deliberately SHOW a malformed value (an echo, a text input
 * displaying whatever is there) read `useStorePath` directly instead.
 */
import { useMemo } from "react";
import type { PortDefinition, ReadableStore } from "@wirework/schema";
import { useStorePath } from "./useStorePath";

export function usePort<T>(store: ReadableStore, path: string | undefined, port: PortDefinition<T>): T | undefined {
  const raw = useStorePath<unknown>(store, path);
  // Parsed once per stored value: zod returns a fresh object, and a fresh
  // object every render would re-render everything downstream.
  return useMemo(() => {
    if (raw === undefined) return port.default;
    try {
      return port.value.parse(raw);
    } catch {
      return port.default;
    }
  }, [raw, port]);
}
