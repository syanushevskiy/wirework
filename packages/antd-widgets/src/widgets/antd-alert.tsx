/**
 * Alert — the antd implementation of the `alert` contract: an antd Alert
 * (role=alert) of the type matching the severity. Render-only: logic in
 * useAlert.
 */
import { Alert } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { alertContract } from "@wirework/widget-contracts";
import { useAlert } from "../hooks/use-alert";

function AntdAlert({ viewModel, store }: ContractProps<typeof alertContract>) {
  const { title, type } = useAlert(store, viewModel.inputs.title, viewModel.title, viewModel.tone);
  return (
    <Alert
      data-testid="antd-alert"
      data-path={viewModel.inputs.title}
      data-tone={viewModel.tone}
      type={type}
      title={title}
      description={viewModel.description}
      showIcon={viewModel.showIcon}
    />
  );
}

export const antdAlert = implementContract(alertContract, {
  type: "antd-alert",
  component: AntdAlert,
});
