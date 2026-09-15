/**
 * Edit-mode chrome for one cell: the Edit and Remove actions. Engines place
 * it (grid handle bar, flex item header, a tab header, ...); every button
 * carries `.ww-cell-action` so drag handles can exclude it, and a press on
 * a button never propagates: a layout library that starts a drag or a
 * pointer capture on the surrounding element would otherwise swallow the
 * click. Render-only.
 */
import type { PointerEvent, MouseEvent } from "react";
import type { ResolvedCell } from "@wirework/engine";

const keepPress = (event: PointerEvent | MouseEvent): void => event.stopPropagation();

export interface CellChromeProps {
  cell: ResolvedCell;
  onEdit?: (cellId: string) => void;
  onRemove?: (cellId: string) => void;
}

export function CellChrome({ cell, onEdit, onRemove }: CellChromeProps) {
  return (
    <span className="ww-cell-actions">
      {onEdit ? (
        <button
          type="button"
          className="ww-cell-action"
          data-testid="cell-edit"
          data-cell={cell.key}
          disabled={!cell.definition || cell.viewModel === undefined}
          onPointerDown={keepPress}
          onMouseDown={keepPress}
          onClick={() => onEdit(cell.key)}
        >
          Edit
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="ww-cell-action"
          data-testid="cell-remove"
          data-cell={cell.key}
          onPointerDown={keepPress}
          onMouseDown={keepPress}
          onClick={() => onRemove(cell.key)}
        >
          Remove
        </button>
      ) : null}
    </span>
  );
}
