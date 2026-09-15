/**
 * gridstack renderer — the library owns the item DOM; each cell's content
 * (chrome + widget) is portalled into the content element it created.
 * Render-only: logic in useGridstack.
 */
import { createPortal } from "react-dom";
import type { LayoutRendererProps } from "@wirework/react";
import type { GridstackPage, GridstackPlacements } from "./schema";
import { useGridstack } from "./useGridstack";

export function GridstackView({
  template,
  cellById,
  editable,
  onChange,
  renderCell,
  renderChrome,
}: LayoutRendererProps<GridstackPage, GridstackPlacements>) {
  const { containerRef, slots } = useGridstack(template, editable, onChange);

  return (
    <div className="ww-gridstack" data-testid="grid">
      <div ref={containerRef} className="grid-stack" />
      {template.cells.map((gridCell) => {
        const slot = slots.get(gridCell.id);
        const cell = cellById(gridCell.id);
        if (!slot) return null;
        return createPortal(
          <div
            className="ww-grid-item"
            data-testid="grid-item"
            data-cell={gridCell.id}
            data-x={gridCell.x}
            data-y={gridCell.y}
            data-w={gridCell.w}
            data-h={gridCell.h}
          >
            {editable ? (
              <div className="ww-grid-handle" data-testid="grid-handle">
                <span className="ww-grid-handle-label">{gridCell.id}</span>
                {cell ? renderChrome?.(cell) : null}
              </div>
            ) : null}
            {cell ? renderCell(cell) : null}
          </div>,
          slot,
          gridCell.id,
        );
      })}
    </div>
  );
}
