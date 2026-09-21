/**
 * Filter bar — the antd implementation of the `filter-bar` contract: one
 * controlled antd Select (multiple) per filter the STORE describes, side by
 * side. What is chosen lives at the `value` port as one object; every change
 * EMITS `changed` with all of it. Each filter exposes `data-filter`,
 * `data-values` and `data-options`. Render-only: logic in useFilterBar.
 */
import { Flex, Select, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { filterBarContract } from "@wirework/widget-contracts";
import { useFilterBar } from "../hooks/use-filter-bar";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type FilterBarEvents = (typeof filterBarContract)["events"];

function AntdFilterBar({ viewModel, store, emit }: ContractProps<typeof filterBarContract>) {
  const { filters, change, idsAttribute } = useFilterBar(
    store,
    emit,
    { filters: viewModel.inputs.filters, value: viewModel.inputs.value },
    filterBarContract.io.inputs,
  );

  return (
    <Flex
      wrap
      gap="small"
      className="ww-filter-bar"
      data-testid="antd-filter-bar"
      data-path={viewModel.inputs.value}
      data-filters={idsAttribute}
    >
      {filters.length === 0 ? <Typography.Text type="secondary">{viewModel.emptyText}</Typography.Text> : null}
      {filters.map((filter) => (
        <Flex
          key={filter.id}
          vertical
          gap={4}
          className="ww-filter-bar-filter"
          data-testid="filter-bar-filter"
          data-filter={filter.id}
          data-label={filter.label}
          data-values={filter.chosenAttribute}
          data-options={filter.offeredAttribute}
        >
          <label htmlFor={filter.fieldId}>
            <Typography.Text>{filter.label}</Typography.Text>
          </label>
          <Select
            id={filter.fieldId}
            mode="multiple"
            className="ww-select"
            aria-label={filter.label}
            placeholder={viewModel.placeholder}
            allowClear
            maxTagCount="responsive"
            value={filter.values}
            options={filter.options}
            onChange={(next: string[]) => change(filter.id, next)}
          />
        </Flex>
      ))}
    </Flex>
  );
}

export const antdFilterBar = implementContract(filterBarContract, {
  type: "antd-filter-bar",
  component: AntdFilterBar,
});
