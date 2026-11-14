/**
 * Edit-mode chrome for one cell: the Edit and Remove actions, and for a
 * container one "Edit content" per layout it holds (doc/ADR/0009-containers.md)
 * and, where the host offers it, "Reset to original" for a layout of the
 * viewer's own inside it.
 * Engines place it (grid handle bar, flex item header, a tab header, ...);
 * every button carries `.ww-cell-action` so drag handles can exclude it,
 * and a press on a button never propagates: a layout library that starts
 * a drag or a pointer capture on the surrounding element would otherwise
 * swallow the click. Render-only.
 */
import type { PointerEvent, MouseEvent } from "react";
import { layoutsOf, type ResolvedCell } from "@wirework/engine";

const keepPress = (event: PointerEvent | MouseEvent): void => event.stopPropagation();

/** "Wrap in a card": the host names the button (it knows the container) and does the wrapping. */
export interface WrapCell {
  label: string;
  onWrap: (cellId: string) => void;
}

/**
 * "Reset to original" on a container: the host names the button and knows
 * which cells hold a layout of the viewer's own (the others have nothing to
 * reset — the button is there, disabled) and takes it away.
 */
export interface ResetLayout {
  label: string;
  /** The keys of the cells that hold a layout of their own. */
  cells: readonly string[];
  onReset: (cellId: string) => void;
}

export interface CellChromeProps {
  cell: ResolvedCell;
  onEdit?: ((cellId: string) => void) | undefined;
  onRemove?: ((cellId: string) => void) | undefined;
  /** Open the layout a container holds at `layoutPath` for editing. */
  onEditLayout?: ((cellId: string, layoutPath: string) => void) | undefined;
  wrapCell?: WrapCell | undefined;
  resetLayout?: ResetLayout | undefined;
}

export function CellChrome({ cell, onEdit, onRemove, onEditLayout, wrapCell, resetLayout }: CellChromeProps) {
  const held = cell.definition ? layoutsOf(cell.definition, cell.viewModel) : [];
  const layouts = onEditLayout ? held : [];
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
      {layouts.map(({ path }) => (
        <button
          key={path}
          type="button"
          className="ww-cell-action"
          data-testid="cell-edit-layout"
          data-cell={cell.key}
          data-layout={path}
          onPointerDown={keepPress}
          onMouseDown={keepPress}
          onClick={() => onEditLayout?.(cell.key, path)}
        >
          {layouts.length === 1 ? "Edit content" : `Edit ${path}`}
        </button>
      ))}
      {resetLayout && held.length > 0 ? (
        <button
          type="button"
          className="ww-cell-action"
          data-testid="cell-reset-layout"
          data-cell={cell.key}
          disabled={!resetLayout.cells.includes(cell.key)}
          onPointerDown={keepPress}
          onMouseDown={keepPress}
          onClick={() => resetLayout.onReset(cell.key)}
        >
          {resetLayout.label}
        </button>
      ) : null}
      {wrapCell ? (
        <button
          type="button"
          className="ww-cell-action"
          data-testid="cell-wrap"
          data-cell={cell.key}
          onPointerDown={keepPress}
          onMouseDown={keepPress}
          onClick={() => wrapCell.onWrap(cell.key)}
        >
          {wrapCell.label}
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
