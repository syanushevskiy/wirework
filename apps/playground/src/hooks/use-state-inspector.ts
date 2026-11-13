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
import { useCallback, useEffect, useMemo, useState } from "react";
import { userViewModelsSchema, viewModelsSchema, type Store } from "@wirework/schema";
import { errorText, issuesText } from "@wirework/engine";
import type { StateObject, StateSection } from "../state-sections";

/** How long the store must stay unchanged, once it is busy, before the inspector prints it again (ms). */
const QUIET = 250;

/**
 * The store as the inspector PRINTS it: at once after a change when the
 * store was quiet — a burst of writes in one task printed once — and then
 * NOT AGAIN until it has been quiet for `QUIET`. A list that writes where it
 * stands on every frame of a scroll would otherwise have hundreds of rows
 * printed and laid out again while it scrolls — in every frame, or every
 * few, which a hand on the wheel feels as the list stopping every so many
 * rows. `behind` says a change is waiting to be printed.
 */
function usePrintedSnapshot(store: Store): { printed: Record<string, unknown>; behind: boolean } {
  const [state, setState] = useState(() => ({ store, printed: store.snapshot(), behind: false }));
  useEffect(() => {
    let soon: ReturnType<typeof setTimeout> | undefined;
    let busy: ReturnType<typeof setTimeout> | undefined;
    let waiting = false;
    const print = () => {
      soon = undefined;
      waiting = false;
      setState({ store, printed: store.snapshot(), behind: false });
    };
    /** Busy from now: the store is printed when it has gone `QUIET` without a change, if one came meanwhile. */
    const settle = () => {
      clearTimeout(busy);
      busy = setTimeout(() => {
        busy = undefined;
        if (waiting) print();
      }, QUIET);
    };
    const unsubscribe = store.subscribe("", () => {
      setState((current) => (current.behind ? current : { ...current, behind: true }));
      if (busy === undefined) soon ??= setTimeout(print, 0);
      else if (soon === undefined) waiting = true;
      settle();
    });
    return () => {
      unsubscribe();
      clearTimeout(soon);
      clearTimeout(busy);
    };
  }, [store]);
  // Another store (another visit): what it holds now, until its first change is printed.
  return state.store === store ? state : { printed: store.snapshot(), behind: false };
}

export function useStateInspector(store: Store, section: StateSection) {
  const { printed, behind } = usePrintedSnapshot(store);
  /** null = live view; a string = user's in-progress draft. */
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const live = useMemo(() => JSON.stringify(section.pick(printed), null, 2), [printed, section]);
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
      // Merged into the store as it IS, not as it was last printed.
      const next = section.merge(store.snapshot(), parsed as StateObject);
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
  }, [draft, section, store]);

  const reset = useCallback(() => {
    setDraft(null);
    setError(null);
  }, []);

  return { text, dirty, behind, error, edit, apply, reset };
}
