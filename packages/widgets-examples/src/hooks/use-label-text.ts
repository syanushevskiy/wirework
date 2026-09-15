/** ALL dummy-label logic lives here (guidelines: render-only components). */
import type { ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";

/** Bound store value when the optional port is wired and holds one, else the static text. */
export function useLabelText(
  store: ReadableStore,
  path: string | undefined,
  fallback: string,
): string {
  const bound = useStorePath<unknown>(store, path);
  return bound === undefined ? fallback : String(bound);
}
