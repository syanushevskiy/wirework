/**
 * Label — the antd implementation of the `label` contract
 * (@wirework/widget-contracts): the ports, events and settings are the
 * contract's; only the rendering is ours (antd Typography.Text, the tone
 * mapped to a Typography type). Render-only: logic in useLabel.
 */
import { Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { labelContract } from "@wirework/widget-contracts";
import { useLabel } from "../hooks/use-label";

function AntdLabel({ viewModel, store }: ContractProps<typeof labelContract>) {
  const { text, type } = useLabel(store, viewModel.inputs.text, viewModel.text, viewModel.tone);
  return (
    <Typography.Text
      className="ww-label"
      type={type}
      data-testid="antd-label"
      data-path={viewModel.inputs.text}
      data-tone={viewModel.tone}
    >
      {text}
    </Typography.Text>
  );
}

export const antdLabel = implementContract(labelContract, {
  type: "antd-label",
  component: AntdLabel,
});
