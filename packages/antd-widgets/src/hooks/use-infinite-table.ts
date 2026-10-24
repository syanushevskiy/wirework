/**
 * ALL antd-infinite-table logic lives here (guidelines: render-only
 * components) — the antd Table configuration out of what the tables share
 * (use-table-rows.ts; the header filters of use-table-headers.ts, on by
 * default here), plus what makes this one an INFINITE LIST:
 *
 *  - MORE: the rows scroll inside a box of the widget's own; a line under
 *    them (the END) says "<held> of <total>". Whenever the end comes into
 *    view — the user scrolled, or the rows do not fill the box — and the
 *    server has more rows than are held, `more` is emitted with the offset
 *    of the next row: once per set of rows (the same rows never ask twice,
 *    so a server that has nothing more cannot be asked in a loop), and
 *    never while loading. Whether the end is in view is MEASURED when the
 *    decision is made, never remembered: an observer only says "look again".
 *  - The WINDOW (use-row-window.ts): of the rows held only those around the
 *    visible part of the box render, twice the box's height in all; blank
 *    rows of the right height stand in for the rest, so the scrollbar and
 *    the end are where they would be with every row rendered.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type { TableRow } from "@wirework/widget-contracts";
import type { InfiniteTableEvents } from "../widgets/antd-infinite-table";
import { SPACED_BODY, type RowSpace } from "../widgets/row-spacers";
import { useRowWindow } from "./use-row-window";
import type { TableCellRenderers } from "./use-table-cell";
import type { TablePaths, TablePorts, TableSettings, TableView } from "./use-table";
import { useTableHeaders } from "./use-table-headers";
import { NO_CELLS, NO_ROWS, useRenderedRows, useRowProps, useTableColumns, type RenderedRow } from "./use-table-rows";

/** What the antd Table and the box around it are given (see use-table.ts on naming antd's public types). */
export interface InfiniteTableView extends TableView {
  /** The header stays in view inside the widget's own scroll box. */
  sticky: NonNullable<TableProps<RenderedRow>["sticky"]>;
  /** The table body that leaves blank space around the window, and how much (for RowSpaceProvider). */
  components: NonNullable<TableProps<RenderedRow>["components"]>;
  space: RowSpace;
  /** The scroll box, and the end of the list inside it. */
  scrollRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  /** Rows held, rows on the server (if known), and the line that says so. */
  held: number;
  total: number | undefined;
  status: string;
  /** The rows rendered, as "<start>-<end>" of the rows held — a fact for tests. */
  window: string;
}

/** Whether `end` lies within the visible part of `box` — measured now. */
function inView(box: HTMLElement | null, end: HTMLElement | null): boolean {
  if (box === null || end === null) return false;
  const boxRect = box.getBoundingClientRect();
  const endRect = end.getBoundingClientRect();
  return endRect.top < boxRect.bottom && endRect.bottom > boxRect.top;
}

export function useInfiniteTable(
  store: ReadableStore,
  emit: Emit<InfiniteTableEvents>,
  paths: TablePaths & { total?: string | undefined },
  ports: TablePorts & { total: PortDefinition<number> },
  settings: TableSettings & { height: number },
  cells: TableCellRenderers = NO_CELLS,
): InfiniteTableView {
  // The table appeared: `load`, once — the reaction calls whatever fetches its
  // data. After the mount, so the page has bound its reactions (useAfterMount).
  useAfterMount(() => emit("load", {}));

  // Validated by the contract's ports: a malformed value shows the default, never a crash.
  const rows = usePort(store, paths.rows, ports.rows) ?? NO_ROWS;
  const loading = usePort(store, paths.loading, ports.loading) === true;
  const total = usePort(store, paths.total, ports.total);
  const columns = useTableColumns(store, paths.columns, ports.columns, settings.columns, rows);
  const renderedRows = useRenderedRows(rows, settings.rowKey);
  const headers = useTableHeaders(store, emit, paths, ports, columns, cells, settings.headerFilters);
  const rowProps = useRowProps(emit);

  // The scroll box of the widget's own; the header sticks to its top.
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sticky = useMemo<NonNullable<TableProps<RenderedRow>["sticky"]>>(
    () => ({ getContainer: () => scrollRef.current ?? window }),
    [],
  );

  // The window: which of the held rows render, and the blank space around them.
  const shown = useRowWindow(scrollRef, renderedRows.length, settings.height);
  const windowRows = useMemo(() => renderedRows.slice(shown.start, shown.end), [renderedRows, shown.start, shown.end]);
  const space = useMemo<RowSpace>(
    () => ({ above: shown.above, below: shown.below, columns: Math.max(1, columns.length) }),
    [shown.above, shown.below, columns.length],
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
    columns: headers.columns,
    rows: windowRows,
    loading,
    rowProps,
    change: headers.change,
    sticky,
    components: SPACED_BODY,
    space,
    scrollRef,
    endRef,
    held: rows.length,
    total,
    status,
    window: `${shown.start}-${shown.end}`,
  };
}
