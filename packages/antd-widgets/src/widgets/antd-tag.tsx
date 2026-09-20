/**
 * Tag — the antd implementation of the `tag` contract: an antd Tag in the
 * preset colour for the semantic tone. Render-only: logic in useTag.
 */
import { Tag } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { tagContract } from "@wirework/widget-contracts";
import { useTag } from "../hooks/use-tag";

function AntdTag({ viewModel, store }: ContractProps<typeof tagContract>) {
  const { text, color } = useTag(store, viewModel.inputs.text, viewModel.text, viewModel.tone);
  return (
    <Tag color={color} data-testid="antd-tag" data-path={viewModel.inputs.text} data-tone={viewModel.tone}>
      {text}
    </Tag>
  );
}

export const antdTag = implementContract(tagContract, {
  type: "antd-tag",
  component: AntdTag,
});
