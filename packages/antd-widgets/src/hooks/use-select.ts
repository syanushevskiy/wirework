/** ALL antd-select logic lives here (guidelines: render-only components). */
import { useCallback, useId, useMemo } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { ChoiceOption } from "@wirework/widget-contracts";
import type { SelectEvents } from "../widgets/antd-select";

export function useSelect(
  store: ReadableStore,
  emit: Emit<SelectEvents>,
  paths: { value: string; options?: string },
  ports: { value: PortDefinition<string>; options: PortDefinition<ChoiceOption[]> },
  settingOptions: ChoiceOption[],
) {
  /** Associates the visible label with the combobox. */
  const id = useId();
  const value = usePort(store, paths.value, ports.value) ?? "";
  // A bound options port wins; a missing or malformed one shows the setting's.
  const options = usePort(store, paths.options, ports.options) ?? settingOptions;
  const selectOptions = useMemo(
    () => options.map(({ value: optionValue, label, disabled }) => ({ value: optionValue, label: label ?? optionValue, disabled })),
    [options],
  );

  // antd reports a cleared choice as undefined; the contract says "".
  const change = useCallback((next: string | undefined) => emit("changed", { value: next ?? "" }), [emit]);

  return { id, value, options: selectOptions, change };
}
