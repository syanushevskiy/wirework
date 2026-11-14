/**
 * The TIP of a cut cell (both tables): a cell is one line, and one whose
 * text does not fit its column ends in an ellipsis — the pointer over it
 * shows the value whole, above the cell. Only a cell that IS cut has a tip:
 * measured when the pointer enters it, never per cell while rendering.
 *
 * One pair of handlers on the table's root, as the cell selection has: a
 * body cell says its value as `data-tip` (use-table-rows.ts).
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

/** Under this many pixels from the window's top the tip has no room above the cell: it goes below. */
const ROOM_ABOVE = 48;

export interface CellTip {
  text: string;
  /** The point of the window the tip hangs at: the middle of the cell's top edge, or of its bottom edge when `below`. */
  x: number;
  y: number;
  below: boolean;
}

export interface CellTipView {
  /** For the table's root. */
  root: {
    onPointerOver?: (event: PointerEvent<HTMLElement>) => void;
    onPointerLeave?: () => void;
  };
  tip: CellTip | undefined;
}

const NO_HANDLERS: CellTipView["root"] = {};

/** The tip of `cell`, when it has a value and its content is wider than itself. */
function tipOf(cell: Element | null): CellTip | undefined {
  if (!(cell instanceof HTMLElement) || cell.scrollWidth <= cell.clientWidth) return undefined;
  const text = cell.dataset["tip"] ?? "";
  if (text === "") return undefined;
  const rect = cell.getBoundingClientRect();
  const below = rect.top < ROOM_ABOVE;
  return { text, x: rect.left + rect.width / 2, y: below ? rect.bottom : rect.top, below };
}

export function useCellTip(enabled: boolean): CellTipView {
  const [tip, setTip] = useState<CellTip>();
  /** The cell the pointer is over: the same cell is not measured twice. */
  const over = useRef<Element | null>(null);

  const onPointerOver = useCallback((event: PointerEvent<HTMLElement>) => {
    const cell = (event.target as Element).closest("td[data-tip]");
    if (cell === over.current) return;
    over.current = cell;
    setTip(tipOf(cell));
  }, []);

  const hide = useCallback(() => {
    over.current = null;
    setTip(undefined);
  }, []);

  // Anything scrolling moves the cell from under its tip: the tip goes, and the next cell entered shows its own.
  const shown = tip !== undefined;
  useEffect(() => {
    if (!shown) return undefined;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [shown, hide]);

  if (!enabled) return { root: NO_HANDLERS, tip: undefined };
  return { root: { onPointerOver, onPointerLeave: hide }, tip };
}
