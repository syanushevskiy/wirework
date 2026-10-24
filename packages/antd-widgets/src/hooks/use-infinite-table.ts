/**
 * ALL antd-infinite-table logic lives here (guidelines: render-only
 * components) — the antd Table configuration out of what the tables share
 * (use-table-rows.ts), plus what makes this one an INFINITE LIST with its
 * filters and sorting IN THE HEADERS:
 *
 *  - Every column whose `filter` is a list of VALUES gets antd's own header
 *    filter (a list to tick, OK and Reset); one whose filter is TEXT gets a
 *    search icon opening the HeaderSearch box. What is chosen is read from
 *    the `filterIn` and `filterLike` ports (controlled), and every change
 *    EMITS `filter-changed` with both, whole — empty ones left out.
 *  - A `sortable` column sorts on a header click, ascending then descending
 *    then not at all, read from the `orderBy` port; a click EMITS `sort-changed`.
 *  - MORE: the rows scroll inside a box of the widget's own; a line under
 *    them (the END) says "<held> of <total>". Whenever the end comes into
 *    view — the user scrolled, or the rows do not fill the box — and the
 *    server has more rows than are held, `more` is emitted with the offset
 *    of the next row: once per set of rows (the same rows never ask twice,
 *    so a server that has nothing more cannot be asked in a loop), and
 *    never while loading. Whether the end is in view is MEASURED when the
 *    decision is made, never remembered: an observer only says "look again".
 */
import { createElement, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { SearchOutlined } from "@ant-design/icons";
import type { TableColumnsType, TableColumnType, TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type { ColumnOrder, FilterValues, SearchValues, TableColumn, TableRow } from "@wirework/widget-contracts";
import type { InfiniteTableEvents } from "../widgets/antd-infinite-table";
import { HeaderSearch } from "../widgets/header-search";
import type { TableCellRenderers } from "./use-table-cell";
import {
  NO_CELLS,
  NO_ROWS,
  antdColumnOf,
  useRenderedRows,
  useRowProps,
  useTableColumns,
  type RenderedRow,
} from "./use-table-rows";

/** What the antd Table and the box around it are given (see use-table.ts on naming antd's public types). */
export interface InfiniteTableView {
  columns: TableColumnsType<RenderedRow>;
  rows: RenderedRow[];
  loading: boolean;
  rowProps: NonNullable<TableProps<RenderedRow>["onRow"]>;
  /** antd's one callback for header filters and sorting. */
  change: NonNullable<TableProps<RenderedRow>["onChange"]>;
  /** The header stays in view inside the widget's own scroll box. */
  sticky: NonNullable<TableProps<RenderedRow>["sticky"]>;
  /** The scroll box, and the end of the list inside it. */
  scrollRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  /** Rows held, rows on the server (if known), and the line that says so. */
  held: number;
  total: number | undefined;
  status: string;
}

const NOTHING_CHOSEN: FilterValues = {};
const NOTHING_SEARCHED: SearchValues = {};
const NO_ORDER: ColumnOrder = {};

/** Whether `end` lies within the visible part of `box` — measured now. */
function inView(box: HTMLElement | null, end: HTMLElement | null): boolean {
  if (box === null || end === null) return false;
  const boxRect = box.getBoundingClientRect();
  const endRect = end.getBoundingClientRect();
  return endRect.top < boxRect.bottom && endRect.bottom > boxRect.top;
}

/** The antd filter and sorter props of one column, from what its `filter` and `sortable` say and what is chosen. */
function headerOf(
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

export function useInfiniteTable(
  store: ReadableStore,
  emit: Emit<InfiniteTableEvents>,
  paths: {
    rows: string;
    loading?: string | undefined;
    columns?: string | undefined;
    total?: string | undefined;
    filterIn?: string | undefined;
    filterLike?: string | undefined;
    orderBy?: string | undefined;
  },
  ports: {
    rows: PortDefinition<TableRow[]>;
    loading: PortDefinition<boolean>;
    columns: PortDefinition<TableColumn[]>;
    total: PortDefinition<number>;
    filterIn: PortDefinition<FilterValues>;
    filterLike: PortDefinition<SearchValues>;
    orderBy: PortDefinition<ColumnOrder>;
  },
  settings: { columns: TableColumn[]; rowKey: string },
  cells: TableCellRenderers = NO_CELLS,
): InfiniteTableView {
  // The table appeared: `load`, once — the reaction calls whatever fetches its
  // data. After the mount, so the page has bound its reactions (useAfterMount).
  useAfterMount(() => emit("load", {}));

  // Validated by the contract's ports: a malformed value shows the default, never a crash.
  const rows = usePort(store, paths.rows, ports.rows) ?? NO_ROWS;
  const loading = usePort(store, paths.loading, ports.loading) === true;
  const total = usePort(store, paths.total, ports.total);
  const chosen = usePort(store, paths.filterIn, ports.filterIn) ?? NOTHING_CHOSEN;
  const searched = usePort(store, paths.filterLike, ports.filterLike) ?? NOTHING_SEARCHED;
  const order = usePort(store, paths.orderBy, ports.orderBy) ?? NO_ORDER;
  const columns = useTableColumns(store, paths.columns, ports.columns, settings.columns, rows);
  const renderedRows = useRenderedRows(rows, settings.rowKey);

  // The antd columns, and the way back from antd's column key to the column.
  const { tableColumns, byKey } = useMemo(() => {
    const byKey = new Map<string, TableColumn>();
    const tableColumns = columns.map((column, index) => {
      const base = antdColumnOf(column, index, cells);
      byKey.set(base.key, column);
      return { ...base, ...headerOf(column, chosen, searched, order) };
    });
    return { tableColumns, byKey };
  }, [columns, cells, chosen, searched, order]);

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

  const rowProps = useRowProps(emit);

  // The scroll box of the widget's own; the header sticks to its top.
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sticky = useMemo<NonNullable<TableProps<RenderedRow>["sticky"]>>(
    () => ({ getContainer: () => scrollRef.current ?? window }),
    [],
  );

  // "Look again": the end entered or left the visible part of the box. The
  // observer's first word comes a task after the mount — and nothing is
  // asked before it: an emit from the mount's own effects would find the
  // page's reactions not bound yet (they bind in a parent's effect, which
  // runs after this one's), as `load` knows (useAfterMount).
  const [looks, setLooks] = useState(0);
  useEffect(() => {
    const box = scrollRef.current;
    const end = endRef.current;
    if (box === null || end === null || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(() => setLooks((count) => count + 1), { root: box });
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  const hasMore = total !== undefined && rows.length < total;
  // The rows a `more` was emitted for: the same rows never ask twice.
  const asked = useRef<TableRow[] | undefined>(undefined);
  useEffect(() => {
    if (looks === 0 || loading || !hasMore || asked.current === rows) return;
    if (!inView(scrollRef.current, endRef.current)) return;
    asked.current = rows;
    emit("more", { offset: rows.length });
  }, [looks, loading, hasMore, rows, emit]);

  const status = total === undefined ? `${rows.length} rows` : `${rows.length} of ${total}`;

  return {
    columns: tableColumns,
    rows: renderedRows,
    loading,
    rowProps,
    change,
    sticky,
    scrollRef,
    endRef,
    held: rows.length,
    total,
    status,
  };
}
