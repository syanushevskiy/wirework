/**
 * ALL GridstackView logic lives here (guidelines: render-only components).
 *
 * gridstack owns the item DOM (it creates `.grid-stack-item` elements and
 * moves them); React renders each cell's content INTO the content element
 * gridstack hands us through its static `renderCB`, via portals. So:
 *  - one GridStack per mounted view (init once; StrictMode re-mount safe),
 *  - `load(items)` syncs items by id whenever the template's cells change,
 *  - `change` events become placements-by-id — only while editing and only
 *    when something actually moved,
 *  - `setStatic` follows edit mode; the drag handle is the chrome bar and
 *    its buttons are excluded via the `cancel` selector.
 */
import { useEffect, useRef, useState } from "react";
import { GridStack, type GridStackNode } from "gridstack";
import {
  DEFAULT_GRIDSTACK_MARGIN_PX,
  gridstackSettings,
  type GridstackPage,
  type GridstackPlacements,
} from "./schema";

export const GRIDSTACK_HANDLE_SELECTOR = ".ww-grid-handle";
export const GRIDSTACK_CANCEL_SELECTOR = ".ww-cell-action";

/** renderCB is a library-wide static: dispatch to the grid that owns the item. */
const slotHandlers = new WeakMap<GridStack, (id: string, el: HTMLElement) => void>();
GridStack.renderCB = (el, widget) => {
  const node = widget as GridStackNode;
  if (node.grid && node.id !== undefined) slotHandlers.get(node.grid)?.(node.id, el);
};

const toPlacements = (nodes: GridStackNode[]): GridstackPlacements =>
  Object.fromEntries(
    nodes.flatMap((node) =>
      node.id !== undefined &&
      node.x !== undefined &&
      node.y !== undefined &&
      node.w !== undefined &&
      node.h !== undefined
        ? [[node.id, { x: node.x, y: node.y, w: node.w, h: node.h }]]
        : [],
    ),
  );

const moved = (page: GridstackPage, placements: GridstackPlacements): boolean =>
  page.cells.some((cell) => {
    const next = placements[cell.id];
    return next !== undefined && (next.x !== cell.x || next.y !== cell.y || next.w !== cell.w || next.h !== cell.h);
  });

export function useGridstack(
  template: GridstackPage,
  editable: boolean,
  onChange?: (placements: GridstackPlacements) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridStack | null>(null);
  /** Content elements gridstack created, by cell id — the portal targets. */
  const [slots, setSlots] = useState<ReadonlyMap<string, HTMLElement>>(new Map());
  // Latest values for gridstack's callbacks without re-initialising the grid.
  const latest = useRef({ template, editable, onChange });
  useEffect(() => {
    latest.current = { template, editable, onChange };
  }, [template, editable, onChange]);

  const { cols, cellHeight } = gridstackSettings(template);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const grid = GridStack.init(
      {
        column: cols,
        cellHeight,
        margin: DEFAULT_GRIDSTACK_MARGIN_PX,
        float: false,
        animate: false,
        staticGrid: !latest.current.editable,
        draggable: { handle: GRIDSTACK_HANDLE_SELECTOR, cancel: GRIDSTACK_CANCEL_SELECTOR },
        resizable: { handles: "se" },
      },
      element,
    );
    if (!grid) return;
    gridRef.current = grid;
    slotHandlers.set(grid, (id, el) => setSlots((previous) => new Map(previous).set(id, el)));
    grid.on("removed", (_event, nodes) =>
      setSlots((previous) => {
        const next = new Map(previous);
        for (const node of nodes) if (node.id !== undefined) next.delete(node.id);
        return next;
      }),
    );
    grid.on("change", (_event, nodes) => {
      const { template: current, editable: editing, onChange: report } = latest.current;
      if (!editing || !report) return;
      const placements = toPlacements(nodes);
      if (moved(current, placements)) report(placements);
    });
    return () => {
      slotHandlers.delete(grid);
      grid.removeAll(true);
      grid.destroy(false);
      gridRef.current = null;
      setSlots(new Map());
    };
    // The grid is created once per mounted container; cols/cellHeight are
    // read at init (changing them live is out of scope for this engine).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gridRef.current?.load(
      template.cells.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
      true,
    );
  }, [template.cells]);

  useEffect(() => {
    gridRef.current?.setStatic(!editable);
  }, [editable]);

  return { containerRef, slots };
}
