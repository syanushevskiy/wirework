/**
 * Infinite table — the antd implementation of the `infinite-table`
 * contract: the `table` as a scrolling list that asks for MORE rows when
 * its end comes into view, renders only a WINDOW of the rows it holds (a
 * virtual list), and has the filters and the sorting in the column headers
 * — a list of values to pick several of, or a SEARCH icon opening a box for free text
 * — instead of a filter bar and a pagination beside it. WINDOWED (the
 * setting) it holds only a slice of the list, `data-offset` rows into it,
 * and asks for the slice around the rows in view; with its `position` port
 * bound it says where it stands and scrolls where it is told. Render-only:
 * logic in useInfiniteTable.
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
import { NO_CELLS } from "../hooks/use-table";
import type { AntdTableOptions } from "./antd-table";
import { useCellTip } from "../hooks/use-cell-tip";
import { CellMenu } from "./cell-menu";
import { CellTip } from "./cell-tip";
import { rowActionsOf } from "./row-actions";
import { TableTheme } from "./table-theme";
import { TableToolbar, toolbarItems } from "./table-toolbar";
import { RowSpaceProvider } from "./row-spacers";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type InfiniteTableEvents = (typeof infiniteTableContract)["events"];

export function createAntdInfiniteTable({
  cells = NO_CELLS,
  toolbar: ownItems,
  rowActions: ownActions,
}: AntdTableOptions = {}) {
  const items = toolbarItems(ownItems);
  const actions = rowActionsOf(ownActions);

  function AntdInfiniteTable({ viewModel, store, emit }: ContractProps<typeof infiniteTableContract>) {
    const view = useInfiniteTable(
      store,
      emit,
      {
        rows: viewModel.inputs.rows,
        loading: viewModel.inputs.loading,
        columns: viewModel.inputs.columns,
        total: viewModel.inputs.total,
        hasMore: viewModel.inputs.hasMore,
        offset: viewModel.inputs.offset,
        position: viewModel.inputs.position,
        filterIn: viewModel.inputs.filterIn,
        filterLike: viewModel.inputs.filterLike,
        filterBetween: viewModel.inputs.filterBetween,
        orderBy: viewModel.inputs.orderBy,
        filters: viewModel.inputs.filters,
        columnState: viewModel.inputs.columnState,
      },
      infiniteTableContract.io.inputs,
      {
        columns: viewModel.columns,
        rowKey: viewModel.rowKey,
        headerFilters: viewModel.headerFilters,
        filterRow: viewModel.filterRow,
        columnMenu: viewModel.columnMenu,
        columnStateKey: viewModel.columnStateKey,
        toolbar: viewModel.toolbar,
        filters: viewModel.filters,
        rowActions: viewModel.rowActions,
        cellSelection: viewModel.cellSelection,
        exportName: viewModel.exportName,
        height: viewModel.height,
        windowed: viewModel.windowed,
      },
      cells,
      items,
      actions,
    );
    const tip = useCellTip(!viewModel.wrapCells);

    return (
      <div
        className="ww-table ww-infinite-table"
        data-testid="antd-infinite-table"
        data-path={viewModel.inputs.rows}
        data-loading={view.loading}
        data-filter-row={viewModel.filterRow}
        data-min-width={view.scroll.x}
        data-held={view.held}
        data-offset={view.offset}
        data-windowed={viewModel.windowed}
        data-total={view.total}
        data-open={view.open}
        data-window={view.window}
        data-cell-selection={viewModel.cellSelection}
        data-wrap-cells={viewModel.wrapCells}
        data-selected={view.cells.selected}
        {...view.cells.root}
        {...tip.root}
      >
        <TableTheme>
          <CellMenu view={view.cells} />
          <CellTip tip={tip.tip} />
          <TableToolbar
            title={viewModel.title}
            filters={view.filters}
            items={view.toolbar}
            columnMenu={view.columnMenu}
          />
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
                scroll={view.scroll}
                // One line a cell: the columns keep their widths whatever the text (styles.css).
                tableLayout={viewModel.wrapCells ? "auto" : "fixed"}
                components={view.components}
              />
            </RowSpaceProvider>
            <div ref={view.endRef} className="ww-infinite-table__end" data-testid="infinite-table-status">
              <Typography.Text type="secondary">{view.status}</Typography.Text>
            </div>
          </div>
        </TableTheme>
      </div>
    );
  }

  return implementContract(infiniteTableContract, {
    type: "antd-infinite-table",
    component: AntdInfiniteTable,
  });
}

export const antdInfiniteTable = createAntdInfiniteTable();
