/**
 * The TOOLBAR above the two antd tables: the items the page listed
 * (`toolbar`), then the column menu's button — one row, at the table's
 * right edge. And the two STANDARD items, which a host replaces by
 * registering its own under the same name (`createAntdTable({ toolbar })`).
 * Render-only: logic in useTableToolbar.
 */
import { ClearOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { ColumnMenuView } from "../hooks/use-column-state";
import type { TableToolbarItemProps, TableToolbarItems, ToolbarEntry } from "../hooks/use-table-toolbar";
import { ColumnMenu } from "./column-menu";

/** `reset-filters`: filter by nothing — disabled while nothing is filtered by. */
export function ResetFiltersItem({ filtered, resetFilters }: TableToolbarItemProps) {
  return (
    <Button
      type="text"
      size="small"
      icon={<ClearOutlined />}
      disabled={!filtered}
      onClick={resetFilters}
      aria-label="Reset filters"
      title="Reset filters"
      data-testid="table-reset-filters"
    />
  );
}

/** `refresh`: ask for the rows again — spinning, and not to be clicked, while they are on their way. */
export function RefreshItem({ loading, refresh }: TableToolbarItemProps) {
  return (
    <Button
      type="text"
      size="small"
      icon={<ReloadOutlined spin={loading} />}
      disabled={loading}
      onClick={refresh}
      aria-label="Reload"
      title="Reload"
      data-testid="table-refresh"
    />
  );
}

/** The items every antd table has; a host's own are laid over them by name. */
export const STANDARD_TOOLBAR: TableToolbarItems = {
  "reset-filters": ResetFiltersItem,
  refresh: RefreshItem,
};

/** The standard items with the host's over them — made once, where the table is made. */
export function toolbarItems(own: TableToolbarItems | undefined): TableToolbarItems {
  return own === undefined ? STANDARD_TOOLBAR : { ...STANDARD_TOOLBAR, ...own };
}

export interface TableToolbarProps {
  items: ToolbarEntry[];
  columnMenu: ColumnMenuView | undefined;
}

export function TableToolbar({ items, columnMenu }: TableToolbarProps) {
  if (items.length === 0 && columnMenu === undefined) return null;
  return (
    <div className="ww-table__toolbar" data-testid="table-toolbar" role="toolbar" aria-label="Table tools">
      {items.map(({ key, name, Item, props }) => (
        <span key={key} className="ww-table__tool" data-testid="table-toolbar-item" data-name={name}>
          <Item {...props} />
        </span>
      ))}
      {columnMenu ? <ColumnMenu menu={columnMenu} /> : null}
    </div>
  );
}
