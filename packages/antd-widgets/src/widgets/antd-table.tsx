/**
 * Table — the antd implementation of the generic `table` contract: an antd
 * Table over the array of records at the `rows` port, keyed by each row's
 * `rowKey` property, with the configured columns (or one per field of the
 * first row), each cell shown as its column's `cell` says. A click on a row
 * emits `row-selected`, a plain click on a link cell `link-clicked` — intents,
 * not state: a reaction or the host decides what they mean. Render-only:
 * logic in useTable.
 *
 * A HOST that wants cells no predefined kind shows makes its own table with
 * `createAntdTable({ cells })` — renderers by name, which a column selects
 * with `cell: { kind: "custom", name }` — and registers it instead of
 * `antdTable` (or the whole set with `createAntdWidgets`).
 */
import { Table } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { tableContract } from "@wirework/widget-contracts";
import { useTable } from "../hooks/use-table";
import type { TableCellRenderers } from "../hooks/use-table-cell";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type TableEvents = (typeof tableContract)["events"];

export interface AntdTableOptions {
  /** Renderers the host registers by name, for `cell: { kind: "custom", name }`. */
  cells?: TableCellRenderers;
}

export function createAntdTable({ cells }: AntdTableOptions = {}) {
  function AntdTable({ viewModel, store, emit }: ContractProps<typeof tableContract>) {
    const { columns, rows, loading, rowProps } = useTable(
      store,
      emit,
      { rows: viewModel.inputs.rows, loading: viewModel.inputs.loading, columns: viewModel.inputs.columns },
      tableContract.io.inputs,
      { columns: viewModel.columns, rowKey: viewModel.rowKey },
      cells,
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

  return implementContract(tableContract, {
    type: "antd-table",
    component: AntdTable,
  });
}

export const antdTable = createAntdTable();
