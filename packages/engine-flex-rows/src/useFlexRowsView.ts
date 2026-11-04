/**
 * ALL FlexRowsView logic: the id of the view's datalist of class names and
 * the three changes edit mode reports — a cell's classes, a row's classes,
 * a cell moved by an arrow (operations.ts says where).
 */
import { useCallback, useId } from "react";
import { moveTarget } from "./operations";
import type { FlexRowsChange, FlexRowsPage, MoveDirection } from "./schema";

export function useFlexRowsView(template: FlexRowsPage, onChange: ((change: FlexRowsChange) => void) | undefined) {
  const listId = useId();
  const setCellClasses = useCallback(
    (id: string, classes: string) => onChange?.({ kind: "cell", id, classes }),
    [onChange],
  );
  const setRowClasses = useCallback(
    (row: number, classes: string) => onChange?.({ kind: "row", row, classes }),
    [onChange],
  );
  const move = useCallback(
    (id: string, direction: MoveDirection) => {
      const change = moveTarget(template, id, direction);
      if (change) onChange?.(change);
    },
    [template, onChange],
  );
  return { listId, setCellClasses, setRowClasses, move };
}
