/**
 * The DRAG of edit mode (doc/ADR/0010-flex-rows.md, "Moved by drag and
 * drop"): a cell taken by its handle and let go on another cell — its
 * middle swaps the two, its left or right quarter puts the dragged one
 * before or after it — or on the strip between two rows, where it takes a
 * new row of its own. The cells and the strips are measured once when the
 * drag starts (nothing moves while it lasts: the target is only marked),
 * every pointer move is a hit test on those rectangles, and the drop is
 * reported as ONE change (operations.ts says which).
 */
import { useCallback, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { dropChange } from "./operations";
import type { FlexDrop, FlexRowsChange, FlexRowsPage } from "./schema";

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Measured {
  cells: (Box & { id: string })[];
  rows: Box[];
  gaps: (Box & { row: number })[];
}

/** The part of a cell's width, from either side, that means "beside it" rather than "in its place". */
const EDGE = 0.25;

/** A press on one of these inside the handle is theirs: a field to type in, a button to click. */
const CONTROLS = "input, button, select, textarea, a";

const boxOf = (element: Element): Box => {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  return { left, top, right, bottom };
};

const inside = (box: Box, x: number, y: number): boolean =>
  x >= box.left && x < box.right && y >= box.top && y < box.bottom;

/** How far the point is from the box; 0 inside it. */
const away = (box: Box, x: number, y: number): number =>
  Math.hypot(Math.max(box.left - x, 0, x - box.right), Math.max(box.top - y, 0, y - box.bottom));

function measure(root: HTMLElement | null): Measured {
  if (root === null) return { cells: [], rows: [], gaps: [] };
  // A card inside a cell may run on flex rows too: only this view's own rows, cells and strips count.
  const own = (testId: string): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`)).filter(
      (element) => element.closest('[data-testid="flex-rows"]') === root,
    );
  return {
    cells: own("flex-item").map((element) => ({ ...boxOf(element), id: element.dataset["cell"] ?? "" })),
    rows: own("row").map(boxOf),
    gaps: own("flex-row-drop").map((element) => ({ ...boxOf(element), row: Number(element.dataset["row"]) })),
  };
}

/** Where the pointer is: a strip between rows, a cell (and which part of it), or — in a row's free room — beside the nearest cell. */
function dropAt(measured: Measured, x: number, y: number): FlexDrop | undefined {
  const gap = measured.gaps.find((box) => inside(box, x, y));
  if (gap !== undefined) return { on: "gap", row: gap.row };
  const cell = measured.cells.find((box) => inside(box, x, y));
  if (cell !== undefined) {
    const part = (x - cell.left) / Math.max(1, cell.right - cell.left);
    return { on: "cell", id: cell.id, side: part < EDGE ? "before" : part > 1 - EDGE ? "after" : "swap" };
  }
  const row = measured.rows.find((box) => inside(box, x, y));
  if (row === undefined) return undefined;
  const near = measured.cells
    .filter((box) => inside(row, (box.left + box.right) / 2, (box.top + box.bottom) / 2))
    .reduce<(Box & { id: string }) | undefined>(
      (best, box) => (best === undefined || away(box, x, y) < away(best, x, y) ? box : best),
      undefined,
    );
  return near === undefined
    ? undefined
    : { on: "cell", id: near.id, side: x < (near.left + near.right) / 2 ? "before" : "after" };
}

export function useFlexRowsDrag(
  root: RefObject<HTMLElement | null>,
  template: FlexRowsPage,
  onChange: ((change: FlexRowsChange) => void) | undefined,
) {
  const [dragging, setDragging] = useState<string | undefined>(undefined);
  const [drop, setDrop] = useState<FlexDrop | undefined>(undefined);

  const start = useCallback(
    (id: string, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || (event.target instanceof Element && event.target.closest(CONTROLS) !== null)) return;
      event.preventDefault();
      const measured = measure(root.current);
      /** The drop under the pointer, when letting go there would change something. */
      const over = (x: number, y: number): { drop: FlexDrop; change: FlexRowsChange } | undefined => {
        const target = dropAt(measured, x, y);
        const change = target === undefined ? undefined : dropChange(template, id, target);
        return target === undefined || change === undefined ? undefined : { drop: target, change };
      };
      const move = (e: PointerEvent) => setDrop(over(e.clientX, e.clientY)?.drop);
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        setDragging(undefined);
        setDrop(undefined);
        const target = e.type === "pointerup" ? over(e.clientX, e.clientY) : undefined;
        if (target !== undefined) onChange?.(target.change);
      };
      setDragging(id);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [root, template, onChange],
  );

  return { start, dragging, drop };
}
