/**
 * The WINDOW of rows an infinite table renders (doc/ADR/0007-row-window-and-header-filters.md):
 * the rows around the visible part of its scroll box, twice the box's
 * height in all — half a box above the first visible row, the box itself,
 * and what is left below — so a list of thousands renders a few dozen
 * `tr`s, and the rows outside the window are blank space of their height,
 * which keeps the scrollbar and the end of the list where every row
 * rendered would put them. Pure arithmetic; measuring is the hook's job.
 */

export interface RowWindowInput {
  /** How far the box is scrolled, px. */
  scrollTop: number;
  /** The visible height of the box, px. */
  boxHeight: number;
  /** The height of one row, px — measured, or the implementation's guess until it can. */
  rowHeight: number;
  /** The rows held. */
  count: number;
  /**
   * Which way the box is being scrolled, when known: the window then keeps
   * most of its spare rows AHEAD of the view — below it going down, above it
   * going up — so it serves for longer before it is made again. Without it,
   * half a box above and what is left below.
   */
  heading?: Heading | undefined;
}

export interface RowWindow {
  /** The rows rendered: `rows.slice(start, end)`. */
  start: number;
  end: number;
  /** Blank space above and below them, px. */
  above: number;
  below: number;
  /** The row height the window was made with, px. */
  rowHeight: number;
}

/**
 * The window over a list of which only a SLICE is held (a windowed infinite
 * table: `offset` rows before the ones held): the rows of the slice that
 * fall into the window, as `held.slice(start, end)`, with the blank space
 * that stands in for everything else — the rows before and after the
 * window AND the part of the window the slice does not cover — so the
 * scrollbar is that of the whole list.
 */
export function sliceWindow(shown: RowWindow, count: number, offset: number, held: number): RowWindow {
  const { rowHeight } = shown;
  const from = Math.min(Math.max(shown.start, offset), offset + held);
  const to = Math.min(Math.max(shown.end, from), offset + held);
  return {
    start: from - offset,
    end: to - offset,
    above: from * rowHeight,
    below: Math.max(0, count - to) * rowHeight,
    rowHeight,
  };
}

/** Which rows a windowed list asks for: the batch AFTER the ones held, the one BEFORE them, or a slice AROUND a row. */
export type SliceEdge = "after" | "before" | "around";

/** What a windowed list's `window` event carries. */
export interface SliceRequest {
  /**
   * `after`: the row after the last one held (where the next batch begins);
   * `before`: the first row held (where the batch before ends); `around`:
   * the first row the window shows.
   */
  offset: number;
  edge: SliceEdge;
}

/** Which way a list is being scrolled. */
export type Heading = "down" | "up";

/**
 * The way a box scrolled from `from` to `to` (px) — and the way it was
 * heading `before` when it did not move: a box made taller, or rows measured
 * again, remake the row window without anybody scrolling.
 */
export const headingOf = (from: number, to: number, before: Heading | undefined): Heading | undefined =>
  to === from ? before : to > from ? "down" : "up";

/** The page's own mark for asking ahead of time: how many rows held may be left beyond the window, and where it is heading. */
export interface AheadMark {
  rows: number;
  heading?: Heading | undefined;
}

/** The SHARE of the rows held the window may pass before the next batch is asked for — ahead of time (no mark of the page's). */
export const FETCH_AHEAD_SHARE = 0.75;

/**
 * How many windows the rows held must exceed for a batch to be asked for
 * ahead of time. Six: with three batches kept, the window that asked for a
 * fourth stands a batch and a quarter into the trimmed slice, and must end
 * up clear of its first quarter — it does while it is shorter than half a
 * batch, a sixth of the three held.
 */
export const AHEAD_WINDOWS = 6;

/**
 * What a windowed list should ask for, given the rows its window shows
 * (`view`, in the whole list) and the slice it holds (`held` rows from
 * `offset`) — or nothing:
 *
 *  - the window is not wholly inside the slice (a jump, a filter, a scroll
 *    faster than the server): a slice AROUND it, replacing the one held;
 *  - the window passed three quarters of the slice and the list goes on:
 *    the batch AFTER, while the rows in view are still held — the user
 *    scrolls into rows that are already there;
 *  - the same towards the start: the batch BEFORE.
 *
 * A list that GOES ON past its `total` (`hasMore`: the total is the rows
 * known so far, the end not found yet) asks for the batch after even when
 * it holds the last row known — and, its window AT that row, whatever the
 * rules of asking ahead say: there is nothing further to scroll into.
 *
 * With `ahead` (the `fetchAhead` setting: a number of ROWS) the marks are
 * the page's instead of the quarters: the batch after is asked for once no
 * more than that many rows held are left beyond the window, the batch
 * before the same way towards the start — and each only on the way THERE
 * (`heading`; the batch after also before the list was ever scrolled), because a
 * page's marks may cross: a batch that joined must not put the window past
 * the opposite mark and be asked back, for ever. Nothing is asked ahead of
 * time while the rows held are no more than the mark and the window
 * together — a batch too small for it.
 */
