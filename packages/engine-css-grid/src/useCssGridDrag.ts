/**
 * The DRAG of edit mode (doc/ADR/0013-css-grid.md, "Drag and drop, amended"):
 * a cell MOVED by its handle bar — onto a free slot it goes there, onto
 * another widget the two swap places, onto the tray it leaves the grid — or
 * RESIZED by an edge or its corner, taking the slots it is pulled over from
 * whoever held them (a neighbour shrinks; one left with nothing goes to the
 * tray). The ghosts are measured once when a drag starts — the browser laid
 * them out on the real tracks — and every move is a hit test on those
 * rectangles; the trailing "+" slots are ghosts too, so a drop past the
 * edge grows the picture. The drag computes a PICTURE and reports it (never
 * a pixel), and shows it before the drop: nothing is ever refused.
 */
import { useCallback, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { claimed, cleared, dropped, resizedSpan, spanOf, unplaced, type ResizeEdge } from "./areas";
import { EMPTY, type Span } from "./schema";

/** What a drag does: move the cell, or pull one of its edges. */
export type Grip = "move" | ResizeEdge;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Measured {
  /** Every column's and every row's extent on screen, by index. */
  columns: Box[];
  rows: Box[];
  grid: Box;
  tray: Box | undefined;
}

/** What letting go now would do — shown while the drag lasts. */
export interface Drop {
  id: string;
  next: string[][];
  /** The slots the cell would fill; none when it is headed for the tray. */
  span: Span | undefined;
  /** The widget it would swap places with. */
  swap: string | undefined;
  /** The widgets that would be left with no slot. */
  out: string[];
  tray: boolean;
}

/** The pointer may miss the grid by this much and still mean its nearest slot (the gap, the outline). */
const REACH = 12;

const boxOf = (element: Element): Box => {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  return { left, top, right, bottom };
};

const inside = (box: Box, x: number, y: number, reach = 0): boolean =>
  x >= box.left - reach && x < box.right + reach && y >= box.top - reach && y < box.bottom + reach;

function measure(root: HTMLElement | null, tray: HTMLElement | null): Measured {
  const columns: Box[] = [];
  const rows: Box[] = [];
  for (const ghost of root?.querySelectorAll<HTMLElement>('[data-testid="css-grid-ghost"]') ?? []) {
    const box = boxOf(ghost);
    columns[Number(ghost.dataset["column"])] ??= box;
    rows[Number(ghost.dataset["row"])] ??= box;
  }
  return {
    columns,
    rows,
    grid: root === null ? { left: 0, top: 0, right: 0, bottom: 0 } : boxOf(root),
    tray: tray === null ? undefined : boxOf(tray),
  };
}

/** The track the coordinate is in, or the nearest one: a pointer in a gap or past the edge still means a slot. */
function nearest(tracks: readonly Box[], at: number, low: "left" | "top", high: "right" | "bottom"): number {
  let best = 0;
  let distance = Infinity;
  tracks.forEach((track, index) => {
    const away = at < track[low] ? track[low] - at : at >= track[high] ? at - track[high] : 0;
    if (away < distance) {
      best = index;
      distance = away;
    }
  });
  return best;
}

const slotAt = (measured: Measured, x: number, y: number): { row: number; column: number } => ({
  row: nearest(measured.rows, y, "top", "bottom"),
  column: nearest(measured.columns, x, "left", "right"),
});

const sameSpan = (a: Span | undefined, b: Span | undefined): boolean => JSON.stringify(a) === JSON.stringify(b);

export function useCssGridDrag(
  root: RefObject<HTMLElement | null>,
  tray: RefObject<HTMLElement | null>,
  tokens: readonly (readonly string[])[],
  cellIds: readonly string[],
  onPicture: (tokens: string[][]) => void,
) {
  const [drop, setDrop] = useState<Drop | undefined>(undefined);
  const [dragging, setDragging] = useState<string | undefined>(undefined);

  const start = useCallback(
    (grip: Grip, id: string, event: ReactPointerEvent<HTMLElement>) => {
      const span = spanOf(tokens, id);
      if (event.button !== 0 || (grip !== "move" && span === undefined)) return;
      event.preventDefault();
      const measured = measure(root.current, tray.current);
      if (measured.rows.length === 0 || measured.columns.length === 0) return;
      const grabbed = slotAt(measured, event.clientX, event.clientY);
      const grab =
        span === undefined
          ? { dr: 0, dc: 0 }
          : {
              dr: Math.min(Math.max(0, grabbed.row - span.r1), span.r2 - span.r1),
              dc: Math.min(Math.max(0, grabbed.column - span.c1), span.c2 - span.c1),
            };
      const before = unplaced(tokens, cellIds);

      const over = (x: number, y: number): Drop | undefined => {
        const onTray = grip === "move" && measured.tray !== undefined && inside(measured.tray, x, y);
        if (grip === "move" && !onTray && !inside(measured.grid, x, y, REACH)) return undefined;
        const slot = slotAt(measured, x, y);
        const next = onTray
          ? cleared(tokens, id)
          : grip === "move" || span === undefined
            ? dropped(tokens, id, slot, grab)
            : claimed(tokens, id, resizedSpan(span, grip, slot));
        const held = tokens[slot.row]?.[slot.column] ?? EMPTY;
        return {
          id,
          next,
          span: spanOf(next, id),
          swap: grip === "move" && !onTray && held !== EMPTY && held !== id ? held : undefined,
          out: unplaced(next, cellIds).filter((other) => other !== id && !before.includes(other)),
          tray: onTray,
        };
      };

      const move = (e: PointerEvent) => {
        const target = over(e.clientX, e.clientY);
        // The cell where it already is shows nothing: there is nothing to preview.
        setDrop(target === undefined || (!target.tray && sameSpan(target.span, span)) ? undefined : target);
      };
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        setDrop(undefined);
        setDragging(undefined);
        const target = e.type === "pointerup" ? over(e.clientX, e.clientY) : undefined;
        if (target !== undefined && JSON.stringify(target.next) !== JSON.stringify(tokens)) onPicture(target.next);
      };
      setDragging(id);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [root, tray, tokens, cellIds, onPicture],
  );

  return { start, drop, dragging };
}
