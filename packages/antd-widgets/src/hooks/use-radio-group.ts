/** ALL antd-radio-group logic lives here (guidelines: render-only components). */
import { useCallback, useMemo } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { ChoiceOption } from "@wirework/widget-contracts";
import type { RadioGroupEvents } from "../widgets/antd-radio-group";

export function useRadioGroup(
  store: ReadableStore,
  emit: Emit<RadioGroupEvents>,
  paths: { value: string; options?: string | undefined },
  ports: { value: PortDefinition<string>; options: PortDefinition<ChoiceOption[]> },
  settingOptions: ChoiceOption[],
) {
  const value = usePort(store, paths.value, ports.value) ?? "";
  // A bound options port wins; a missing or malformed one shows the setting's.
  const options = usePort(store, paths.options, ports.options) ?? settingOptions;
  const radioOptions = useMemo(
    () =>
      options.map(({ value: optionValue, label, disabled }) => ({
        value: optionValue,
        label: label ?? optionValue,
        disabled: disabled === true,
      })),
    [options],
  );
  const change = useCallback((next: string) => emit("changed", { value: next }), [emit]);
  return { value, options: radioOptions, change };
}
