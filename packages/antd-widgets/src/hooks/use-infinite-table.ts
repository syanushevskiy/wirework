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
 *    slice's rows in it render, and `window` is emitted AHEAD OF TIME —
 *    when the window passed three quarters of the slice, for the batch
 *    after it (or before it), so the user scrolls into rows already held —
 *    or, when the window left the slice (a jump), for a slice around it;
 *    `more` never.
 *  - POSITION (the port, when bound): the first row in view is emitted as
 *    the box scrolls (`position-changed`), and a position written by
 *    something else scrolls the box there.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { TableProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { useAfterMount, usePort } from "@wirework/react";
import type { HeightMode, TableRow } from "@wirework/widget-contracts";
import type { InfiniteTableEvents } from "../widgets/antd-infinite-table";
import { SPACED_BODY, type RowSpace } from "../widgets/row-spacers";
import { useCellSelection } from "./use-cell-selection";
import { useTableToolbar, type TableToolbarItems } from "./use-table-toolbar";
import { headingOf, rowPosition, sliceRequest, sliceWindow, type Heading, type SliceRequest } from "../row-window";
import { useFillHeight } from "./use-fill-height";
import { useRowWindow } from "./use-row-window";
import type { TableCellRenderers } from "./use-table-cell";
import { useRowActions, type TableRowActions } from "./use-row-actions";
import {
  useColumnsWithActions,
  useMenuColumns,
  type TablePaths,
  type TablePorts,
  type TableSettings,
  type TableView,
} from "./use-table";
import { useTableHeaders } from "./use-table-headers";
import { useToolbarFilters } from "./use-toolbar-filters";
import { NO_ROWS, useRenderedRows, useRowProps, useTableColumns, type RenderedRow } from "./use-table-rows";

/** The scroll box's height, one of the three ways a `heightMode` states it. */
export type BoxStyle = { maxHeight: number } | { height: number } | { minHeight: number };

/** What the antd Table and the box around it are given (see use-table.ts on naming antd's public types). */
export interface InfiniteTableView extends TableView {
  /** The header stays in view inside the widget's own scroll box. */
  sticky: NonNullable<TableProps<RenderedRow>["sticky"]>;
  /** The table body that leaves blank space around the window, and how much (for RowSpaceProvider). */
  components: NonNullable<TableProps<RenderedRow>["components"]>;
  space: RowSpace;
  /** How tall the scroll box is, as `heightMode` reads the height: at most, exactly, what fills the window, or at least (its cell decides). */
  boxStyle: BoxStyle;
  /** The scroll box, and the end of the list inside it. */
  scrollRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  /** Rows held, rows on the server (if known), and the line that says so. */
  held: number;
  /** Where in the whole list the rows held begin (a windowed list's slice; 0 otherwise). */
  offset: number;
  total: number | undefined;
  /** The list goes on past the total: its end is not known yet. */
  open: boolean;
  status: string;
  /** The rows rendered, as "<start>-<end>" of the rows held — a fact for tests. */
  window: string;
}

/** Whether `end` lies within the visible part of `box`, or no more than `ahead` pixels under it — measured now. */
function withinReach(box: HTMLElement | null, end: HTMLElement | null, ahead: number): boolean {
  if (box === null || end === null) return false;
  const boxRect = box.getBoundingClientRect();
  const endRect = end.getBoundingClientRect();
  return endRect.top < boxRect.bottom + ahead && endRect.bottom > boxRect.top;
}

/**
 * The line under the rows. A list that goes on past its total (`open`: the
 * end not found yet) never claims a count it does not have: "800+ rows"
 * for a slice of the rows known, "200 rows, more to load" for a list that
 * holds them all.
 */
function statusOf(held: number, total: number | undefined, windowed: boolean, open: boolean): string {
  if (total === undefined) return `${held} rows`;
  if (windowed) return open && total > 0 ? `${total}+ rows` : `${total} rows`;
  return open ? `${held} rows, more to load` : `${held} of ${total}`;
}

export function useInfiniteTable(
  store: ReadableStore,
  emit: Emit<InfiniteTableEvents>,
  paths: TablePaths & {
    total?: string | undefined;
    hasMore?: string | undefined;
    offset?: string | undefined;
    position?: string | undefined;
  },
  ports: TablePorts & {
    total: PortDefinition<number>;
    hasMore: PortDefinition<boolean>;
    offset: PortDefinition<number>;
    position: PortDefinition<number>;
  },
  settings: TableSettings & {
    height: number;
    heightMode: HeightMode;
    bottomGap: number;
    windowed: boolean;
    /** Rows left when the next ones are asked for; 0 = the list's own rule (its end in view; three quarters of a slice). */
    fetchAhead: number;
  },
  cells: TableCellRenderers,
  toolbarItems: TableToolbarItems,
  rowActions: TableRowActions,
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
  const menu = useMenuColumns(store, emit, paths, ports, settings, columns);
  // WINDOWED: the rows held are a slice of the list, `offset` rows into it; the box scrolls over the whole list.
  const { windowed } = settings;
  const offset = usePort(store, paths.offset, ports.offset) ?? 0;
  // The cells selected count through the whole list: a slice that moves on keeps the selection where it was.
  const selection = useCellSelection(
    emit,
    settings.cellSelection,
    menu.columns,
    rows,
    windowed ? offset : 0,
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
    menu.pinned,
  );
  const rowProps = useRowProps(emit);
  const toolbar = useTableToolbar(emit, settings.toolbar, toolbarItems, {
    loading,
    filtered: headers.filtered,
    resetFilters: headers.resetFilters,
  });
  const filters = useToolbarFilters(store, paths.filters, ports.filters, settings.filters, headers);
  const actions = useRowActions(emit, settings.rowActions, rowActions);
  const withActions = useColumnsWithActions(headers, actions);

  // The scroll box of the widget's own; the header sticks to its top.
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sticky = useMemo<NonNullable<TableProps<RenderedRow>["sticky"]>>(
    () => ({ getContainer: () => scrollRef.current ?? window }),
    [],
  );

  // The list GOES ON past the total (a server that does not count): the total is the rows known so far.
  const open = usePort(store, paths.hasMore, ports.hasMore) === true;
  const count = windowed ? Math.max(total ?? 0, offset + rows.length) : renderedRows.length;

  // How tall the box is (doc/ADR/0021-table-height.md): at most the height, exactly it, — measured — the room down
  // to the bottom of the window, or — by CSS alone (styles.css) — what its layout cell leaves under the bar; the
  // height is then the least.
  const { height, heightMode } = settings;
  const filled = useFillHeight(scrollRef, heightMode === "fill", height, settings.bottomGap);
  const boxStyle = useMemo<BoxStyle>(() => {
    if (heightMode === "max") return { maxHeight: height };
    if (heightMode === "fill-cell") return { minHeight: height };
    return { height: filled ?? height };
  }, [heightMode, height, filled]);

  // The window: which rows of the list render — of the ones held —, and the blank space around them.
  const whole = useRowWindow(scrollRef, count, settings.height);
  const shown = useMemo(
    () => (windowed ? sliceWindow(whole, count, offset, renderedRows.length) : whole),
    [windowed, whole, count, offset, renderedRows.length],
  );
  const windowRows = useMemo(() => renderedRows.slice(shown.start, shown.end), [renderedRows, shown.start, shown.end]);

  // "Look again": the end entered or left the visible part of the box. The
  // observer's first word comes a task after the mount — and nothing is
  // asked before it: an emit from the mount's own effects would find the
  // page's reactions not bound yet (they bind in a parent's effect, which
  // runs after this one's), as `load` knows (useAfterMount).
  const [looks, setLooks] = useState(0);
  // FETCH AHEAD (the setting, in rows; 0 = the list's own rule). A list that appends looks that many rows past its
  // box for its end; the observer says "look again" when the end comes that near.
  const { fetchAhead } = settings;
  const aheadPixels = windowed ? 0 : Math.round(fetchAhead * whole.rowHeight);
  useEffect(() => {
    const box = scrollRef.current;
    const end = endRef.current;
    if (box === null || end === null || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(() => setLooks((count) => count + 1), {
      root: box,
      rootMargin: `0px 0px ${aheadPixels}px 0px`,
    });
    observer.observe(end);
    return () => observer.disconnect();
  }, [aheadPixels]);

  // What to ask for (sliceRequest): the next batch AHEAD OF TIME — the window passed three quarters of the rows
  // held (or the page's own mark, `fetchAhead` rows left), which are still the ones in view —, the batch before
  // the same way, or a slice around the window when it left the rows held. Once per set of rows and request, never
  // while loading; and a slice around the same row is not asked for twice in a row (a server with fewer rows than
  // it said would be asked for ever).
  const wanted = useRef<{ rows: TableRow[]; request: SliceRequest } | undefined>(undefined);
  const around = useRef<number | undefined>(undefined);
  /** The position the list was TOLD to stand at, the row height it was scrolled there by and where that put the box — until the user scrolls. */
  const told = useRef<{ position: number; rowHeight: number; top: number } | undefined>(undefined);
  /** Which way the box was last SCROLLED (headingOf): the page's own mark asks only for the batch on that way. */
  const moved = useRef<{ top: number; heading: Heading | undefined }>({ top: 0, heading: undefined });
  useEffect(() => {
    const top = scrollRef.current?.scrollTop ?? 0;
    moved.current = { top, heading: headingOf(moved.current.top, top, moved.current.heading) };
    if (looks === 0 || !windowed || loading || total === undefined) return;
    const request = sliceRequest({ start: whole.start, end: whole.end }, offset, rows.length, total, open, {
      rows: fetchAhead,
      heading: moved.current.heading,
    });
    if (request?.edge !== "around") around.current = undefined;
    if (request === undefined) return;
    // Told where to stand, the list is not there yet (its rows were not measured, or it was not as tall as it will
    // be): the rows it passes on the way are not where the user is — nothing is fetched ahead for them.
    // (Still where it was told to stand — the user has not scrolled since: the box is where that put it.)
    const stood = told.current;
    const untouched = stood !== undefined && Math.abs((scrollRef.current?.scrollTop ?? 0) - stood.top) <= 1;
    if (request.edge !== "around" && untouched && (stood.position < whole.start || stood.position >= whole.end)) return;
    const last = wanted.current;
    if (last?.rows === rows && last.request.offset === request.offset && last.request.edge === request.edge) return;
    if (request.edge === "around") {
      if (around.current === request.offset) return;
      around.current = request.offset;
    }
    wanted.current = { rows, request };
    emit("window", request);
  }, [looks, windowed, loading, total, open, whole.start, whole.end, offset, rows, fetchAhead, emit]);

  // WHERE THE LIST STANDS (the `position` port, when bound): the first row in view is emitted as the box scrolls —
  // a frame after the scroll, and a frame after the mount, when the page has bound its reactions — and the box
  // scrolls to the position when something else changed it.
  const positionPath = paths.position;
  const positionPort = ports.position;
  const follows = positionPath !== undefined;
  const stands = useRef<{ position: number; visible: number } | undefined>(undefined);
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
    // A box that became taller or shorter (it fills the window, its cell was resized) has other rows in view.
    const resized = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(look);
    resized?.observe(box);
    return () => {
      box.removeEventListener("scroll", look);
      resized?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
    // The list got its rows, or their height was measured: look again.
  }, [follows, count, whole.rowHeight, emit]);
  // The position is LISTENED to, not rendered from: the list writes it on every frame of a scroll, and reading it
  // as state would render the whole table again for a number it has just said itself.
  useEffect(() => {
    if (positionPath === undefined) return undefined;
    const stand = () => {
      const box = scrollRef.current;
      const position = store.getAs(positionPath, positionPort.value);
      if (box === null || position === undefined || position === stands.current?.position) return;
      stands.current = { position, visible: stands.current?.visible ?? 0 };
      box.scrollTop = position * measured.current.rowHeight;
      // Where the box really is now: a list not yet as tall as it will be stops short.
      told.current = { position, rowHeight: measured.current.rowHeight, top: box.scrollTop };
    };
    stand();
    return store.subscribe(positionPath, stand);
  }, [store, positionPath, positionPort]);
  const space = useMemo<RowSpace>(
    () => ({ above: shown.above, below: shown.below, columns: Math.max(1, withActions.columns.length) }),
    [shown.above, shown.below, withActions.columns.length],
  );

  // A windowed list never appends: its slice is replaced.
  const hasMore = !windowed && total !== undefined && (rows.length < total || open);
  // The rows a `more` was emitted for: the same rows never ask twice.
  const asked = useRef<TableRow[] | undefined>(undefined);
  useEffect(() => {
    if (looks === 0 || loading || !hasMore || asked.current === rows) return;
    if (!withinReach(scrollRef.current, endRef.current, aheadPixels)) return;
    asked.current = rows;
    emit("more", { offset: rows.length });
  }, [looks, loading, hasMore, rows, aheadPixels, emit]);

  const status = statusOf(rows.length, total, windowed, open);

  return {
    columns: withActions.columns,
    rows: windowRows,
    loading,
    rowProps,
    change: headers.change,
    columnMenu: menu.menu,
    cells: selection,
    scroll: withActions.scroll,
    toolbar,
    filters,
    sticky,
    components: SPACED_BODY,
    space,
    boxStyle,
    scrollRef,
    endRef,
    held: rows.length,
    offset,
    total,
    open,
    status,
    window: `${shown.start}-${shown.end}`,
  };
}
