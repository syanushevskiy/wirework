/**
 * ALL FlexRowsView logic: the id of the view's datalist of class names, the
 * two typed changes edit mode reports — a cell's classes, a row's classes —
 * and the drag that moves a cell (useFlexRowsDrag), with what each cell and
 * each strip between rows shows while it lasts.
 */
import { useCallback, useId, type RefObject } from "react";
import type { DropSide, FlexRowsChange, FlexRowsPage } from "./schema";
import { useFlexRowsDrag } from "./useFlexRowsDrag";

export function useFlexRowsView(
  template: FlexRowsPage,
  onChange: ((change: FlexRowsChange) => void) | undefined,
  /** The view's root, whose cells and strips the drag measures. */
  root: RefObject<HTMLElement | null>,
) {
  const listId = useId();
  const setCellClasses = useCallback(
    (id: string, classes: string) => onChange?.({ kind: "cell", id, classes }),
    [onChange],
  );
  const setRowClasses = useCallback(
    (row: number, classes: string) => onChange?.({ kind: "row", row, classes }),
    [onChange],
  );
  const drag = useFlexRowsDrag(root, template, onChange);
  /** What a drop now would do to this cell: the dragged one goes before it, after it, or the two swap. */
  const dropOn = (id: string): DropSide | undefined =>
    drag.drop?.on === "cell" && drag.drop.id === id ? drag.drop.side : undefined;
  /** Whether a drop now would make a new row at this strip. */
  const dropInto = (row: number): boolean => drag.drop?.on === "gap" && drag.drop.row === row;
  return { listId, setCellClasses, setRowClasses, drag, dropOn, dropInto };
}
