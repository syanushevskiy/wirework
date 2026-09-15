/**
 * ALL GridLayoutView logic lives here (guidelines: render-only components).
 * Maps the validated grid template to react-grid-layout's props and turns
 * its layout callbacks into placements-by-cell-id — only while editing, and
 * only when something actually moved (react-grid-layout echoes the current
 * layout on mount and on every prop sync). The drag handle is the chrome
 * bar; buttons inside it are excluded via the `cancel` selector.
 */
import { useCallback, useMemo } from "react";
import type { Layout } from "react-grid-layout";
import { gridSettings, type GridPage, type GridPlacements } from "./schema";

export const GRID_HANDLE_SELECTOR = ".ww-grid-handle";
/** Anything inside the handle that must NOT start a drag (the action buttons). */
export const GRID_CANCEL_SELECTOR = ".ww-cell-action";

const toPlacements = (layout: Layout): GridPlacements =>
  Object.fromEntries(layout.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]));

const samePlacements = (layout: Layout, placements: GridPlacements): boolean =>
  layout.every(({ i, x, y, w, h }) => {
    const p = placements[i];
    return p !== undefined && p.x === x && p.y === y && p.w === w && p.h === h;
  });

export function useGridView(
  template: GridPage,
  editable: boolean,
  onChange?: (placements: GridPlacements) => void,
) {
  const layout = useMemo<Layout>(
    () => template.cells.map(({ id, x, y, w, h }) => ({ i: id, x, y, w, h })),
    [template.cells],
  );
  const { cols, rowHeight } = gridSettings(template);
  const gridConfig = useMemo(() => ({ cols, rowHeight }), [cols, rowHeight]);
  const dragConfig = useMemo(
    () => ({ enabled: editable, handle: GRID_HANDLE_SELECTOR, cancel: GRID_CANCEL_SELECTOR }),
    [editable],
  );
  const resizeConfig = useMemo(() => ({ enabled: editable }), [editable]);

  const handleLayoutChange = useCallback(
    (next: Layout) => {
      if (!editable || !onChange) return;
      const placements = toPlacements(next);
      if (samePlacements(layout, placements)) return;
      onChange(placements);
    },
    [editable, onChange, layout],
  );

  return { layout, gridConfig, dragConfig, resizeConfig, handleLayoutChange };
}
