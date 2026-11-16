/**
 * ALL header-period logic lives here (guidelines: render-only components):
 * the start and end date a DATE column's filter opens from its header
 * (use-table-headers.ts). antd hands the box its selected keys and the
 * confirm/clear callbacks (a filter dropdown's props); the period is two
 * keys — [from, to] as the store's text, either "" for an open end —,
 * Filter confirms it, Reset clears AND confirms. The two dates are two
 * fields, each its own: one may be given without the other.
 */
import { useCallback, useMemo } from "react";
import type { Dayjs } from "dayjs";
import type { FilterDropdownProps } from "antd/es/table/interface";
import { periodPicker, toDayjs, toText } from "./dates";

export function useHeaderPeriod(
  { selectedKeys, setSelectedKeys, confirm, clearFilters }: FilterDropdownProps,
  /** Each end is a date and a time; false: a whole day. */
  withTime: boolean,
) {
  const from = String(selectedKeys[0] ?? "");
  const to = String(selectedKeys[1] ?? "");
  const start = useMemo(() => toDayjs(from), [from]);
  const end = useMemo(() => toDayjs(to), [to]);

  const keep = useCallback(
    (nextFrom: string, nextTo: string) => setSelectedKeys(nextFrom === "" && nextTo === "" ? [] : [nextFrom, nextTo]),
    [setSelectedKeys],
  );
  const pickStart = useCallback((date: Dayjs | null) => keep(toText(date, withTime), to), [keep, to, withTime]);
  const pickEnd = useCallback((date: Dayjs | null) => keep(from, toText(date, withTime)), [keep, from, withTime]);
  const picker = useMemo(() => periodPicker(withTime), [withTime]);
  const apply = useCallback(() => confirm({ closeDropdown: true }), [confirm]);
  const reset = useCallback(() => clearFilters?.({ confirm: true, closeDropdown: true }), [clearFilters]);

  return { start, end, from, to, picker, pickStart, pickEnd, apply, reset };
}
