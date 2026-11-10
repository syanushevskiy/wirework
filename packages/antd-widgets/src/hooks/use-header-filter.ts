/**
 * ALL header-filter logic lives here (guidelines: render-only components):
 * the control of the FILTER ROW under a column's title (use-table-headers.ts,
 * the `filterRow` setting). A list of values applies on every pick; a text
 * is a DRAFT while it is typed — Enter or leaving the field applies it, the
 * clear icon applies "no text" — and nothing is applied that changes nothing.
 * The control sits inside the header cell, which sorts on a click and on
 * Enter: its own clicks and keys stop there.
 */
import { useCallback, useMemo, useState, type SyntheticEvent } from "react";
import type { ColumnFilter } from "@wirework/widget-contracts";

const stop = (event: SyntheticEvent): void => event.stopPropagation();

/** The header cell's sorting never hears what happens inside the control (a Select's popup included: React bubbles through portals). */
const OWN = { onClick: stop, onKeyDown: stop };

export function useHeaderFilter(
  filter: ColumnFilter,
  values: string[],
  text: string,
  change: (next: string[] | string) => void,
) {
  // What is being typed; undefined shows what is applied.
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const apply = useCallback(() => {
    if (draft === undefined) return;
    setDraft(undefined);
    const next = draft.trim();
    if (next !== text) change(next);
  }, [draft, text, change]);

  const clear = useCallback(() => {
    setDraft(undefined);
    if (text !== "") change("");
  }, [text, change]);

  const options = useMemo(
    () =>
      filter.kind === "values"
        ? filter.options.map(({ value, label, disabled }) => ({
            value,
            label: label ?? value,
            disabled: disabled === true,
          }))
        : [],
    [filter],
  );

  return {
    own: OWN,
    options,
    shown: draft ?? text,
    type: setDraft,
    apply,
    clear,
    /** For tests and inspection: what is applied, never the draft. */
    chosenAttribute: filter.kind === "values" ? values.join(",") : text,
  };
}
