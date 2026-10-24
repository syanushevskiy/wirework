/**
 * ALL header-search logic lives here (guidelines: render-only components):
 * the search box a TEXT filter opens from a column header of the infinite
 * table. antd hands the box its selected keys and the confirm/clear
 * callbacks (a filter dropdown's props); the text is the one key, Enter or
 * Search confirms it, Reset clears AND confirms, and the box takes focus
 * whenever it opens.
 */
import { useCallback, useEffect, useRef } from "react";
import type { InputRef } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";

export function useHeaderSearch({
  selectedKeys,
  setSelectedKeys,
  confirm,
  clearFilters,
  visible,
}: FilterDropdownProps) {
  const inputRef = useRef<InputRef>(null);
  // The dropdown animates in; focusing on the next task finds it in place.
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus({ cursor: "all" }), 0);
    return () => clearTimeout(timer);
  }, [visible]);

  const text = String(selectedKeys[0] ?? "");
  const type = useCallback((next: string) => setSelectedKeys(next === "" ? [] : [next]), [setSelectedKeys]);
  const search = useCallback(() => confirm({ closeDropdown: true }), [confirm]);
  const reset = useCallback(() => clearFilters?.({ confirm: true, closeDropdown: true }), [clearFilters]);

  return { inputRef, text, type, search, reset };
}
