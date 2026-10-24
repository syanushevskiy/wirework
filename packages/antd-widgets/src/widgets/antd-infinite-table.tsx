/**
 * Infinite table — the antd implementation of the `infinite-table`
 * contract: the `table` as a scrolling list that asks for MORE rows when
 * its end comes into view, renders only a WINDOW of the rows it holds (a
 * virtual list), and has the filters and the sorting in the column headers
 * — a list of values to tick, or a SEARCH icon opening a box for free text
 * — instead of a filter bar and a pagination beside it. Render-only: logic
 * in useInfiniteTable.
 *
 * Like the table, a factory: `createAntdInfiniteTable({ cells })` for a
 * host's own cell renderers (`createAntdWidgets({ tableCells })` makes both
 * tables with them).
 */
import { Table, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { infiniteTableContract } from "@wirework/widget-contracts";
import { useInfiniteTable } from "../hooks/use-infinite-table";
import type { AntdTableOptions } from "./antd-table";
import { RowSpaceProvider } from "./row-spacers";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type InfiniteTableEvents = (typeof infiniteTableContract)["events"];

export function createAntdInfiniteTable({ cells }: AntdTableOptions = {}) {
  function AntdInfiniteTable({ viewModel, store, emit }: ContractProps<typeof infiniteTableContract>) {
    const view = useInfiniteTable(
      store,
      emit,
      {
        rows: viewModel.inputs.rows,
        loading: viewModel.inputs.loading,
        columns: viewModel.inputs.columns,
        total: viewModel.inputs.total,
        filterIn: viewModel.inputs.filterIn,
        filterLike: viewModel.inputs.filterLike,
        orderBy: viewModel.inputs.orderBy,
      },
      infiniteTableContract.io.inputs,
      {
        columns: viewModel.columns,
        rowKey: viewModel.rowKey,
        headerFilters: viewModel.headerFilters,
        height: viewModel.height,
      },
      cells,
    );

    return (
      <div
        className="ww-table ww-infinite-table"
        data-testid="antd-infinite-table"
        data-path={viewModel.inputs.rows}
        data-loading={view.loading}
        data-held={view.held}
        data-total={view.total}
        data-window={view.window}
      >
        {/*
          The box the rows scroll in: as tall as the setting says, at most. It is the element that HOLDS the focus for
          keyboard scrolling (Page Down, End, Home), named by the line under the rows: a row is focusable too, but a
          row leaves the DOM when the window moves past it, and the focus would fall to the page with it.
        */}
        <div
          ref={view.scrollRef}
          className="ww-infinite-table__scroll"
          data-testid="infinite-table-scroll"
          style={{ maxHeight: viewModel.height }}
          tabIndex={0}
          role="region"
          aria-label={view.status}
        >
          <RowSpaceProvider value={view.space}>
            <Table
              size="small"
              pagination={false}
              loading={view.loading}
              columns={view.columns}
              dataSource={view.rows}
              rowKey="key"
              locale={{ emptyText: viewModel.emptyText }}
              onRow={view.rowProps}
              onChange={view.change}
              sticky={view.sticky}
              components={view.components}
            />
          </RowSpaceProvider>
          <div ref={view.endRef} className="ww-infinite-table__end" data-testid="infinite-table-status">
            <Typography.Text type="secondary">{view.status}</Typography.Text>
          </div>
        </div>
      </div>
    );
  }

  return implementContract(infiniteTableContract, {
    type: "antd-infinite-table",
    component: AntdInfiniteTable,
  });
}

export const antdInfiniteTable = createAntdInfiniteTable();
