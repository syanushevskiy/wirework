/**
 * The infinite table's ROW WINDOW (doc/ADR/0007-row-window-and-header-filters.md): `rowWindow`
 * decides which rows render; this hook MEASURES what it needs — how far the
 * box is scrolled, its visible height, the average height of the rows on
 * screen — and looks again whenever the box scrolls or resizes, the rows
 * change, or a measurement does. The window is DERIVED in render from the
 * measurements and the row count — never state that lags a frame behind:
 * a frame rendering no rows because the count changed first would bring
 * the end of the list into view and ask the server for more. The
 * measurements are replaced only when the window in place no longer SERVES
 * the box (`windowServes`: the rows in view near its edge) — about every
 * half a box of scrolling, so a row scrolled past re-renders nothing.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { rowWindow, sameRowWindow, windowServes, type RowWindow } from "../row-window";

/** antd's small table row — two 8 px paddings, a 22 px line, a 1 px border — the guess until rows are measured. */
const SMALL_ROW_HEIGHT = 39;
/** A rendered row (antd puts the key on every body row; the spacer rows have none). */
const ROW = "tr[data-row-key]";

interface Measure {
  scrollTop: number;
  boxHeight: number;
  rowHeight: number;
  heading?: "down" | "up" | undefined;
}

export function useRowWindow(scrollRef: RefObject<HTMLElement | null>, count: number, height: number): RowWindow {
  // Before the box exists its height is the setting's.
  const [measure, setMeasure] = useState<Measure>({ scrollTop: 0, boxHeight: height, rowHeight: SMALL_ROW_HEIGHT });
  const shown = useMemo(() => rowWindow({ ...measure, count }), [measure, count]);

  // What a look needs that is not on the box, kept current without re-subscribing.
  const latest = useRef({ rowHeight: SMALL_ROW_HEIGHT, count, height });

  const look = useCallback(() => {
    const box = scrollRef.current;
    if (box === null) return;
    const { rowHeight, count, height } = latest.current;
    setMeasure((current) => {
      const boxHeight = box.clientHeight === 0 ? height : box.clientHeight;
      const moved = box.scrollTop - current.scrollTop;
      const next: Measure = {
        scrollTop: box.scrollTop,
        boxHeight,
        rowHeight,
        // Scrolled on by less than a box: the new window keeps its spare rows on the side the view is heading to.
        // A jump (the list told where to stand, the scrollbar dragged far) has no heading.
        heading: moved === 0 || Math.abs(moved) > boxHeight ? undefined : moved > 0 ? "down" : "up",
      };
      // The window in place still holds the rows in view, with a row to spare: it stays, and nothing renders. It is
      // made again when the view nears its edge — or the box or the rows changed size.
      const shown = rowWindow({ ...current, count });
      if (current.boxHeight === next.boxHeight && windowServes(shown, { ...next, count })) return current;
      return sameRowWindow(shown, rowWindow({ ...next, count })) ? current : next;
    });
  }, [scrollRef]);

  // The rows changed (more came, a filter replaced them) or the setting did: the
  // window already follows the count; this look catches a box that was scrolled meanwhile.
  useEffect(() => {
    latest.current.count = count;
    latest.current.height = height;
    look();
  }, [count, height, look]);

  // The box scrolled or was resized (a grid cell dragged wider or taller).
  useEffect(() => {
    const box = scrollRef.current;
    if (box === null) return undefined;
    box.addEventListener("scroll", look, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(look);
    observer?.observe(box);
    return () => {
      box.removeEventListener("scroll", look);
      observer?.disconnect();
    };
  }, [scrollRef, look]);

  // After every render: the rows on screen say how tall a row is. A change
  // worth a pixel moves the window; the same height leaves it alone.
  useLayoutEffect(() => {
    const rows = scrollRef.current?.querySelectorAll<HTMLElement>(ROW) ?? [];
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (first === undefined || last === undefined) return;
    const rowHeight = (last.getBoundingClientRect().bottom - first.getBoundingClientRect().top) / rows.length;
    if (rowHeight <= 0 || Math.abs(rowHeight - latest.current.rowHeight) < 0.5) return;
    latest.current.rowHeight = rowHeight;
    look();
  });

  return shown;
}
