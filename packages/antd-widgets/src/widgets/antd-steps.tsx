/**
 * Steps — the antd implementation of the `steps` contract: antd Steps over
 * the contract's items, the current one from the `current` port (a position
 * or a key), shown as failed when the `failed` port says so; with
 * `clickable` a clicked step EMITS `changed` with its key. Render-only:
 * logic in useSteps.
 */
import { Steps } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { stepsContract } from "@wirework/widget-contracts";
import { useSteps } from "../hooks/use-steps";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type StepsEvents = (typeof stepsContract)["events"];

function AntdSteps({ viewModel, store, emit }: ContractProps<typeof stepsContract>) {
  const { items, index, key, status, change } = useSteps(
    store,
    emit,
    { current: viewModel.inputs.current, failed: viewModel.inputs.failed },
    stepsContract.io.inputs,
    viewModel.items,
  );
  return (
    <div
      role="list"
      aria-label={viewModel.label}
      className="ww-steps"
      data-testid="antd-steps"
      data-path={viewModel.inputs.current}
      data-current={key}
      data-status={status}
    >
      <Steps
        items={items}
        current={index}
        status={status}
        orientation={viewModel.direction}
        size={viewModel.small ? "small" : "default"}
        {...(viewModel.clickable ? { onChange: change } : {})}
      />
    </div>
  );
}

export const antdSteps = implementContract(stepsContract, { type: "antd-steps", component: AntdSteps });
