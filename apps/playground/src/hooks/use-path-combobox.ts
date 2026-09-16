/**
 * ALL path-combobox logic lives here (guidelines: render-only components):
 * the compatible paths are read once when the field opens (walking the
 * store is not free), then filtered by what the user has typed. Whatever
 * is typed stays the value — a path may name state that does not exist yet.
 */
import { useCallback, useMemo, useState } from "react";

export function usePathCombobox(value: string, suggestions: () => string[]) {
  const [available, setAvailable] = useState<string[]>([]);

  const load = useCallback(() => setAvailable(suggestions()), [suggestions]);

  const options = useMemo(
    () =>
      available
        .filter((path) => path.includes(value.trim()))
        .map((path) => ({ value: path, label: path })),
    [available, value],
  );

  return { options, load };
}
