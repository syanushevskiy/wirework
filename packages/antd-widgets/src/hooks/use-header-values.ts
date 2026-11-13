/**
 * ALL header-values logic lives here (guidelines: render-only components):
 * the list a column whose filter is a list of VALUES opens from its header
 * (use-table-headers.ts). antd hands the box its selected keys and the
 * confirm/clear/close callbacks (a filter dropdown's props). Every pick
 * APPLIES at once — the keys are set and confirmed, the box stays open —,
 * so there is nothing to apply at the end: Reset applies "nothing chosen",
 * Done only closes.
 */
import { useCallback, useMemo } from "react";
import type { FilterDropdownProps } from "antd/es/table/interface";
import type { ChoiceOption } from "@wirework/widget-contracts";

export function useHeaderValues(
  { selectedKeys, setSelectedKeys, confirm, clearFilters, close }: FilterDropdownProps,
  offered: ChoiceOption[],
) {
  const values = useMemo(() => selectedKeys.map(String), [selectedKeys]);
  const options = useMemo(
    () => offered.map(({ value, label, disabled }) => ({ value, label: label ?? value, disabled: disabled === true })),
    [offered],
  );

  const pick = useCallback(
    (next: string[]) => {
      setSelectedKeys(next);
      confirm({ closeDropdown: false });
    },
    [setSelectedKeys, confirm],
  );
  const reset = useCallback(() => clearFilters?.({ confirm: true, closeDropdown: false }), [clearFilters]);

  return {
    values,
    options,
    pick,
    reset,
    done: close,
    /** For tests and inspection: the labels on offer, and what is chosen. */
    offeredAttribute: options.map((option) => option.label).join(", "),
    chosenAttribute: values.join(","),
  };
}
