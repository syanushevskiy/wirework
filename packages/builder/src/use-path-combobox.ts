/**
 * ALL path-combobox logic lives here (guidelines: render-only components):
 * the compatible paths are read once when the field opens (walking the
 * store is not free), then filtered by what the user has typed. Whatever
 * is typed stays the value — a path may name state that does not exist yet.
 *
 * A field that still holds the path a builder SUGGESTED has not been typed
 * into: it lists every compatible path, so existing data stays one click
 * away instead of being filtered out by a generated name.
 */
import { useCallback, useMemo, useState } from "react";

export function usePathCombobox(value: string, suggestions: () => string[], suggested?: string) {
  const [available, setAvailable] = useState<string[]>([]);

  const load = useCallback(() => setAvailable(suggestions()), [suggestions]);

  const typed = value === suggested ? "" : value.trim();
  const options = useMemo(
    () => available.filter((path) => path.includes(typed)).map((path) => ({ value: path, label: path })),
    [available, typed],
  );

  return { options, load };
}
