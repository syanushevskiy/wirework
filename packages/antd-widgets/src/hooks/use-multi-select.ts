/** ALL antd-multi-select logic lives here (guidelines: render-only components). */
import { useCallback, useId, useMemo } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { ChoiceOption } from "@wirework/widget-contracts";
import type { MultiSelectEvents } from "../widgets/antd-multi-select";

const NONE: string[] = [];

export function useMultiSelect(
  store: ReadableStore,
  emit: Emit<MultiSelectEvents>,
  paths: { value: string; options?: string },
  ports: { value: PortDefinition<string[]>; options: PortDefinition<ChoiceOption[]> },
  settingOptions: ChoiceOption[],
) {
  /** Associates the visible label with the combobox. */
  const id = useId();
  const values = usePort(store, paths.value, ports.value) ?? NONE;
  // A bound options port wins; a missing or malformed one shows the setting's.
  const options = usePort(store, paths.options, ports.options) ?? settingOptions;
  const selectOptions = useMemo(
    () => options.map(({ value, label, disabled }) => ({ value, label: label ?? value, disabled })),
    [options],
  );

  // The widget only EMITS every chosen value; the view model's reaction stores them.
  const change = useCallback((next: string[]) => emit("changed", { value: next }), [emit]);

  return {
    id,
    values,
    options: selectOptions,
    change,
    // For tests and inspection: what is chosen and what is offered, in order.
    chosenAttribute: values.join(","),
    offeredAttribute: selectOptions.map((option) => option.label).join(", "),
  };
}
