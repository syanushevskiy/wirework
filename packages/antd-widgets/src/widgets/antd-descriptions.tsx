/**
 * Descriptions — the antd implementation of the `descriptions` contract:
 * an antd Descriptions over the record at the `record` port, one field per
 * item, each definition shown as its item's `cell` says — the TABLE's cell
 * kinds and renderers (DescriptionField), so a fact sheet and a table show
 * a status, a link or the host's "copy" the same way. A plain click on a
 * link cell emits `link-clicked`. Render-only: logic in useDescriptions.
 *
 * A HOST with renderers of its own makes its descriptions with
 * `createAntdDescriptions({ cells })`, the same renderers it gives
 * `createAntdTable` (`createAntdWidgets` does both).
 */
import { Descriptions, Spin } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { descriptionsContract } from "@wirework/widget-contracts";
import { useDescriptions } from "../hooks/use-descriptions";
import type { TableCellRenderers } from "../hooks/use-table-cell";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type DescriptionsEvents = (typeof descriptionsContract)["events"];

export interface AntdDescriptionsOptions {
  /** Renderers the host registers by name, for `cell: { kind: "custom", name }` — the table's. */
  cells?: TableCellRenderers;
}

export function createAntdDescriptions({ cells }: AntdDescriptionsOptions = {}) {
  function AntdDescriptions({ viewModel, store, emit }: ContractProps<typeof descriptionsContract>) {
    const { items, loading, click } = useDescriptions(
      store,
      emit,
      { record: viewModel.inputs.record, loading: viewModel.inputs.loading },
      descriptionsContract.io.inputs,
      viewModel.items,
      cells,
    );
    return (
      <div
        className="ww-descriptions"
        data-testid="antd-descriptions"
        data-path={viewModel.inputs.record}
        data-loading={loading}
        onClick={click}
      >
        <Spin spinning={loading}>
          <Descriptions
            items={items}
            column={viewModel.columns}
            size={viewModel.size}
            bordered={viewModel.bordered}
            {...(viewModel.title === undefined ? {} : { title: viewModel.title })}
          />
        </Spin>
      </div>
    );
  }

  return implementContract(descriptionsContract, { type: "antd-descriptions", component: AntdDescriptions });
}

export const antdDescriptions = createAntdDescriptions();
