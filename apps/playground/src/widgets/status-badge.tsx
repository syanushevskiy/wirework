/**
 * The playground's own implementation of its own contract (status-badge),
 * rendered as an antd Tag. Render-only: logic in use-status-badge.
 */
import { Tag } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { statusBadgeContract } from "../contracts/status-badge";
import { useStatusBadge } from "../hooks/use-status-badge";

function StatusBadge({ viewModel, store }: ContractProps<typeof statusBadgeContract>) {
  const { state, text } = useStatusBadge(
    store,
    viewModel.inputs.state,
    statusBadgeContract.io.inputs.state.default,
    viewModel.prefix,
  );
  return (
    <Tag data-testid="status-badge" data-state={state}>
      {text}
    </Tag>
  );
}

export const statusBadge = implementContract(statusBadgeContract, {
  type: "status-badge",
  preview: { seed: { preview: { state: "Success" } }, viewModel: { inputs: { state: "preview.state" }, prefix: "Run: " } },
  component: StatusBadge,
});
