/**
 * react-grid-layout renderer — cells placed on a column grid by x/y/w/h.
 * In edit mode every item grows a handle bar (drag handle + the adapter's
 * edit/remove chrome) and a resize handle; each drop/resize is reported as
 * placements-by-cell-id. Render-only: logic in useGridView.
 */
import { GridLayout, useContainerWidth, verticalCompactor } from "react-grid-layout";
import type { LayoutRendererProps } from "@wirework/react";
import type { GridPage, GridPlacements } from "./schema";
import { useGridView } from "./useGridView";

export function GridLayoutView({
  template,
  cellById,
  editable,
  onChange,
  renderCell,
  renderChrome,
}: LayoutRendererProps<GridPage, GridPlacements>) {
  const { width, containerRef, mounted } = useContainerWidth();
  const { layout, gridConfig, dragConfig, resizeConfig, handleLayoutChange } = useGridView(
    template,
    editable,
    onChange,
  );

  return (
    <div ref={containerRef} className="ww-grid-container" data-testid="grid">
      {mounted ? (
        <GridLayout
          className="ww-grid"
          width={width}
          layout={layout}
          gridConfig={gridConfig}
          dragConfig={dragConfig}
          resizeConfig={resizeConfig}
          compactor={verticalCompactor}
          onLayoutChange={handleLayoutChange}
        >
          {template.cells.map((gridCell) => {
            const cell = cellById(gridCell.id);
            return (
              // A plain element as direct child: react-grid-layout injects its
              // position style/class and ref here; data-* attributes survive.
              <div
                key={gridCell.id}
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
              </div>
            );
          })}
        </GridLayout>
      ) : null}
    </div>
  );
}
