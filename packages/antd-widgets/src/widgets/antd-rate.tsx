/**
 * Rate — the antd implementation of the `rate` contract: a controlled antd
 * Rate (one radio per star, in a group named by the label) whose score
 * lives at the `value` port; every pick EMITS `changed` and the default
 * reaction writes it back. Render-only: logic in useRate.
 */
import { Flex, Rate, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { rateContract } from "@wirework/widget-contracts";
import { useRate } from "../hooks/use-rate";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type RateEvents = (typeof rateContract)["events"];

function AntdRate({ viewModel, store, emit }: ContractProps<typeof rateContract>) {
  const { value, change } = useRate(store, emit, viewModel.inputs.value, rateContract.io.inputs.value);
  return (
    <Flex vertical gap={4} data-testid="antd-rate" data-path={viewModel.inputs.value} data-value={value}>
      <Typography.Text>{viewModel.label}</Typography.Text>
      <div role="group" aria-label={viewModel.label}>
        <Rate
          count={viewModel.count}
          allowHalf={viewModel.allowHalf}
          allowClear={viewModel.allowClear}
          value={value}
          onChange={change}
        />
      </div>
    </Flex>
  );
}

export const antdRate = implementContract(rateContract, { type: "antd-rate", component: AntdRate });
