/**
 * Progress — the antd implementation of the `progress` contract: an antd
 * line Progress (role=progressbar) named by the label, showing the stored
 * percentage clamped to 0–100. Render-only: logic in useProgress.
 */
import { Flex, Progress, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { progressContract } from "@wirework/widget-contracts";
import { useProgress } from "../hooks/use-progress";

const formatPercent = (value?: number): string => `${Math.round(value ?? 0)}%`;

function AntdProgress({ viewModel, store }: ContractProps<typeof progressContract>) {
  const { percent, status } = useProgress(
    store,
    viewModel.inputs.percent,
    progressContract.io.inputs.percent,
    viewModel.tone,
  );

  return (
    <Flex vertical gap={4} data-testid="antd-progress" data-path={viewModel.inputs.percent} data-percent={percent}>
      {viewModel.label ? <Typography.Text>{viewModel.label}</Typography.Text> : null}
      <Progress
        percent={percent}
        status={status}
        showInfo={viewModel.showValue}
        // The contract promises the VALUE: antd would swap it for a status icon.
        format={formatPercent}
        aria-label={viewModel.label ?? "Progress"}
      />
    </Flex>
  );
}

export const antdProgress = implementContract(progressContract, {
  type: "antd-progress",
  component: AntdProgress,
});
