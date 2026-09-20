/**
 * Checkbox — the antd implementation of the `checkbox` contract: a
 * controlled antd Checkbox whose state lives at the `checked` port; every
 * change EMITS `changed` and the required reaction writes it back.
 * Render-only: logic in useCheckbox.
 */
import { Checkbox } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { checkboxContract } from "@wirework/widget-contracts";
import { useCheckbox } from "../hooks/use-checkbox";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type CheckboxEvents = (typeof checkboxContract)["events"];

function AntdCheckbox({ viewModel, store, emit }: ContractProps<typeof checkboxContract>) {
  const { checked, change } = useCheckbox(store, emit, viewModel.inputs.checked, checkboxContract.io.inputs.checked);

  return (
    <div data-testid="antd-checkbox" data-path={viewModel.inputs.checked} data-checked={checked}>
      <Checkbox checked={checked} onChange={(event) => change(event.target.checked)}>
        {viewModel.label}
      </Checkbox>
    </div>
  );
}

export const antdCheckbox = implementContract(checkboxContract, {
  type: "antd-checkbox",
  component: AntdCheckbox,
});
