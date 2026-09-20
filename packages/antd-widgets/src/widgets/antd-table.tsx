/**
 * Table — the antd implementation of the generic `table` contract: an antd
 * Table over the array of records at the `rows` port, keyed by each row's
 * `rowKey` property, with the configured columns (or one per field of the
 * first row). A click on a row emits `row-selected` — an intent, not state:
 * a reaction or the host decides what it means. Render-only: logic in
 * useTable.
 */
import { Table } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { tableContract } from "@wirework/widget-contracts";
import { useTable } from "../hooks/use-table";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type TableEvents = (typeof tableContract)["events"];

function AntdTable({ viewModel, store, emit }: ContractProps<typeof tableContract>) {
  const { columns, rows, loading, rowProps } = useTable(
    store,
    emit,
    { rows: viewModel.inputs.rows, loading: viewModel.inputs.loading },
    tableContract.io.inputs,
    { columns: viewModel.columns, rowKey: viewModel.rowKey },
  );

  return (
    <div className="ww-table" data-testid="antd-table" data-path={viewModel.inputs.rows} data-loading={loading}>
      <Table
        size="small"
        pagination={false}
        loading={loading}
        columns={columns}
        dataSource={rows}
        rowKey="key"
        locale={{ emptyText: viewModel.emptyText }}
        onRow={rowProps}
      />
    </div>
  );
}

export const antdTable = implementContract(tableContract, {
  type: "antd-table",
  component: AntdTable,
});
