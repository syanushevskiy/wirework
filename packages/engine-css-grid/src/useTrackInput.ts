/**
 * ALL TrackInput logic: a track size as a NUMBER and a UNIT (or a keyword),
 * the number a draft committed on Enter and on blur (one change per edit),
 * reset when the saved size changes under it, the unit committed at once.
 * A size the form does not edit (`minmax(...)`) has no parts: the field
 * shows it as text.
 */
import { useCallback, useState, type KeyboardEvent } from "react";
import { trackParts } from "./areas";
import { TRACK_KEYWORDS } from "./schema";

export function useTrackInput(value: string, onCommit: (size: string) => void) {
  const parts = trackParts(value);
  const savedNumber = parts !== undefined && "number" in parts ? parts.number : "";
  const [draft, setDraft] = useState(savedNumber);
  // State derived from a changed prop, set during render as React has it.
  const [seen, setSeen] = useState(savedNumber);
  if (savedNumber !== seen) {
    setSeen(savedNumber);
    setDraft(savedNumber);
  }
  const unit = parts === undefined ? "" : "unit" in parts ? parts.unit : parts.keyword;
  const commit = useCallback(() => {
    if (draft !== savedNumber && draft.trim() !== "" && Number(draft) >= 0) onCommit(`${draft.trim()}${unit}`);
  }, [draft, savedNumber, unit, onCommit]);
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commit();
    },
    [commit],
  );
  const setUnit = useCallback(
    (next: string) => {
      if ((TRACK_KEYWORDS as readonly string[]).includes(next)) onCommit(next);
      else onCommit(`${draft.trim() === "" ? "1" : draft.trim()}${next}`);
    },
    [draft, onCommit],
  );
  return { parts, draft, setDraft, unit, setUnit, commit, onKeyDown };
}
