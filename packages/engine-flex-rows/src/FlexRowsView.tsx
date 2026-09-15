/**
 * flex-rows renderer — rows of cells with responsive width tokens. No
 * interactive editing (no change payload); edit-mode chrome still appears
 * above each cell so cells can be edited/removed. Render-only.
 */
import type { LayoutRendererProps } from "@wirework/react";
import type { FlexRowsPage } from "./schema";
import { widthStyle } from "./width";

export function FlexRowsView({
  template,
  cellById,
  renderCell,
  renderChrome,
}: LayoutRendererProps<FlexRowsPage, undefined>) {
  return (
    <>
      {template.rows.map((row, rowIndex) => (
        // Positional row key is deliberate: rows have no identity of their
        // own; cells inside carry stable ids and survive row re-keying.
        <div className="ww-row" data-testid="row" key={rowIndex}>
          {row.map((flexCell) => {
            const cell = cellById(flexCell.id);
            return (
              <div
                key={flexCell.id}
                className="ww-flex-item"
                data-testid="flex-item"
                data-cell={flexCell.id}
                data-width={flexCell.width}
                style={{ ...widthStyle(flexCell.width), height: flexCell.height }}
              >
                {cell ? renderChrome?.(cell) : null}
                {cell ? renderCell(cell) : null}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
