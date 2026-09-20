/**
 * Select — the antd implementation of the `select` contract: a controlled
 * antd Select whose value lives at the `value` port. Every pick EMITS
 * `changed`; the required reaction writes it back. The label names the
 * combobox. Render-only: logic in useSelect.
 */
import { Flex, Select, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { selectContract } from "@wirework/widget-contracts";
import { useSelect } from "../hooks/use-select";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type SelectEvents = (typeof selectContract)["events"];

function AntdSelect({ viewModel, store, emit }: ContractProps<typeof selectContract>) {
  const { id, value, options, change } = useSelect(
    store,
    emit,
    { value: viewModel.inputs.value, options: viewModel.inputs.options },
    selectContract.io.inputs,
    viewModel.options,
  );

  return (
    <Flex vertical gap={4} data-testid="antd-select" data-path={viewModel.inputs.value} data-value={value}>
      {viewModel.label ? (
        <label htmlFor={id}>
          <Typography.Text>{viewModel.label}</Typography.Text>
        </label>
      ) : null}
      <Select
        id={id}
        className="ww-select"
        aria-label={viewModel.label ?? viewModel.placeholder}
        placeholder={viewModel.placeholder}
        allowClear={viewModel.allowClear}
        // "" means nothing chosen: antd shows the placeholder for undefined only.
        value={value === "" ? undefined : value}
        options={options}
        onChange={change}
      />
    </Flex>
  );
}

export const antdSelect = implementContract(selectContract, {
  type: "antd-select",
  component: AntdSelect,
});
