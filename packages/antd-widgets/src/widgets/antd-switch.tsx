/**
 * Switch — the antd implementation of the `switch` contract: a controlled
 * antd Switch (role=switch) named by the label, whose state lives at the
 * `checked` port; every change EMITS `changed` and the default reaction
 * writes it back. Render-only: logic in useSwitch.
 */
import { Flex, Switch, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { switchContract } from "@wirework/widget-contracts";
import { useSwitch } from "../hooks/use-switch";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type SwitchEvents = (typeof switchContract)["events"];

function AntdSwitch({ viewModel, store, emit }: ContractProps<typeof switchContract>) {
  const { checked, change } = useSwitch(store, emit, viewModel.inputs.checked, switchContract.io.inputs.checked);
  return (
    <Flex
      gap="small"
      align="center"
      data-testid="antd-switch"
      data-path={viewModel.inputs.checked}
      data-checked={checked}
    >
      <Switch
        aria-label={viewModel.label}
        checked={checked}
        {...(viewModel.onText === undefined ? {} : { checkedChildren: viewModel.onText })}
        {...(viewModel.offText === undefined ? {} : { unCheckedChildren: viewModel.offText })}
        onChange={change}
      />
      <Typography.Text>{viewModel.label}</Typography.Text>
    </Flex>
  );
}

export const antdSwitch = implementContract(switchContract, { type: "antd-switch", component: AntdSwitch });
