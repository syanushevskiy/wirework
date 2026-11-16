/**
 * The BAR above the two antd tables: the table's TITLE at its left, then —
 * at its right — the table's own FILTERS (`filters`: always in view, by a
 * property no column needs to show) and the TOOLBAR: the items the page
 * listed (`toolbar`), then the column menu's button. And the two STANDARD items, which a host replaces by
 * registering its own under the same name (`createAntdTable({ toolbar })`).
 * Render-only: logic in useTableToolbar.
 */
import { ClearOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { ColumnMenuView } from "../hooks/use-column-state";
import type { TableToolbarItemProps, TableToolbarItems, ToolbarEntry } from "../hooks/use-table-toolbar";
import type { ToolbarFilterEntry } from "../hooks/use-toolbar-filters";
import { ColumnMenu } from "./column-menu";
import { FilterControl } from "./header-filter";

/** `reset-filters`: filter by nothing — disabled while nothing is filtered by. */
export function ResetFiltersItem({ filtered, resetFilters }: TableToolbarItemProps) {
  return (
    <Button
      type="text"
      size="small"
      icon={<ClearOutlined />}
      disabled={!filtered}
      onClick={resetFilters}
      // The icon has a name of its own ("clear"); the button's is its text alone.
      aria-label="Reset Filters"
      data-testid="table-reset-filters"
    >
      Reset Filters
    </Button>
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
  /** The table's title, at the bar's left; "" for none. */
  title: string;
  /** The table's own filters, before the tools. */
  filters: ToolbarFilterEntry[];
  items: ToolbarEntry[];
  columnMenu: ColumnMenuView | undefined;
}

export function TableToolbar({ title, filters, items, columnMenu }: TableToolbarProps) {
  const tools = items.length > 0 || columnMenu !== undefined;
  if (title === "" && filters.length === 0 && !tools) return null;
  return (
    <div className="ww-table__bar" data-testid="table-bar">
      {title === "" ? null : (
        <div className="ww-table__title" data-testid="table-title" role="heading" aria-level={3}>
          {title}
        </div>
      )}
      {filters.length === 0 ? null : (
        <div className="ww-table__filters" data-testid="table-filters" role="group" aria-label="Table filters">
          {filters.map(({ id, ...filter }) => (
            <span key={id} className="ww-table__bar-filter">
              <span className="ww-table__bar-label">{filter.title}</span>
              <FilterControl {...filter} property={id} testId="table-bar-filter" />
            </span>
          ))}
        </div>
      )}
      {tools ? (
        <div className="ww-table__toolbar" data-testid="table-toolbar" role="toolbar" aria-label="Table tools">
          {items.map(({ key, name, Item, props }) => (
            <span key={key} className="ww-table__tool" data-testid="table-toolbar-item" data-name={name}>
              <Item {...props} />
            </span>
          ))}
          {columnMenu ? <ColumnMenu menu={columnMenu} /> : null}
        </div>
      ) : null}
    </div>
  );
}
