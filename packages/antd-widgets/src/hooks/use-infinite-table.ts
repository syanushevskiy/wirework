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
 *  - WINDOWED (the setting): the rows held are a SLICE of the list, `offset`
 *    rows into it. The window runs over the whole list (the `total`), the
 *    slice's rows in it render, and when the window leaves the slice
 *    `window` is emitted with the offset of the slice around it — `more`
 *    never.
 *  - POSITION (the port, when bound): the first row in view is emitted as
 *    the box scrolls (`position-changed`), and a position written by
 *    something else scrolls the box there.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type { TableRow } from "@wirework/widget-contracts";
import type { InfiniteTableEvents } from "../widgets/antd-infinite-table";
import { SPACED_BODY, type RowSpace } from "../widgets/row-spacers";
import { rowPosition, sliceWindow } from "../row-window";
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
  /** Where in the whole list the rows held begin (a windowed list's slice; 0 otherwise). */
  offset: number;
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
  paths: TablePaths & {
    total?: string | undefined;
    offset?: string | undefined;
    position?: string | undefined;
  },
  ports: TablePorts & {
    total: PortDefinition<number>;
    offset: PortDefinition<number>;
    position: PortDefinition<number>;
  },
  settings: TableSettings & { height: number; windowed: boolean },
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
  const headers = useTableHeaders(
    store,
    emit,
    paths,
    ports,
    columns,
    cells,
    settings.headerFilters,
    settings.filterRow,
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

  // WINDOWED: the rows held are a slice of the list, `offset` rows into it; the box scrolls over the whole list.
  const { windowed } = settings;
  const offset = usePort(store, paths.offset, ports.offset) ?? 0;
  const count = windowed ? Math.max(total ?? 0, offset + rows.length) : renderedRows.length;

  // The window: which rows of the list render — of the ones held —, and the blank space around them.
  const whole = useRowWindow(scrollRef, count, settings.height);
  const shown = useMemo(
    () => (windowed ? sliceWindow(whole, count, offset, renderedRows.length) : whole),
    [windowed, whole, count, offset, renderedRows.length],
  );
  const windowRows = useMemo(() => renderedRows.slice(shown.start, shown.end), [renderedRows, shown.start, shown.end]);

  // The rows the window wants are not all held: ask for the slice with them in its middle — once per set of rows
  // and place, never while loading, and never for the slice already held (a server with fewer rows than it said).
  const wanted = useRef<{ rows: TableRow[]; offset: number } | undefined>(undefined);
  useEffect(() => {
    if (looks === 0 || !windowed || loading || total === undefined || total === 0) return;
    if (whole.start >= offset && whole.end <= offset + rows.length) return;
    const size = Math.max(rows.length, whole.end - whole.start);
    const middle = Math.floor((whole.start + whole.end) / 2);
    const next = Math.max(0, Math.min(middle - Math.floor(size / 2), total - size));
    if (rows.length > 0 && next === offset) return;
    if (wanted.current?.rows === rows && wanted.current.offset === next) return;
    wanted.current = { rows, offset: next };
    emit("window", { offset: next });
  }, [looks, windowed, loading, total, whole.start, whole.end, offset, rows, emit]);

  // WHERE THE LIST STANDS (the `position` port, when bound): the first row in view is emitted as the box scrolls —
  // a frame after the scroll, and a frame after the mount, when the page has bound its reactions — and the box
  // scrolls to the position when something else changed it.
  const position = usePort(store, paths.position, ports.position);
  const follows = paths.position !== undefined;
  const stands = useRef<{ position: number; visible: number } | undefined>(undefined);
  /** The position the list was TOLD to stand at, the row height it was scrolled there by and where that put the box — until the user scrolls. */
  const told = useRef<{ position: number; rowHeight: number; top: number } | undefined>(undefined);
  const measured = useRef({ rowHeight: whole.rowHeight, count, height: settings.height });
  useEffect(() => {
    measured.current = { rowHeight: whole.rowHeight, count, height: settings.height };
  });
  useEffect(() => {
    const box = scrollRef.current;
    if (!follows || box === null || typeof requestAnimationFrame === "undefined") return undefined;
    let frame: number | undefined;
    const report = () => {
      frame = undefined;
      const { rowHeight, count: all, height } = measured.current;
      if (all === 0) return;
      // The box is not where the list was told to stand: the user scrolled, and it stands where they left it.
      if (told.current !== undefined && Math.abs(box.scrollTop - told.current.top) > 1) told.current = undefined;
      // Still there, and the rows were measured since: the same row is elsewhere now — stand at it again.
      if (told.current !== undefined && told.current.rowHeight !== rowHeight) {
        box.scrollTop = told.current.position * rowHeight;
        told.current = { position: told.current.position, rowHeight, top: box.scrollTop };
        look();
        return;
      }
      const now = rowPosition(box.scrollTop, box.clientHeight === 0 ? height : box.clientHeight, rowHeight, all);
      if (stands.current?.position === now.position && stands.current.visible === now.visible) return;
      stands.current = now;
      emit("position-changed", now);
    };
    function look() {
      frame ??= requestAnimationFrame(report);
    }
    look();
    box.addEventListener("scroll", look, { passive: true });
    return () => {
      box.removeEventListener("scroll", look);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
    // The list got its rows, or their height was measured: look again.
  }, [follows, count, whole.rowHeight, emit]);
  useEffect(() => {
    const box = scrollRef.current;
    if (!follows || box === null || position === undefined || position === stands.current?.position) return;
    stands.current = { position, visible: stands.current?.visible ?? 0 };
    box.scrollTop = position * measured.current.rowHeight;
    // Where the box really is now: a list not yet as tall as it will be stops short.
    told.current = { position, rowHeight: measured.current.rowHeight, top: box.scrollTop };
  }, [follows, position]);
  const space = useMemo<RowSpace>(
    () => ({ above: shown.above, below: shown.below, columns: Math.max(1, columns.length) }),
    [shown.above, shown.below, columns.length],
  );

  // A windowed list never appends: its slice is replaced.
  const hasMore = !windowed && total !== undefined && rows.length < total;
  // The rows a `more` was emitted for: the same rows never ask twice.
  const asked = useRef<TableRow[] | undefined>(undefined);
  useEffect(() => {
    if (looks === 0 || loading || !hasMore || asked.current === rows) return;
    if (!inView(scrollRef.current, endRef.current)) return;
    asked.current = rows;
    emit("more", { offset: rows.length });
  }, [looks, loading, hasMore, rows, emit]);

  const status =
    total === undefined ? `${rows.length} rows` : windowed ? `${total} rows` : `${rows.length} of ${total}`;

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
    offset,
    total,
    status,
    window: `${shown.start}-${shown.end}`,
  };
}
