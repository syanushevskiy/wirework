/** ALL status-badge logic lives here (guidelines: render-only components). */
import type { ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";

export function useStatusBadge(store: ReadableStore, path: string, fallback: string, prefix: string) {
  const raw = useStorePath<unknown>(store, path);
  const state = typeof raw === "string" ? raw : raw === undefined ? fallback : String(raw);
  return { state, text: `${prefix}${state}` };
}
