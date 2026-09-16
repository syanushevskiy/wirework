/**
 * Button — the antd implementation of the `button` contract. What a click
 * DOES is not the button's business: the user wires it in the view model
 * (a `set` reaction or a `call` to a host action) or the host subscribes
 * in code. Render-only: logic in useButton.
 */
import { Button } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { buttonContract } from "@wirework/widget-contracts";
import { useButton } from "../hooks/use-button";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type ButtonEvents = (typeof buttonContract)["events"];

function AntdButton({ viewModel, emit }: ContractProps<typeof buttonContract>) {
  const { click } = useButton(emit, viewModel.label);
  return (
    <Button type="primary" data-testid="antd-button" onClick={click}>
      {viewModel.label}
    </Button>
  );
}

export const antdButton = implementContract(buttonContract, {
  type: "antd-button",
  component: AntdButton,
});
