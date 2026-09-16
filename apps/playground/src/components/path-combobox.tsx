/**
 * Store-path combobox — ONLY presentation (logic in use-path-combobox).
 * Autocomplete helper for binding a typed input port: suggestions are
 * existing store paths whose current value is compatible with the port's
 * declared type (computed lazily when the field opens). A custom path can
 * still be typed for wiring state that does not exist yet.
 */
import { AutoComplete } from "antd";
import { usePathCombobox } from "../hooks/use-path-combobox";

export interface PathComboboxProps {
  id: string;
  testId: string;
  value: string;
  placeholder?: string;
  /** Called when the field opens — returns the compatible existing paths. */
  suggestions: () => string[];
  onSelect: (path: string) => void;
}

export function PathCombobox({
  id,
  testId,
  value,
  placeholder = "select a store path…",
  suggestions,
  onSelect,
}: PathComboboxProps) {
  const { options, load } = usePathCombobox(value, suggestions);

  return (
    <AutoComplete
      id={id}
      data-testid={testId}
      className="pg-field pg-mono"
      placeholder={placeholder}
      value={value}
      options={options}
      // Every compatible path is in the DOM (no windowing): the list is
      // short enough, and a suggestion that exists must be findable.
      virtual={false}
      onFocus={load}
      onChange={onSelect}
    />
  );
}
