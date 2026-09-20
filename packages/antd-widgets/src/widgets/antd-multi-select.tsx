/**
 * Multi-select — the antd implementation of the `multi-select` contract: a
 * controlled antd Select in multiple mode whose values live at the `value`
 * port; every change EMITS `changed` with all chosen values. The label names
 * the combobox. `data-values` / `data-options` expose what is chosen and
 * offered. Render-only: logic in useMultiSelect.
 */
import { Flex, Select, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { multiSelectContract } from "@wirework/widget-contracts";
import { useMultiSelect } from "../hooks/use-multi-select";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type MultiSelectEvents = (typeof multiSelectContract)["events"];

function AntdMultiSelect({ viewModel, store, emit }: ContractProps<typeof multiSelectContract>) {
  const { id, values, options, change, chosenAttribute, offeredAttribute } = useMultiSelect(
    store,
    emit,
    { value: viewModel.inputs.value, options: viewModel.inputs.options },
    multiSelectContract.io.inputs,
    viewModel.options,
  );

  return (
    <Flex
      vertical
      gap={4}
      data-testid="antd-multi-select"
      data-label={viewModel.label}
      data-path={viewModel.inputs.value}
      data-values={chosenAttribute}
      data-options={offeredAttribute}
    >
      {viewModel.label ? (
        <label htmlFor={id}>
          <Typography.Text>{viewModel.label}</Typography.Text>
        </label>
      ) : null}
      <Select
        id={id}
        mode="multiple"
        className="ww-select"
        aria-label={viewModel.label ?? viewModel.placeholder}
        placeholder={viewModel.placeholder}
        allowClear
        maxTagCount={viewModel.collapseTags ? "responsive" : undefined}
        value={values}
        options={options}
        onChange={change}
      />
    </Flex>
  );
}

export const antdMultiSelect = implementContract(multiSelectContract, {
  type: "antd-multi-select",
  component: AntdMultiSelect,
});
