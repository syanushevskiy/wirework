/**
 * Number — the antd implementation of the `number` contract: a controlled
 * antd InputNumber (role=spinbutton) named by the label, whose number lives
 * at the `value` port (null while empty); every change EMITS `changed` and
 * the default reaction writes it back. Render-only: logic in useNumber.
 */
import { Flex, InputNumber, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { numberContract } from "@wirework/widget-contracts";
import { useNumber } from "../hooks/use-number";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type NumberEvents = (typeof numberContract)["events"];

function AntdNumber({ viewModel, store, emit }: ContractProps<typeof numberContract>) {
  const { id, value, change } = useNumber(store, emit, viewModel.inputs.value, numberContract.io.inputs.value);
  return (
    <Flex vertical gap={4} data-testid="antd-number" data-path={viewModel.inputs.value} data-value={value ?? ""}>
      <label htmlFor={id}>
        <Typography.Text>{viewModel.label}</Typography.Text>
      </label>
      <InputNumber
        id={id}
        className="ww-number"
        value={value}
        step={viewModel.step}
        {...(viewModel.min === undefined ? {} : { min: viewModel.min })}
        {...(viewModel.max === undefined ? {} : { max: viewModel.max })}
        {...(viewModel.precision === undefined ? {} : { precision: viewModel.precision })}
        {...(viewModel.prefix === undefined ? {} : { prefix: viewModel.prefix })}
        {...(viewModel.suffix === undefined ? {} : { suffix: viewModel.suffix })}
        {...(viewModel.placeholder === undefined ? {} : { placeholder: viewModel.placeholder })}
        onChange={change}
      />
    </Flex>
  );
}

export const antdNumber = implementContract(numberContract, { type: "antd-number", component: AntdNumber });
