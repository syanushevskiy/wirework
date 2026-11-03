/**
 * Card — the antd implementation of the `card` contract: an antd Card with
 * the layout the template holds rendered inside by the adapter
 * (NestedLayout). Nothing to derive: the adapter does the work.
 */
import { Card } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract, NestedLayout } from "@wirework/react";
import { cardContract } from "@wirework/widget-contracts";

function AntdCard({ viewModel }: ContractProps<typeof cardContract>) {
  return (
    <Card
      data-testid="antd-card"
      size={viewModel.size}
      {...(viewModel.title === undefined ? {} : { title: viewModel.title })}
    >
      {viewModel.content === undefined ? null : <NestedLayout template={viewModel.content} />}
    </Card>
  );
}

export const antdCard = implementContract(cardContract, { type: "antd-card", component: AntdCard });
