/**
 * Slider — the antd implementation of the `slider` contract: a controlled
 * antd Slider (its handle role=slider, named by the label) whose number
 * lives at the `value` port; every move EMITS `changed` and the default
 * reaction writes it back. Render-only: logic in useSlider.
 */
import { Flex, Slider, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { sliderContract } from "@wirework/widget-contracts";
import { useSlider } from "../hooks/use-slider";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type SliderEvents = (typeof sliderContract)["events"];

function AntdSlider({ viewModel, store, emit }: ContractProps<typeof sliderContract>) {
  const { value, change } = useSlider(store, emit, viewModel.inputs.value, sliderContract.io.inputs.value);
  return (
    <Flex vertical gap={4} data-testid="antd-slider" data-path={viewModel.inputs.value} data-value={value}>
      <Typography.Text>{viewModel.label}</Typography.Text>
      <Slider
        ariaLabelForHandle={viewModel.label}
        min={viewModel.min}
        max={viewModel.max}
        step={viewModel.step}
        value={value}
        // The contract's `showValue`: antd's tooltip shows the number while moving, or nothing at all.
        {...(viewModel.showValue ? {} : { tooltip: { formatter: null } })}
        onChange={change}
      />
    </Flex>
  );
}

export const antdSlider = implementContract(sliderContract, { type: "antd-slider", component: AntdSlider });
