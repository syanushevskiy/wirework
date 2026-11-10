/**
 * Timeline — the antd implementation of the `timeline` contract: an antd
 * Timeline over the entries at the `items` port, each with its time beside
 * the line, its heading and text (TimelineEntry), and the line in the
 * colour of its tone; `pending` adds an open last entry. Render-only: logic
 * in useTimeline.
 */
import { Timeline } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { timelineContract } from "@wirework/widget-contracts";
import { useTimeline } from "../hooks/use-timeline";

function AntdTimeline({ viewModel, store }: ContractProps<typeof timelineContract>) {
  const { items, count, mode } = useTimeline(
    store,
    viewModel.inputs.items,
    timelineContract.io.inputs.items,
    viewModel.pending,
    viewModel.mode,
  );
  return (
    <div className="ww-timeline" data-testid="antd-timeline" data-path={viewModel.inputs.items} data-count={count}>
      <Timeline items={items} mode={mode} reverse={viewModel.reverse} />
    </div>
  );
}

export const antdTimeline = implementContract(timelineContract, { type: "antd-timeline", component: AntdTimeline });
