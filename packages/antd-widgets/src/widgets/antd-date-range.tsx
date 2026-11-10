/**
 * Date range — the antd implementation of the `date-range` contract: a
 * controlled antd RangePicker in a group named by the label, whose pair of
 * dates lives at the `value` port as TEXT; every pick EMITS `changed` with
 * both and the default reaction writes the pair back. Each field takes a
 * typed date in the shown format. Render-only: logic in useDateRange.
 */
import { DatePicker, Flex, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { dateRangeContract } from "@wirework/widget-contracts";
import { useDateRange } from "../hooks/use-date-range";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type DateRangeEvents = (typeof dateRangeContract)["events"];

function AntdDateRange({ viewModel, store, emit }: ContractProps<typeof dateRangeContract>) {
  const { value, texts, format, change } = useDateRange(
    store,
    emit,
    viewModel.inputs.value,
    dateRangeContract.io.inputs.value,
    viewModel,
  );
  return (
    <Flex
      vertical
      gap={4}
      role="group"
      aria-label={viewModel.label}
      data-testid="antd-date-range"
      data-path={viewModel.inputs.value}
      data-from={texts[0]}
      data-to={texts[1]}
    >
      <Typography.Text>{viewModel.label}</Typography.Text>
      <DatePicker.RangePicker
        className="ww-date"
        value={value}
        showTime={viewModel.withTime}
        allowClear={viewModel.allowClear}
        {...(format === undefined ? {} : { format })}
        onChange={change}
      />
    </Flex>
  );
}

export const antdDateRange = implementContract(dateRangeContract, {
  type: "antd-date-range",
  component: AntdDateRange,
});
