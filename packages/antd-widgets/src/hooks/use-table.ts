/**
 * ALL antd-table logic lives here (guidelines: render-only components) —
 * the antd Table configuration out of what the tables share
 * (use-table-rows.ts, use-table-headers.ts): the columns, one row per
 * record keyed by its `rowKey` property, each cell as its column's `cell`
 * says, the row props that turn a click into an intent, and — with the
 * `headerFilters` setting on — each column's filter and sorting in its
 * header.
 */
import type { TableColumnsType, TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type {
  ColumnOrder,
  ColumnState,
  FilterValues,
  PeriodValues,
  SearchValues,
  TableColumn,
  TableRow,
  ToolbarItem,
} from "@wirework/widget-contracts";
import { columnStateKey } from "../column-state";
import type { TableEvents } from "../widgets/antd-table";
import { useCellSelection, type CellSelectionView } from "./use-cell-selection";
import { useTableToolbar, type TableToolbarItems, type ToolbarEntry } from "./use-table-toolbar";
import { useColumnState, type ColumnEvents, type ColumnMenuView, type ColumnStateView } from "./use-column-state";
import type { TableCellRenderers } from "./use-table-cell";
import { useTableHeaders } from "./use-table-headers";
import { NO_ROWS, useRenderedRows, useRowProps, useTableColumns, type RenderedRow } from "./use-table-rows";

export type { RenderedRow } from "./use-table-rows";
export { NO_CELLS } from "./use-table-rows";

/**
 * What the antd Table is given. Named, not inferred: a declaration file
 * must refer to antd's public `TableProps`, never to the internal package
 * antd builds it from.
 */
export interface TableView {
  columns: TableColumnsType<RenderedRow>;
  rows: RenderedRow[];
  loading: boolean;
  rowProps: NonNullable<TableProps<RenderedRow>["onRow"]>;
  /** antd's one callback for header filters and sorting. */
  change: NonNullable<TableProps<RenderedRow>["onChange"]>;
  /** The column menu, when the `columnMenu` setting offers it. */
  columnMenu: ColumnMenuView | undefined;
  /** antd's `scroll`: the least width the table needs (the sum of its columns' widths) — narrower, it scrolls sideways. */
  scroll: { x: number };
  /** The toolbar's items, as the `toolbar` setting lists them. */
  toolbar: ToolbarEntry[];
  /** The cell selection: the root's handlers, the menu, what is selected. */
  cells: CellSelectionView;
}

/** The store paths every table kind reads. */
export interface TablePaths {
  rows: string;
  loading?: string | undefined;
  columns?: string | undefined;
  filterIn?: string | undefined;
  filterLike?: string | undefined;
  filterBetween?: string | undefined;
  orderBy?: string | undefined;
  columnState?: string | undefined;
}

/** The ports every table kind reads them through. */
export interface TablePorts {
  rows: PortDefinition<TableRow[]>;
  loading: PortDefinition<boolean>;
  columns: PortDefinition<TableColumn[]>;
  filterIn: PortDefinition<FilterValues>;
  filterLike: PortDefinition<SearchValues>;
  filterBetween: PortDefinition<PeriodValues>;
  orderBy: PortDefinition<ColumnOrder>;
  columnState: PortDefinition<ColumnState>;
}

/** The settings every table kind has. */
export interface TableSettings {
  columns: TableColumn[];
  rowKey: string;
  headerFilters: boolean;
  filterRow: boolean;
  columnMenu: boolean;
  columnStateKey: string;
  toolbar: ToolbarItem[];
  cellSelection: boolean;
  exportName: string;
}

/** The columns as the column menu's state shows and orders them, and the menu — what both table kinds do with it. */
export function useMenuColumns(
  store: ReadableStore,
  emit: Emit<ColumnEvents>,
  paths: TablePaths,
  ports: TablePorts,
  settings: TableSettings,
  columns: TableColumn[],
): ColumnStateView {
  return useColumnState(
    store,
    emit,
    paths.columnState,
    ports.columnState,
    columns,
    settings.columnMenu,
    columnStateKey(settings.columnStateKey, paths.rows),
  );
}

export function useTable(
  store: ReadableStore,
  emit: Emit<TableEvents>,
  paths: TablePaths,
  ports: TablePorts,
  settings: TableSettings,
  cells: TableCellRenderers,
  toolbarItems: TableToolbarItems,
): TableView {
  // The table appeared: `load`, once — the reaction calls whatever fetches its
  // data. After the mount, so the page has bound its reactions (useAfterMount).
  useAfterMount(() => emit("load", {}));

  // Validated by the contract's ports: a malformed value shows no rows, never a crash.
  const rows = usePort(store, paths.rows, ports.rows) ?? NO_ROWS;
  const loading = usePort(store, paths.loading, ports.loading) === true;
  const columns = useTableColumns(store, paths.columns, ports.columns, settings.columns, rows);
  const renderedRows = useRenderedRows(rows, settings.rowKey);
  const menu = useMenuColumns(store, emit, paths, ports, settings, columns);
  const selection = useCellSelection(
    emit,
    settings.cellSelection,
    menu.columns,
    rows,
    0,
    settings.exportName,
    paths.rows,
  );
  const headers = useTableHeaders(
    store,
    emit,
    paths,
    ports,
    menu.columns,
    cells,
    settings.headerFilters,
    settings.filterRow,
    settings.rowKey,
    selection.cellAttributes,
  );
  const rowProps = useRowProps(emit);
  const toolbar = useTableToolbar(emit, settings.toolbar, toolbarItems, {
    loading,
    filtered: headers.filtered,
    resetFilters: headers.resetFilters,
  });

  return {
    scroll: headers.scroll,
    toolbar,
    columns: headers.columns,
    rows: renderedRows,
    loading,
    rowProps,
    change: headers.change,
    columnMenu: menu.menu,
    cells: selection,
  };
}
