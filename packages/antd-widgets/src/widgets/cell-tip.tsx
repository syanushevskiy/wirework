/**
 * The tip of a cut cell: its value whole, above the cell the pointer is over
 * (or below it at the window's top). Outside the page, in the body — a
 * layout engine may transform the cell the table is in, and a fixed box
 * inside a transformed one is placed by that box. Render-only: logic in
 * useCellTip.
 */
import { createPortal } from "react-dom";
import type { CellTip as Tip } from "../hooks/use-cell-tip";

export function CellTip({ tip }: { tip: Tip | undefined }) {
  if (tip === undefined) return null;
  return createPortal(
    <div
      className="ww-table__tip"
      role="tooltip"
      data-testid="table-cell-tip"
      data-below={tip.below}
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}
