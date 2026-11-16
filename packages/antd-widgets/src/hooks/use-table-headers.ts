/**
 * The HEADER FILTERS the two antd tables share (doc/ADR/0007-row-window-and-header-filters.md;
 * `headerFilters` in the `table` contract), on top of the columns of
 * use-table-rows.ts:
 *
 *  - Every column whose `filter` is a list of VALUES gets a filter icon
 *    opening a Select of several values that filters on every pick
 *    (HeaderValues: Reset and Done); one whose filter is TEXT gets a
 *    search icon opening the HeaderSearch box; one whose filter is DATES a
 *    calendar icon opening a start and an end date (HeaderPeriod). What is
 *    chosen is read from the `filterIn`, `filterLike` and `filterBetween`
 *    ports (controlled), and every change EMITS `filter-changed` with all
 *    three, whole — empty ones left out.
 *  - A `sortable` column sorts on a header click, ascending then descending
 *    then not at all, read from the `orderBy` port; a click EMITS `sort-changed`.
 *
 * Not offered (the setting is off): the plain columns, and a `change` that
 * antd never has a reason to call.
 *
 * And the FILTER ROW (`filterRow`, doc/ADR/0016-table-filters-and-cards.md): a
 * column with a `filter` shows its control under its title (HeaderFilter),
 * reading the same two ports and emitting the same `filter-changed` — with
 * the dropdowns on too, both show one choice.
 */
import { createElement, useCallback, useMemo } from "react";
import { CalendarOutlined, SearchOutlined } from "@ant-design/icons";
import type { TableColumnsType, TableColumnType, TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import {
  NO_DATES,
  tableWidth,
  type ColumnOrder,
  type ColumnPin,
  type DateRange,
  type FilterValues,
  type PeriodValues,
  type SearchValues,
  type TableColumn,
  type tableHeaderEvents,
} from "@wirework/widget-contracts";
import { HeaderFilter } from "../widgets/header-filter";
import { HeaderPeriod } from "../widgets/header-period";
import { HeaderSearch } from "../widgets/header-search";
import { HeaderValues } from "../widgets/header-values";
import type { CellSelectionView } from "./use-cell-selection";
import type { TableCellRenderers } from "./use-table-cell";
import { antdColumnOf, type RenderedRow } from "./use-table-rows";

/** The events the headers emit — the part of every table kind's events a header decides. */
export type HeaderEvents = typeof tableHeaderEvents;

/** What the antd Table is given for its headers. */
export interface TableHeadersView {
  columns: TableColumnsType<RenderedRow>;
  /** antd's one callback for header filters and sorting. */
  change: NonNullable<TableProps<RenderedRow>["onChange"]>;
  /** Whether anything is filtered by, and the way to filter by nothing — what the toolbar's "Reset filters" needs. */
  filtered: boolean;
  resetFilters: () => void;
  /** Everything filtered by now, and the way to change ONE property's choice — what the bar's own filters need. */
  choice: FilterChoice;
  choose: (property: string, next: ColumnChoice) => void;
  /** Whether a period has somewhere to live: the `filterBetween` port is bound. */
  keepsPeriods: boolean;
  /** antd's `scroll`: `x` the sum of the columns' widths — the table scrolls sideways in a narrower box. */
  scroll: { x: number };
}

const NO_FILTERS: FilterChoice = { filterIn: {}, filterLike: {}, filterBetween: {} };

/** Whether the choice filters by anything at all. */
export function isFiltered(choice: FilterChoice): boolean {
  const { filterIn, filterLike, filterBetween } = withoutEmpty(choice);
  return [filterIn, filterLike, filterBetween].some((group) => Object.keys(group).length > 0);
}

const NOTHING_CHOSEN: FilterValues = {};
const NOTHING_SEARCHED: SearchValues = {};
const NO_PERIODS: PeriodValues = {};
const NO_ORDER: ColumnOrder = {};
const NONE: string[] = [];
const NOT_PINNED: Readonly<Record<string, ColumnPin>> = {};

/** Everything the headers filter by — what `filter-changed` carries. */
export interface FilterChoice {
  filterIn: FilterValues;
  filterLike: SearchValues;
  filterBetween: PeriodValues;
}

/** ONE column's new choice, by what the column is filtered by. */
export type ColumnChoice =
  { kind: "values"; values: string[] } | { kind: "text"; text: string } | { kind: "dates"; period: DateRange };

/** The choice with nothing empty in it: no column without values, without a text, or with a period open at both ends. */
const withoutEmpty = ({ filterIn, filterLike, filterBetween }: FilterChoice): FilterChoice => ({
  filterIn: Object.fromEntries(Object.entries(filterIn).filter(([, values]) => values.length > 0)),
  filterLike: Object.fromEntries(Object.entries(filterLike).filter(([, text]) => text !== "")),
  filterBetween: Object.fromEntries(Object.entries(filterBetween).filter(([, [from, to]]) => from !== "" || to !== "")),
});

/**
 * The whole choice after ONE column's changed in the filter row: its
 * values, its text or its period replaced, everything else as it was,
 * nothing empty left in — what `filter-changed` carries.
 */
export function filterChoice(current: FilterChoice, property: string, next: ColumnChoice): FilterChoice {
  return withoutEmpty({
    filterIn: next.kind === "values" ? { ...current.filterIn, [property]: next.values } : current.filterIn,
    filterLike: next.kind === "text" ? { ...current.filterLike, [property]: next.text.trim() } : current.filterLike,
    filterBetween:
      next.kind === "dates" ? { ...current.filterBetween, [property]: next.period } : current.filterBetween,
  });
}

/** The antd filter and sorter props of one column, from what its `filter` and `sortable` say and what is chosen. */
export function headerOf(
  column: TableColumn,
  { filterIn: chosen, filterLike: searched, filterBetween: periods }: FilterChoice,
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
    const { options } = column.filter;
    header.filterDropdown = (props) => createElement(HeaderValues, { ...props, title: column.title, options });
    header.filteredValue = chosen[column.property] ?? null;
  } else if (column.filter?.kind === "text") {
    const text = searched[column.property] ?? "";
    header.filterDropdown = (props) => createElement(HeaderSearch, { ...props, title: column.title });
    // The search icon: what tells a text filter from a list of values.
    header.filterIcon = createElement(SearchOutlined);
    header.filteredValue = text === "" ? null : [text];
  } else if (column.filter?.kind === "dates") {
    const [from, to] = periods[column.property] ?? NO_DATES;
    const time = column.filter.time !== false;
    header.filterDropdown = (props) => createElement(HeaderPeriod, { ...props, title: column.title, time });
    // The calendar icon: what tells a period from a search and from a list of values.
    header.filterIcon = createElement(CalendarOutlined);
    header.filteredValue = from === "" && to === "" ? null : [from, to];
  }
  return header;
}

