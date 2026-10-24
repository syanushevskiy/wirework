/**
 * The WINDOW of rows an infinite table renders (doc/row-window-design.md):
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
}

export interface RowWindow {
  /** The rows rendered: `rows.slice(start, end)`. */
  start: number;
  end: number;
  /** Blank space above and below them, px. */
  above: number;
  below: number;
}

/** Rows that fit the box — at least one, so a box with no height yet still shows something to measure. */
const visibleRows = (boxHeight: number, rowHeight: number): number =>
  Math.max(1, Math.ceil(Math.max(0, boxHeight) / Math.max(1, rowHeight)));

export function rowWindow({ scrollTop, boxHeight, rowHeight, count }: RowWindowInput): RowWindow {
  const height = Math.max(1, rowHeight);
  const visible = visibleRows(boxHeight, height);
  const size = 2 * visible;
  const first = Math.floor(Math.max(0, scrollTop) / height);
  const end = Math.min(count, Math.max(0, first - Math.floor(visible / 2)) + size);
  // The end of the list fills the window backwards, so the last rows never render alone.
  const start = Math.max(0, end - size);
  return { start, end, above: start * height, below: (count - end) * height };
}

export const sameRowWindow = (a: RowWindow, b: RowWindow): boolean =>
  a.start === b.start && a.end === b.end && a.above === b.above && a.below === b.below;
