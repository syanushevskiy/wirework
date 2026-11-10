/**
 * The HEADER FILTERS the two antd tables share (doc/row-window-design.md;
 * `headerFilters` in the `table` contract), on top of the columns of
 * use-table-rows.ts:
 *
 *  - Every column whose `filter` is a list of VALUES gets antd's own header
 *    filter (a list to tick, OK and Reset); one whose filter is TEXT gets a
 *    search icon opening the HeaderSearch box. What is chosen is read from
 *    the `filterIn` and `filterLike` ports (controlled), and every change
 *    EMITS `filter-changed` with both, whole — empty ones left out.
 *  - A `sortable` column sorts on a header click, ascending then descending
 *    then not at all, read from the `orderBy` port; a click EMITS `sort-changed`.
 *
 * Not offered (the setting is off): the plain columns, and a `change` that
 * antd never has a reason to call.
 *
 * And the FILTER ROW (`filterRow`, doc/table-filters-cards-design.md): a
 * column with a `filter` shows its control under its title (HeaderFilter),
 * reading the same two ports and emitting the same `filter-changed` — with
 * the dropdowns on too, both show one choice.
 */
import { createElement, useCallback, useMemo } from "react";
import { SearchOutlined } from "@ant-design/icons";
import type { TableColumnsType, TableColumnType, TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type {
  ColumnOrder,
  FilterValues,
  SearchValues,
  TableColumn,
  tableHeaderEvents,
} from "@wirework/widget-contracts";
import { HeaderFilter } from "../widgets/header-filter";
import { HeaderSearch } from "../widgets/header-search";
import type { TableCellRenderers } from "./use-table-cell";
import { antdColumnOf, type RenderedRow } from "./use-table-rows";

/** The events the headers emit — the part of every table kind's events a header decides. */
export type HeaderEvents = typeof tableHeaderEvents;

/** What the antd Table is given for its headers. */
export interface TableHeadersView {
  columns: TableColumnsType<RenderedRow>;
  /** antd's one callback for header filters and sorting. */
  change: NonNullable<TableProps<RenderedRow>["onChange"]>;
}

const NOTHING_CHOSEN: FilterValues = {};
const NOTHING_SEARCHED: SearchValues = {};
const NO_ORDER: ColumnOrder = {};
const NONE: string[] = [];

/**
 * The whole choice after ONE column's changed in the filter row: its values
 * (a list) or its text replaced, everything else as it was, nothing empty
 * left in — what `filter-changed` carries.
 */
export function filterChoice(
  chosen: FilterValues,
  searched: SearchValues,
  property: string,
  next: string[] | string,
): { filterIn: FilterValues; filterLike: SearchValues } {
  const filterIn = typeof next === "string" ? chosen : { ...chosen, [property]: next };
  const filterLike = typeof next === "string" ? { ...searched, [property]: next.trim() } : searched;
  return {
    filterIn: Object.fromEntries(Object.entries(filterIn).filter(([, values]) => values.length > 0)),
    filterLike: Object.fromEntries(Object.entries(filterLike).filter(([, text]) => text !== "")),
  };
}

/** The antd filter and sorter props of one column, from what its `filter` and `sortable` say and what is chosen. */
export function headerOf(
  column: TableColumn,
  chosen: FilterValues,
  searched: SearchValues,
  order: ColumnOrder,
): Partial<TableColumnType<RenderedRow>> {
  const header: Partial<TableColumnType<RenderedRow>> = {};
  if (column.sortable === true) {
    const direction = order[column.property];
    header.sorter = true;
    header.sortDirections = ["ascend", "descend"];
    header.sortOrder = direction === "ASC" ? "ascend" : direction === "DESC" ? "descend" : null;
  }
  if (column.filter?.kind === "values") {
    header.filters = column.filter.options.map((option) => ({
      text: option.label ?? option.value,
      value: option.value,
    }));
    header.filteredValue = chosen[column.property] ?? null;
  } else if (column.filter?.kind === "text") {
    const text = searched[column.property] ?? "";
    header.filterDropdown = (props) => createElement(HeaderSearch, { ...props, title: column.title });
    // The search icon: what tells a text filter from a list of values.
    header.filterIcon = createElement(SearchOutlined);
    header.filteredValue = text === "" ? null : [text];
  }
  return header;
}

export function useTableHeaders(
  store: ReadableStore,
  emit: Emit<HeaderEvents>,
  paths: { filterIn?: string | undefined; filterLike?: string | undefined; orderBy?: string | undefined },
  ports: {
    filterIn: PortDefinition<FilterValues>;
    filterLike: PortDefinition<SearchValues>;
    orderBy: PortDefinition<ColumnOrder>;
  },
  columns: TableColumn[],
  cells: TableCellRenderers,
  /** The settings: `headerFilters` (the dropdowns and the sorting) and `filterRow` (a control under each title). */
  offered: boolean,
  filterRow: boolean,
): TableHeadersView {
  const chosen = usePort(store, paths.filterIn, ports.filterIn) ?? NOTHING_CHOSEN;
  const searched = usePort(store, paths.filterLike, ports.filterLike) ?? NOTHING_SEARCHED;
  const order = usePort(store, paths.orderBy, ports.orderBy) ?? NO_ORDER;

  // The antd columns, and the way back from antd's column key to the column.
  const { tableColumns, byKey } = useMemo(() => {
    const byKey = new Map<string, TableColumn>();
    const tableColumns = columns.map((column, index) => {
      const base = antdColumnOf(column, index, cells);
      byKey.set(base.key, column);
      const { filter } = column;
      return {
        ...base,
        ...(offered ? headerOf(column, chosen, searched, order) : {}),
        // The filter row: the title above the column's own control.
        ...(filterRow && filter !== undefined
          ? {
              title: createElement(HeaderFilter, {
                title: column.title,
                property: column.property,
                filter,
                values: chosen[column.property] ?? NONE,
                text: searched[column.property] ?? "",
                change: (next) => emit("filter-changed", filterChoice(chosen, searched, column.property, next)),
              }),
            }
          : {}),
      };
    });
    return { tableColumns, byKey };
  }, [columns, cells, offered, filterRow, chosen, searched, order, emit]);

  // antd reports every filter and the sorter at once; what is emitted is the
  // whole choice, in the request's own groups, nothing empty in it.
  const change = useCallback<NonNullable<TableProps<RenderedRow>["onChange"]>>(
    (_, filters, sorter, extra) => {
      if (extra.action === "filter") {
        const filterIn: FilterValues = {};
        const filterLike: SearchValues = {};
        for (const [key, values] of Object.entries(filters)) {
          const column = byKey.get(key);
          if (column?.filter === undefined || values === null || values.length === 0) continue;
          if (column.filter.kind === "values") {
            filterIn[column.property] = values.map(String);
          } else {
            const text = String(values[0] ?? "").trim();
            if (text !== "") filterLike[column.property] = text;
          }
        }
        emit("filter-changed", { filterIn, filterLike });
      } else if (extra.action === "sort") {
        const first = Array.isArray(sorter) ? sorter[0] : sorter;
        const column = first?.columnKey === undefined ? undefined : byKey.get(String(first.columnKey));
        const orderBy: ColumnOrder =
          column === undefined || !first?.order ? {} : { [column.property]: first.order === "ascend" ? "ASC" : "DESC" };
        emit("sort-changed", { orderBy });
      }
    },
    [byKey, emit],
  );

  return { columns: tableColumns, change };
}
