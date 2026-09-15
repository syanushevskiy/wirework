/**
 * ALL state-inspector logic lives here (guidelines: render-only components).
 *
 * The inspector shows the ENTIRE store (view models + data models) as JSON:
 *  - LIVE while untouched — widget interactions appear immediately,
 *  - frozen as a draft once the user edits, until Apply (store.replace) or
 *    Reset. Invalid JSON — and a structurally invalid `viewModels` /
 *  `userViewModels` tree — reports an error and never reaches the store.
 */
import { useCallback, useState } from "react";
import { userViewModelsSchema, viewModelsSchema, type Store } from "@wirework/schema";
import { useStoreSnapshot } from "@wirework/react";

export function useStateInspector(store: Store) {
  const snapshot = useStoreSnapshot(store);
  /** null = live view; a string = user's in-progress draft. */
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const text = draft ?? JSON.stringify(snapshot, null, 2);
  const dirty = draft !== null;

  const edit = useCallback((value: string) => {
    setDraft(value);
    setError(null);
  }, []);

  const apply = useCallback(() => {
    if (draft === null) return;
    try {
      const parsed: unknown = JSON.parse(draft);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("state root must be a JSON object");
      }
      const root = parsed as Record<string, unknown>;
      // Structural check: a broken tree must never reach the engine.
      for (const [key, schema] of [
        ["viewModels", viewModelsSchema],
        ["userViewModels", userViewModelsSchema],
      ] as const) {
        if (root[key] === undefined) continue;
        const result = schema.safeParse(root[key]);
        if (!result.success) {
          throw new Error(
            `${key}: ${result.error.issues
              .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
              .join("; ")}`,
          );
        }
      }
      store.replace(root);
      setDraft(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [draft, store]);

  const reset = useCallback(() => {
    setDraft(null);
    setError(null);
  }, []);

  return { text, dirty, error, edit, apply, reset };
}
