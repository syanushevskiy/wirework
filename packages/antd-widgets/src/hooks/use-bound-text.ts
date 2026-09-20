/**
 * Text from an optional port with a static fallback — shared by the display
 * widgets whose contracts say "an empty value shows the static text" (tag,
 * alert). A bound value that is not a string is shown as text, never a
 * crash: display widgets show what is there.
 */
import type { ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";

export function useBoundText(store: ReadableStore, path: string | undefined, fallback: string): string {
  const bound = useStorePath<unknown>(store, path);
  return bound === undefined || bound === null || bound === "" ? fallback : String(bound);
}
