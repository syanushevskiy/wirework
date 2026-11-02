/**
 * Divider — the antd implementation of the `divider` contract: an antd
 * Divider (role=separator) with a title on it or not. Display only, nothing
 * bound: no hook, nothing to derive.
 */
import { Divider } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { dividerContract } from "@wirework/widget-contracts";

function AntdDivider({ viewModel }: ContractProps<typeof dividerContract>) {
  return (
    <Divider
      data-testid="antd-divider"
      titlePlacement={viewModel.orientation}
      dashed={viewModel.dashed}
      // A plain line stays a plain line: antd's own text slot is empty without a title.
      plain={viewModel.text === undefined}
    >
      {viewModel.text}
    </Divider>
  );
}

export const antdDivider = implementContract(dividerContract, { type: "antd-divider", component: AntdDivider });
