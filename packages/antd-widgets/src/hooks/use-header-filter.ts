/**
 * ALL header-filter logic lives here (guidelines: render-only components):
 * the control of the FILTER ROW under a column's title (use-table-headers.ts,
 * the `filterRow` setting). A list of values applies on every pick, and so
 * does a period of dates; a text is a DRAFT while it is typed — Enter or
 * leaving the field applies it, the clear icon applies "no text" — and
 * nothing is applied that changes nothing. The control sits inside the
 * header cell, which sorts on a click and on Enter: its own clicks and keys
 * stop there.
 */
import { useCallback, useMemo, useState, type SyntheticEvent } from "react";
import type { Dayjs } from "dayjs";
import type { ColumnFilter, DateRange } from "@wirework/widget-contracts";
import { periodPicker, toDayjs, toText } from "./dates";
import type { ColumnChoice } from "./use-table-headers";

const stop = (event: SyntheticEvent): void => event.stopPropagation();

/** The header cell's sorting never hears what happens inside the control (a Select's popup included: React bubbles through portals). */
const OWN = { onClick: stop, onKeyDown: stop };

export function useHeaderFilter(
  filter: ColumnFilter,
  values: string[],
  text: string,
  period: DateRange,
  change: (next: ColumnChoice) => void,
) {
  // What is being typed; undefined shows what is applied.
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const apply = useCallback(() => {
    if (draft === undefined) return;
    setDraft(undefined);
    const next = draft.trim();
    if (next !== text) change({ kind: "text", text: next });
  }, [draft, text, change]);

  const clear = useCallback(() => {
    setDraft(undefined);
    if (text !== "") change({ kind: "text", text: "" });
  }, [text, change]);

  const pickValues = useCallback((next: string[]) => change({ kind: "values", values: next }), [change]);
  // A period is two fields, each its own (as in the header's dropdown): one end may be given without the other.
  const [from, to] = period;
  // Each end a date and a time, unless the filter says whole days.
  const withTime = filter.kind === "dates" && filter.time !== false;
  const pickStart = useCallback(
    (date: Dayjs | null) => change({ kind: "dates", period: [toText(date, withTime), to] }),
    [change, to, withTime],
  );
  const pickEnd = useCallback(
    (date: Dayjs | null) => change({ kind: "dates", period: [from, toText(date, withTime)] }),
    [change, from, withTime],
  );
  const picker = useMemo(() => periodPicker(withTime), [withTime]);
  const start = useMemo(() => toDayjs(from), [from]);
  const end = useMemo(() => toDayjs(to), [to]);

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
    pickValues,
    start,
    end,
    picker,
    pickStart,
    pickEnd,
    /** For tests and inspection: what is applied, never the draft. */
    chosenAttribute:
      filter.kind === "values"
        ? values.join(",")
        : filter.kind === "dates"
          ? from === "" && to === ""
            ? ""
            : period.join(",")
          : text,
  };
}
