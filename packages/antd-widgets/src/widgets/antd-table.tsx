/**
 * Table — the antd implementation of the generic `table` contract: an antd
 * Table over the array of records at the `rows` port, keyed by each row's
 * `rowKey` property, with the configured columns (or one per field of the
 * first row), each cell shown as its column's `cell` says — and, with the
 * `headerFilters` setting on, each column's filter and sorting in its
 * header, as the infinite table has them. A click on a row emits
 * `row-selected`, a plain click on a link cell `link-clicked` — intents,
 * not state: a reaction or the host decides what they mean. Render-only:
 * logic in useTable.
 *
 * A HOST that wants cells no predefined kind shows makes its own table with
 * `createAntdTable({ cells })` — renderers by name, which a column selects
 * with `cell: { kind: "custom", name }` — and registers it instead of
 * `antdTable` (or the whole set with `createAntdWidgets`). The TOOLBAR's
 * items are registered the same way, `createAntdTable({ toolbar })`: by
 * name, which a page lists with `toolbar: [{ name }]`.
 */
import { Table } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { tableContract } from "@wirework/widget-contracts";
import { NO_CELLS, useTable } from "../hooks/use-table";
import type { TableCellRenderers } from "../hooks/use-table-cell";
import type { TableToolbarItems } from "../hooks/use-table-toolbar";
import { useCellTip } from "../hooks/use-cell-tip";
import { CellMenu } from "./cell-menu";
import { CellTip } from "./cell-tip";
import type { TableRowActions } from "../hooks/use-row-actions";
import { rowActionsOf } from "./row-actions";
import { TableTheme } from "./table-theme";
import { TableToolbar, toolbarItems } from "./table-toolbar";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type TableEvents = (typeof tableContract)["events"];

export interface AntdTableOptions {
  /** Renderers the host registers by name, for `cell: { kind: "custom", name }`. */
  cells?: TableCellRenderers;
  /**
   * Toolbar items the host registers by name, for `toolbar: [{ name }]` — beside the standard `reset-filters` and
   * `refresh`, and INSTEAD of one of them when registered under its name (the host's own refresher as `refresh`).
   */
  toolbar?: TableToolbarItems;
  /**
   * Row actions the host registers by name, for `rowActions: [{ name }]` (doc/ADR/0020-row-actions.md) — beside the
   * standard `favorite`, and INSTEAD of it when registered under its name.
   */
  rowActions?: TableRowActions;
}

export function createAntdTable({
  cells = NO_CELLS,
  toolbar: ownItems,
  rowActions: ownActions,
}: AntdTableOptions = {}) {
  const items = toolbarItems(ownItems);
  const actions = rowActionsOf(ownActions);

  function AntdTable({ viewModel, store, emit }: ContractProps<typeof tableContract>) {
    const {
      columns,
      rows,
      loading,
      rowProps,
      change,
      columnMenu,
      toolbar,
      filters,
      scroll,
      cells: selection,
    } = useTable(
      store,
      emit,
      {
        rows: viewModel.inputs.rows,
        loading: viewModel.inputs.loading,
        columns: viewModel.inputs.columns,
        filterIn: viewModel.inputs.filterIn,
        filterLike: viewModel.inputs.filterLike,
        filterBetween: viewModel.inputs.filterBetween,
        orderBy: viewModel.inputs.orderBy,
        filters: viewModel.inputs.filters,
        columnState: viewModel.inputs.columnState,
      },
      tableContract.io.inputs,
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
      },
      cells,
      items,
      actions,
    );
    const tip = useCellTip(!viewModel.wrapCells);

    return (
      // The root hears every press, right click and key of its cells: the cell selection is decided in one place.
      <div
        className="ww-table"
        data-testid="antd-table"
        data-path={viewModel.inputs.rows}
        data-loading={loading}
        data-filter-row={viewModel.filterRow}
        data-min-width={scroll.x}
        data-cell-selection={viewModel.cellSelection}
        data-wrap-cells={viewModel.wrapCells}
        data-selected={selection.selected}
        {...selection.root}
        {...tip.root}
      >
        <TableTheme>
          <CellMenu view={selection} />
          <CellTip tip={tip.tip} />
          <TableToolbar title={viewModel.title} filters={filters} items={toolbar} columnMenu={columnMenu} />
          <Table
            size="small"
            pagination={false}
            loading={loading}
            columns={columns}
            dataSource={rows}
            rowKey="key"
            locale={{ emptyText: viewModel.emptyText }}
            onRow={rowProps}
            onChange={change}
            scroll={scroll}
            // One line a cell: the columns keep their widths whatever the text (styles.css).
            tableLayout={viewModel.wrapCells ? "auto" : "fixed"}
          />
        </TableTheme>
      </div>
    );
  }

  return implementContract(tableContract, {
    type: "antd-table",
    component: AntdTable,
  });
}

export const antdTable = createAntdTable();
