/**
 * ALL header-search logic lives here (guidelines: render-only components):
 * the search box a TEXT filter opens from a column header of a table
 * (use-table-headers.ts). antd hands the box its selected keys and the
 * confirm/clear/close callbacks (a filter dropdown's props); the text is the
 * one key. The table is searched AS THE TEXT IS TYPED — once typing has
 * paused for SEARCH_DELAY_MS, the box staying open —, so there is nothing to
 * apply at the end: Enter searches at once, Reset searches for nothing, Done
 * only closes. The box takes focus whenever it opens.
 */
import { useCallback, useEffect, useRef } from "react";
import type { InputRef } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";

/** How long typing must pause before the table is searched: a request a word, not a request a letter. */
export const SEARCH_DELAY_MS = 300;

export function useHeaderSearch({
  selectedKeys,
  setSelectedKeys,
  confirm,
  clearFilters,
  close,
  visible,
}: FilterDropdownProps) {
  const inputRef = useRef<InputRef>(null);
  // The dropdown animates in; focusing on the next task finds it in place.
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus({ cursor: "all" }), 0);
    return () => clearTimeout(timer);
  }, [visible]);

  // The search that waits for typing to pause.
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const forget = useCallback(() => {
    clearTimeout(pending.current);
    pending.current = undefined;
  }, []);
  useEffect(() => forget, [forget]);

  const text = String(selectedKeys[0] ?? "");
  const type = useCallback(
    (next: string) => {
      setSelectedKeys(next === "" ? [] : [next]);
      forget();
      pending.current = setTimeout(() => {
        pending.current = undefined;
        confirm({ closeDropdown: false });
      }, SEARCH_DELAY_MS);
    },
    [setSelectedKeys, confirm, forget],
  );
  /** Enter: at once, without the wait. */
  const search = useCallback(() => {
    forget();
    confirm({ closeDropdown: false });
  }, [confirm, forget]);
  const reset = useCallback(() => {
    forget();
    clearFilters?.({ confirm: true, closeDropdown: false });
  }, [clearFilters, forget]);
  /** Done: what was typed last is searched for before the box goes. */
  const done = useCallback(() => {
    if (pending.current !== undefined) search();
    close();
  }, [search, close]);

  return { inputRef, text, type, search, reset, done };
}