/** The column without its filter when that is a period of dates. */
const withoutPeriod = ({ filter, ...column }: TableColumn): TableColumn =>
  filter === undefined || filter.kind === "dates" ? column : { ...column, filter };

export function useTableHeaders(
  store: ReadableStore,
  emit: Emit<HeaderEvents>,
  paths: {
    filterIn?: string | undefined;
    filterLike?: string | undefined;
    filterBetween?: string | undefined;
    orderBy?: string | undefined;
  },
  ports: {
    filterIn: PortDefinition<FilterValues>;
    filterLike: PortDefinition<SearchValues>;
    filterBetween: PortDefinition<PeriodValues>;
    orderBy: PortDefinition<ColumnOrder>;
  },
  columns: TableColumn[],
  cells: TableCellRenderers,
  /** The settings: `headerFilters` (the dropdowns and the sorting) and `filterRow` (a control under each title). */
  offered: boolean,
  filterRow: boolean,
  /** The rows' key property: its column is an id column, narrower by default. */
  rowKey: string,
  /** The cell selection's attributes per cell (use-cell-selection.ts), when cells are selected. */
  selection?: CellSelectionView["cellAttributes"],
  /** The edge each pinned column stands at (the column menu's state): it stays in view while the others scroll sideways. */
  pinned: Readonly<Record<string, ColumnPin>> = NOT_PINNED,
): TableHeadersView {
  const chosen = usePort(store, paths.filterIn, ports.filterIn) ?? NOTHING_CHOSEN;
  const searched = usePort(store, paths.filterLike, ports.filterLike) ?? NOTHING_SEARCHED;
  const periods = usePort(store, paths.filterBetween, ports.filterBetween) ?? NO_PERIODS;
  const order = usePort(store, paths.orderBy, ports.orderBy) ?? NO_ORDER;
  const current = useMemo<FilterChoice>(
    () => ({ filterIn: chosen, filterLike: searched, filterBetween: periods }),
    [chosen, searched, periods],
  );

  // A period has nowhere to live while the `filterBetween` port is unbound — and a loader gives every date column
  // one by default: such a table offers no period, rather than a calendar whose choice goes nowhere.
  const keepsPeriods = paths.filterBetween !== undefined;
  const filterable = useMemo(() => (keepsPeriods ? columns : columns.map(withoutPeriod)), [columns, keepsPeriods]);

  // The antd columns, and the way back from antd's column key to the column.
  const { tableColumns, byKey } = useMemo(() => {
    const byKey = new Map<string, TableColumn>();
    const tableColumns = filterable.map((column, index) => {
      const base = antdColumnOf(column, index, cells, rowKey, selection);
      byKey.set(base.key, column);
      const { filter } = column;
      const edge = pinned[column.property];
      return {
        ...base,
        // Pinned: antd keeps it at that edge; its header says so for tests.
        ...(edge === undefined
          ? {}
          : { fixed: edge, onHeaderCell: () => ({ "data-pinned": edge }) as Record<string, string> }),
        ...(offered ? headerOf(column, current, order) : {}),
        // The filter row: the title above the column's own control.
        ...(filterRow && filter !== undefined
          ? {
              title: createElement(HeaderFilter, {
                title: column.title,
                property: column.property,
                filter,
                values: current.filterIn[column.property] ?? NONE,
                text: current.filterLike[column.property] ?? "",
                period: current.filterBetween[column.property] ?? NO_DATES,
                change: (next) => emit("filter-changed", filterChoice(current, column.property, next)),
              }),
            }
          : {}),
      };
    });
    return { tableColumns, byKey };
  }, [filterable, cells, offered, filterRow, current, order, emit, rowKey, selection, pinned]);
  // The least width the table needs: narrower than this its box scrolls sideways, wider and the table fills it.
  const scroll = useMemo(() => ({ x: tableWidth(columns, rowKey) }), [columns, rowKey]);

  // antd reports every filter and the sorter at once; what is emitted is the
  // whole choice, in the request's own groups, nothing empty in it.
  const change = useCallback<NonNullable<TableProps<RenderedRow>["onChange"]>>(
    (_, filters, sorter, extra) => {
      if (extra.action === "filter") {
        // antd speaks for the columns it shows a filter of. What is chosen for anything else — a column hidden in
        // the column menu, a filter bar's own filter, a date-range widget on the same path — stays as it is.
        const spoken = new Set(
          [...byKey.values()].filter((column) => column.filter !== undefined).map((column) => column.property),
        );
        const kept = <Value>(group: Record<string, Value>): Record<string, Value> =>
          Object.fromEntries(Object.entries(group).filter(([property]) => !spoken.has(property)));
        const filterIn: FilterValues = kept(current.filterIn);
        const filterLike: SearchValues = kept(current.filterLike);
        const filterBetween: PeriodValues = kept(current.filterBetween);
        for (const [key, values] of Object.entries(filters)) {
          const column = byKey.get(key);
          if (column?.filter === undefined || values === null || values.length === 0) continue;
          if (column.filter.kind === "values") {
            filterIn[column.property] = values.map(String);
          } else if (column.filter.kind === "dates") {
            const period: DateRange = [String(values[0] ?? ""), String(values[1] ?? "")];
            if (period[0] !== "" || period[1] !== "") filterBetween[column.property] = period;
          } else {
            const text = String(values[0] ?? "").trim();
            if (text !== "") filterLike[column.property] = text;
          }
        }
        emit("filter-changed", withoutEmpty({ filterIn, filterLike, filterBetween }));
      } else if (extra.action === "sort") {
        const first = Array.isArray(sorter) ? sorter[0] : sorter;
        const column = first?.columnKey === undefined ? undefined : byKey.get(String(first.columnKey));
        const orderBy: ColumnOrder =
          column === undefined || !first?.order ? {} : { [column.property]: first.order === "ascend" ? "ASC" : "DESC" };
        emit("sort-changed", { orderBy });
      }
    },
    [byKey, current, emit],
  );

  const filtered = useMemo(() => isFiltered(current), [current]);
  const resetFilters = useCallback(() => emit("filter-changed", NO_FILTERS), [emit]);

  const choose = useCallback(
    (property: string, next: ColumnChoice) => emit("filter-changed", filterChoice(current, property, next)),
    [emit, current],
  );

  return { columns: tableColumns, change, filtered, resetFilters, choice: current, choose, keepsPeriods, scroll };
}
