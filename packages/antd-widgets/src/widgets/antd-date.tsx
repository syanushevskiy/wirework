/**
 * Date — the antd implementation of the `date` contract: a controlled antd
 * DatePicker named by the label, whose date lives at the `value` port as
 * TEXT; every pick EMITS `changed` and the default reaction writes it back.
 * The field takes a typed date in the shown format (Enter picks it).
 * Render-only: logic in useDate.
 */
import { DatePicker, Flex, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { dateContract } from "@wirework/widget-contracts";
import { useDate } from "../hooks/use-date";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type DateEvents = (typeof dateContract)["events"];

function AntdDate({ viewModel, store, emit }: ContractProps<typeof dateContract>) {
  const { id, value, text, format, change } = useDate(
    store,
    emit,
    viewModel.inputs.value,
    dateContract.io.inputs.value,
    viewModel,
  );
  return (
    <Flex vertical gap={4} data-testid="antd-date" data-path={viewModel.inputs.value} data-value={text}>
      <label htmlFor={id}>
        <Typography.Text>{viewModel.label}</Typography.Text>
      </label>
      <DatePicker
        id={id}
        className="ww-date"
        value={value}
        picker={viewModel.picker}
        showTime={viewModel.withTime}
        allowClear={viewModel.allowClear}
        {...(format === undefined ? {} : { format })}
        {...(viewModel.placeholder === undefined ? {} : { placeholder: viewModel.placeholder })}
        onChange={change}
      />
    </Flex>
  );
}

export const antdDate = implementContract(dateContract, { type: "antd-date", component: AntdDate });
