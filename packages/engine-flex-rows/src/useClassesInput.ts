/**
 * ALL ClassesInput logic: the draft of a row's or a cell's classes while
 * it is typed, committed on Enter and on blur (one change per edit, not
 * one per keystroke), reset when the saved value changes under it, and
 * which of its names the vocabulary does not know.
 */
import { useCallback, useState, type KeyboardEvent } from "react";
import { unknownClasses } from "./classes";

export function useClassesInput(value: string | undefined, onCommit: (classes: string) => void) {
  const saved = value ?? "";
  const [draft, setDraft] = useState(saved);
  // State derived from a changed prop, set during render as React has it: a
  // value saved elsewhere (a cancelled session, an inspector edit) replaces the draft.
  const [seen, setSeen] = useState(saved);
  if (saved !== seen) {
    setSeen(saved);
    setDraft(saved);
  }
  const commit = useCallback(() => {
    if (draft.trim() !== saved) onCommit(draft.trim());
  }, [draft, saved, onCommit]);
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commit();
    },
    [commit],
  );
  return { draft, setDraft, commit, onKeyDown, unknown: unknownClasses(draft) };
}
