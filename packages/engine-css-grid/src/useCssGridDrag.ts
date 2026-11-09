/**
 * The DRAG of edit mode (doc/css-grid-design.md, "Drag and drop"): a cell
 * moved by its handle or resized by its corner over the grid's own ghost
 * slots. The ghosts are measured once when a drag starts — the browser laid
 * them out on the real tracks — and every move is a hit test on those
 * rectangles; the trailing "+" slots are ghosts too, so a drop past the
 * edge grows the picture. The drag computes a PICTURE and reports it (never
 * a pixel); a drop on slots another cell holds is refused with the reason.
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { holderIn, placed, spanOf } from "./areas";
import type { Span } from "./schema";

export type DragMode = "move" | "resize";

interface Measured {
  row: number;
  column: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Dragging {
  id: string;
  mode: DragMode;
  span: Span;
  /** The grabbed slot's offset from the span's top-left (a move keeps it under the pointer). */
  dr: number;
  dc: number;
  slots: Measured[];
}

export interface Refusal {
  span: Span;
  holder: { row: number; column: number; id: string };
}

const slotAt = (slots: readonly Measured[], x: number, y: number): Measured | undefined =>
  slots.find((slot) => x >= slot.left && x < slot.right && y >= slot.top && y < slot.bottom);

const measure = (root: HTMLElement | null): Measured[] =>
  Array.from(root?.querySelectorAll<HTMLElement>('[data-testid="css-grid-ghost"]') ?? []).map((ghost) => {
    const rect = ghost.getBoundingClientRect();
    return {
      row: Number(ghost.dataset["row"]),
      column: Number(ghost.dataset["column"]),
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    };
  });

/** Where the dragged rectangle would land with the pointer over `slot`. */
const targetOf = ({ mode, span, dr, dc }: Dragging, slot: Measured): Span =>
  mode === "move"
    ? {
        r1: Math.max(0, slot.row - dr),
        c1: Math.max(0, slot.column - dc),
        r2: Math.max(0, slot.row - dr) + (span.r2 - span.r1),
        c2: Math.max(0, slot.column - dc) + (span.c2 - span.c1),
      }
    : { r1: span.r1, c1: span.c1, r2: Math.max(span.r1, slot.row), c2: Math.max(span.c1, slot.column) };

export function useCssGridDrag(
  root: RefObject<HTMLElement | null>,
  tokens: readonly (readonly string[])[],
  onPicture: (tokens: string[][]) => void,
) {
  const dragging = useRef<Dragging | undefined>(undefined);
  const [hover, setHover] = useState<{ span: Span; blocked: boolean } | undefined>(undefined);
  const [refusal, setRefusal] = useState<Refusal | undefined>(undefined);

  const start = useCallback(
    (mode: DragMode, id: string, event: ReactPointerEvent<HTMLElement>) => {
      const span = spanOf(tokens, id);
      if (span === undefined || event.button !== 0) return;
      event.preventDefault();
      const slots = measure(root.current);
      const grabbed = slotAt(slots, event.clientX, event.clientY);
      const drag: Dragging = {
        id,
        mode,
        span,
        dr: grabbed === undefined ? 0 : Math.max(0, grabbed.row - span.r1),
        dc: grabbed === undefined ? 0 : Math.max(0, grabbed.column - span.c1),
        slots,
      };
      dragging.current = drag;
      setRefusal(undefined);
      const over = (x: number, y: number): Span | undefined => {
        const slot = slotAt(drag.slots, x, y);
        return slot === undefined ? undefined : targetOf(drag, slot);
      };
      const move = (e: PointerEvent) => {
        const target = over(e.clientX, e.clientY);
        setHover(
          target === undefined ? undefined : { span: target, blocked: holderIn(tokens, id, target) !== undefined },
        );
      };
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        dragging.current = undefined;
        setHover(undefined);
        const target = e.type === "pointerup" ? over(e.clientX, e.clientY) : undefined;
        if (target === undefined) return;
        const holder = holderIn(tokens, id, target);
        if (holder !== undefined) {
          setRefusal({ span: target, holder });
          return;
        }
        if (JSON.stringify(target) !== JSON.stringify(span)) onPicture(placed(tokens, id, target));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [root, tokens, onPicture],
  );

  const dismiss = useCallback(() => setRefusal(undefined), []);

  return { start, hover, refusal, dismiss };
}
