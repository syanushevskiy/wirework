/**
 * Result — the antd implementation of the `result` contract: an antd Result
 * with the status picture, the title and detail (static, or from their
 * ports) and the one action as a button that EMITS `clicked`. The wrapper
 * is role=status, role=alert for a failing outcome. Render-only: logic in
 * useResult.
 */
import { Button, Result } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { resultContract } from "@wirework/widget-contracts";
import { useResult } from "../hooks/use-result";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type ResultEvents = (typeof resultContract)["events"];

function AntdResult({ viewModel, store, emit }: ContractProps<typeof resultContract>) {
  const { title, detail, status, role, click } = useResult(
    store,
    emit,
    { title: viewModel.inputs.title, detail: viewModel.inputs.detail },
    viewModel,
  );
  return (
    <div role={role} className="ww-result" data-testid="antd-result" data-status={viewModel.status}>
      <Result
        status={status}
        title={title}
        {...(detail === undefined ? {} : { subTitle: detail })}
        {...(viewModel.action === undefined
          ? {}
          : {
              extra: (
                <Button type="primary" onClick={click}>
                  {viewModel.action}
                </Button>
              ),
            })}
      />
    </div>
  );
}

export const antdResult = implementContract(resultContract, { type: "antd-result", component: AntdResult });
