/**
 * ALL state-inspector logic lives here (guidelines: render-only components).
 *
 * ONE SECTION of the store (state-sections.ts) as editable JSON:
 *  - LIVE while untouched — widget interactions appear immediately,
 *  - frozen as a draft once the user edits, until Apply or Reset.
 * Apply merges the edited part back into the whole tree and replaces the
 * store with it. Invalid JSON — and a structurally invalid `viewModels` /
 * `userViewModels` tree — reports an error and never reaches the store.
 */
import { useCallback, useMemo, useState } from "react";
import { userViewModelsSchema, viewModelsSchema, type Store } from "@wirework/schema";
import { errorText, issuesText } from "@wirework/engine";
import { useStoreSnapshot } from "@wirework/react";
import type { StateObject, StateSection } from "../state-sections";

export function useStateInspector(store: Store, section: StateSection) {
  const snapshot = useStoreSnapshot(store);
  /** null = live view; a string = user's in-progress draft. */
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const live = useMemo(() => JSON.stringify(section.pick(snapshot), null, 2), [snapshot, section]);
  const text = draft ?? live;
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
        throw new Error("the section's root must be a JSON object");
      }
      const next = section.merge(snapshot, parsed as StateObject);
      // Structural check: a broken tree must never reach the engine.
      for (const [key, schema] of [
        ["viewModels", viewModelsSchema],
        ["userViewModels", userViewModelsSchema],
      ] as const) {
        if (next[key] === undefined) continue;
        const result = schema.safeParse(next[key]);
        if (!result.success) throw new Error(`${key}: ${issuesText(result.error)}`);
      }
      store.replace(next);
      setDraft(null);
      setError(null);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [draft, section, snapshot, store]);

  const reset = useCallback(() => {
    setDraft(null);
    setError(null);
  }, []);

  return { text, dirty, error, edit, apply, reset };
}
