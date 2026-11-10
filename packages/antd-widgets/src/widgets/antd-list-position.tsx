/**
 * List position — the antd implementation of the `list-position` contract:
 * the rows in view of how many, how far into the list that is, and an antd
 * Slider over the whole list whose handle follows the list as it scrolls;
 * dragging it and letting go EMITS `changed` with the row to show, which
 * the default reaction writes back — the list bound to the same path
 * scrolls there. Render-only: logic in useListPosition.
 */
import { Flex, Slider, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { listPositionContract } from "@wirework/widget-contracts";
import { useListPosition } from "../hooks/use-list-position";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type ListPositionEvents = (typeof listPositionContract)["events"];

function AntdListPosition({ viewModel, store, emit }: ContractProps<typeof listPositionContract>) {
  const view = useListPosition(
    store,
    emit,
    { position: viewModel.inputs.position, total: viewModel.inputs.total, visible: viewModel.inputs.visible },
    listPositionContract.io.inputs,
  );

  return (
    <Flex
      vertical={viewModel.vertical}
      align="center"
      gap={viewModel.vertical ? "small" : "middle"}
      className={viewModel.vertical ? "ww-list-position ww-list-position--vertical" : "ww-list-position"}
      data-testid="antd-list-position"
      data-orientation={viewModel.vertical ? "vertical" : "horizontal"}
      data-path={viewModel.inputs.position}
      data-position={view.position}
      data-visible={view.visible}
      data-total={view.total}
      data-percent={view.percent}
    >
      <Slider
        className="ww-list-position__scale"
        ariaLabelForHandle={viewModel.label}
        // Upright, antd puts the minimum at the bottom: reversed, the start of the list is at the top.
        vertical={viewModel.vertical}
        reverse={viewModel.vertical}
        min={0}
        max={view.last}
        step={1}
        disabled={view.last === 0}
        value={view.position}
        tooltip={{ formatter: view.percentAt }}
        onChange={view.drag}
        onChangeComplete={view.release}
      />
      {viewModel.showRange ? <Typography.Text data-testid="list-position-range">{view.range}</Typography.Text> : null}
      {viewModel.showPercent ? (
        <Typography.Text type="secondary" data-testid="list-position-percent">
          {view.percent}%
        </Typography.Text>
      ) : null}
    </Flex>
  );
}

export const antdListPosition = implementContract(listPositionContract, {
  type: "antd-list-position",
  component: AntdListPosition,
});
