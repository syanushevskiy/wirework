/**
 * Refresher — the antd implementation of the `refresher` contract: a
 * checkbox turning auto-refresh on/off, the interval in seconds, and a
 * Refresh button that spins while the bound `busy` path is true. The
 * schedule lives in the store; the widget only EMITS `changed` and
 * `refresh`, and the view model's reactions decide what happens.
 * Render-only: logic in useRefresher.
 */
import { Button, Checkbox, Flex, InputNumber, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { REFRESH_INTERVAL, refresherContract } from "@wirework/widget-contracts";
import { useRefresher } from "../hooks/use-refresher";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type RefresherEvents = (typeof refresherContract)["events"];

function AntdRefresher({ viewModel, store, emit }: ContractProps<typeof refresherContract>) {
  const { enabled, interval, busy, toggle, changeInterval, refresh } = useRefresher(
    store,
    emit,
    { schedule: viewModel.inputs.schedule, busy: viewModel.inputs.busy },
    refresherContract.io.inputs,
  );

  return (
    <Flex
      wrap
      gap="small"
      align="center"
      data-testid="antd-refresher"
      data-enabled={enabled}
      data-interval={interval}
      data-busy={busy}
    >
      <Checkbox data-testid="antd-refresher-toggle" checked={enabled} onChange={(event) => toggle(event.target.checked)}>
        {viewModel.label}
      </Checkbox>
      <InputNumber
        data-testid="antd-refresher-interval"
        aria-label="Refresh interval in seconds"
        min={REFRESH_INTERVAL.min}
        max={REFRESH_INTERVAL.max}
        precision={0}
        value={interval}
        onChange={changeInterval}
      />
      <Typography.Text type="secondary">sec</Typography.Text>
      <Button data-testid="antd-refresher-refresh" loading={busy} onClick={refresh}>
        {viewModel.buttonLabel}
      </Button>
    </Flex>
  );
}

export const antdRefresher = implementContract(refresherContract, {
  type: "antd-refresher",
  component: AntdRefresher,
});
