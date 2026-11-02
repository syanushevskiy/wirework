/**
 * Radio group — the antd implementation of the `radio-group` contract: a
 * controlled antd Radio.Group (role=radiogroup named by the label, one
 * radio per option) whose choice lives at the `value` port; every pick
 * EMITS `changed` and the default reaction writes it back. Render-only:
 * logic in useRadioGroup.
 */
import { Flex, Radio, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { radioGroupContract } from "@wirework/widget-contracts";
import { useRadioGroup } from "../hooks/use-radio-group";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type RadioGroupEvents = (typeof radioGroupContract)["events"];

function AntdRadioGroup({ viewModel, store, emit }: ContractProps<typeof radioGroupContract>) {
  const { value, options, change } = useRadioGroup(
    store,
    emit,
    { value: viewModel.inputs.value, options: viewModel.inputs.options },
    radioGroupContract.io.inputs,
    viewModel.options,
  );
  return (
    <Flex vertical gap={4} data-testid="antd-radio-group" data-path={viewModel.inputs.value} data-value={value}>
      <Typography.Text>{viewModel.label}</Typography.Text>
      {/* antd's group is role=radiogroup and forwards aria attributes. */}
      <Radio.Group
        aria-label={viewModel.label}
        options={options}
        optionType={viewModel.buttons ? "button" : "default"}
        // "" means nothing chosen: antd checks nothing for undefined only.
        value={value === "" ? undefined : value}
        onChange={(event) => change(String(event.target.value))}
      />
    </Flex>
  );
}

export const antdRadioGroup = implementContract(radioGroupContract, {
  type: "antd-radio-group",
  component: AntdRadioGroup,
});
