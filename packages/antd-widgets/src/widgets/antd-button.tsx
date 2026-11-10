/**
 * Button — the antd implementation of the `button` contract. What a click
 * DOES is not the button's business: the user wires it in the view model
 * (a `set` reaction or a `call` to a host action) or the host subscribes
 * in code. With `confirm` an antd Popconfirm asks first and the click is
 * emitted on OK. Render-only: logic in useButton.
 */
import { Button, Popconfirm } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { buttonContract } from "@wirework/widget-contracts";
import { useButton } from "../hooks/use-button";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type ButtonEvents = (typeof buttonContract)["events"];

function AntdButton({ viewModel, emit }: ContractProps<typeof buttonContract>) {
  const { click, type, danger } = useButton(emit, viewModel.label, viewModel.variant);
  const button = (confirmed: boolean) => (
    <Button
      type={type}
      danger={danger}
      data-testid="antd-button"
      data-variant={viewModel.variant}
      data-confirm={confirmed}
      {...(confirmed ? {} : { onClick: click })}
    >
      {viewModel.label}
    </Button>
  );
  // A question before a destructive click: `clicked` is emitted on OK only.
  return viewModel.confirm === undefined ? (
    button(false)
  ) : (
    <Popconfirm title={viewModel.confirm} okText="OK" cancelText="Cancel" onConfirm={click}>
      {button(true)}
    </Popconfirm>
  );
}

export const antdButton = implementContract(buttonContract, {
  type: "antd-button",
  component: AntdButton,
});