export function sliceRequest(
  view: { start: number; end: number },
  offset: number,
  held: number,
  total: number,
  hasMore = false,
  ahead?: AheadMark,
): SliceRequest | undefined {
  if (total <= 0) return undefined;
  const end = offset + held;
  if (held === 0 || view.start < offset || view.end > end) return { offset: view.start, edge: "around" };
  // The window reached the last row KNOWN of a list that goes on: there is nothing to scroll into, so the window
  // can never leave the rows held and ask that way — the batch after is asked for here, whatever the rules below
  // say of a batch too small to be fetched ahead (a tall box: two hundred rows are fewer than six windows of it).
  if (hasMore && end >= total && view.end >= end) return { offset: end, edge: "after" };
  const goesOn = end < total || hasMore;
  if (ahead !== undefined && ahead.rows > 0) {
    if (held <= ahead.rows + (view.end - view.start)) return undefined;
    if (ahead.heading === "up") {
      return offset > 0 && view.start - offset <= ahead.rows ? { offset, edge: "before" } : undefined;
    }
    return goesOn && end - view.end <= ahead.rows ? { offset: end, edge: "after" } : undefined;
  }
  // Too few rows held for the window (a small batch in a tall box): a batch joining them would put the window
  // past the opposite mark at once, and the two would be asked for in turn, for ever. Such a list waits until
  // the window leaves its rows.
  if (held <= AHEAD_WINDOWS * (view.end - view.start)) return undefined;
  if (goesOn && view.end >= offset + Math.ceil(held * FETCH_AHEAD_SHARE)) return { offset: end, edge: "after" };
  if (offset > 0 && view.start <= offset + Math.floor(held * (1 - FETCH_AHEAD_SHARE)))
    return { offset, edge: "before" };
  return undefined;
}

/** The first row in view and how many fit the box — where a list STANDS; `rowHeight` as measured. */
export function rowPosition(
  scrollTop: number,
  boxHeight: number,
  rowHeight: number,
  count: number,
): { position: number; visible: number } {
  const height = Math.max(1, rowHeight);
  const visible = Math.min(count, visibleRows(boxHeight, height));
  // Half a pixel of slack: a box scrolled TO a row by arithmetic may land a hair above it.
  const position = Math.min(Math.max(0, count - visible), Math.floor((Math.max(0, scrollTop) + 0.5) / height));
  return { position, visible };
}

/** Rows that fit the box — at least one, so a box with no height yet still shows something to measure. */
const visibleRows = (boxHeight: number, rowHeight: number): number =>
  Math.max(1, Math.ceil(Math.max(0, boxHeight) / Math.max(1, rowHeight)));

export function rowWindow({ scrollTop, boxHeight, rowHeight, count, heading }: RowWindowInput): RowWindow {
  const height = Math.max(1, rowHeight);
  const visible = visibleRows(boxHeight, height);
  const size = 2 * visible;
  const first = Math.floor(Math.max(0, scrollTop) / height);
  // The rows kept above the first one in view: one going down (the rest wait below), all but the view and two
  // going up (one below the view, one for a row cut by the box's edge), half a box when the way is not known.
  const lead = heading === "down" ? 1 : heading === "up" ? Math.max(1, size - visible - 2) : Math.floor(visible / 2);
  const end = Math.min(count, Math.max(0, first - lead) + size);
  // The end of the list fills the window backwards, so the last rows never render alone.
  const start = Math.max(0, end - size);
  return { start, end, above: start * height, below: (count - end) * height, rowHeight: height };
}

/**
 * Whether a window made earlier still SERVES a box scrolled since: the rows
 * in view lie inside it with a row to spare on either side (none where the
 * window already reaches the list's end). While it does, the same rows stay
 * rendered — the window is made again only when the view nears its edge,
 * about every half a box of scrolling, not at every row: a table rendered
 * again for each row scrolled past cannot keep up with the wheel.
 */
export function windowServes(shown: RowWindow, { scrollTop, boxHeight, rowHeight, count }: RowWindowInput): boolean {
  if (shown.rowHeight !== Math.max(1, rowHeight)) return false;
  const first = Math.floor(Math.max(0, scrollTop) / shown.rowHeight);
  const last = Math.ceil((Math.max(0, scrollTop) + Math.max(0, boxHeight)) / shown.rowHeight);
  const spareAbove = shown.start > 0 ? 1 : 0;
  const spareBelow = shown.end < count ? 1 : 0;
  return first >= shown.start + spareAbove && last <= shown.end - spareBelow;
}

export const sameRowWindow = (a: RowWindow, b: RowWindow): boolean =>
  a.start === b.start && a.end === b.end && a.above === b.above && a.below === b.below && a.rowHeight === b.rowHeight;
