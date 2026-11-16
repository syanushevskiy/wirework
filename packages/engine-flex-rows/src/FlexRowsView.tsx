/**
 * flex-rows renderer — rows of cells, each row a flexbox, a row's and a
 * cell's Tailwind layout classes as their style (classes.ts). In edit mode
 * every row grows a bar with a field for its classes, and every cell a
 * handle to DRAG it by — onto another cell to swap places with it or to go
 * beside it, onto the strip between two rows for a row of its own — with a
 * field for its classes and the adapter's chrome. Render-only: logic in
 * useFlexRowsView, the drag in useFlexRowsDrag.
 */
import { useRef } from "react";
import type { LayoutRendererProps } from "@wirework/react";
import { ClassesInput } from "./ClassesInput";
import { LAYOUT_CLASS_NAMES, growsTall, layoutStyle } from "./classes";
import type { FlexRowsChange, FlexRowsPage } from "./schema";
import { useFlexRowsView } from "./useFlexRowsView";

/** The vocabulary as the browser suggests it; static, so built once. */
const CLASS_OPTIONS = LAYOUT_CLASS_NAMES.map((name) => <option key={name} value={name} />);

export function FlexRowsView({
  template,
  cellById,
  editable,
  onChange,
  renderCell,
  renderChrome,
}: LayoutRendererProps<FlexRowsPage, FlexRowsChange>) {
  const root = useRef<HTMLDivElement | null>(null);
  const { listId, setCellClasses, setRowClasses, drag, dropOn, dropInto } = useFlexRowsView(template, onChange, root);

  /** The strip before row `row` (after the last one, `rows.length`): a drop there makes a new row. */
  const strip = (row: number) =>
    editable ? (
      <div
        className="ww-flex-row-drop"
        data-testid="flex-row-drop"
        data-row={row}
        data-hover={dropInto(row) ? "true" : undefined}
      >
        <span>new row</span>
      </div>
    ) : null;

  return (
    <div
      ref={root}
      className="ww-flex-rows"
      data-testid="flex-rows"
      data-dragging={drag.dragging === undefined ? undefined : "true"}
    >
      {editable ? <datalist id={listId}>{CLASS_OPTIONS}</datalist> : null}
      {template.rows.map((row, rowIndex) => (
        // Positional row key is deliberate: rows have no identity of their
        // own; cells inside carry stable ids and survive row re-keying.
        // A row that asks for the page's spare room (`flex-1`) takes it top to bottom: its rowset grows with it.
        <section className="ww-flex-rowset" key={rowIndex} data-grows={growsTall(row.classes) ? "true" : undefined}>
          {strip(rowIndex)}
          {editable ? (
            <div className="ww-flex-row-bar" data-testid="flex-row-bar" data-row={rowIndex}>
              <span className="ww-flex-handle-label">row {rowIndex + 1}</span>
              <ClassesInput
                value={row.classes}
                listId={listId}
                testId="flex-row-classes"
                label={`classes of row ${rowIndex + 1}`}
                onCommit={(classes) => setRowClasses(rowIndex, classes)}
              />
            </div>
          ) : null}
          <div
            className="ww-flex-row"
            data-testid="row"
            data-row={rowIndex}
            data-classes={row.classes}
            style={layoutStyle(row.classes)}
          >
            {row.cells.map((flexCell) => {
              const cell = cellById(flexCell.id);
              const side = dropOn(flexCell.id);
              return (
                <div
                  key={flexCell.id}
                  className="ww-flex-item"
                  data-testid="flex-item"
                  data-cell={flexCell.id}
                  data-classes={flexCell.classes}
                  data-dragging={drag.dragging === flexCell.id ? "true" : undefined}
                  data-drop={side}
                  style={layoutStyle(flexCell.classes)}
                >
                  {editable ? (
                    // The whole bar is the drag handle; its field and the chrome buttons keep their press to themselves.
                    <div
                      className="ww-flex-handle"
                      data-testid="flex-handle"
                      data-cell={flexCell.id}
                      title="drag onto another widget to swap places, onto its edge to go beside it, between rows for a new row"
                      onPointerDown={(event) => drag.start(flexCell.id, event)}
                    >
                      <span className="ww-flex-grip" aria-hidden="true">
                        ✥
                      </span>
                      <span className="ww-flex-handle-label" data-testid="flex-handle-label">
                        {flexCell.id}
                      </span>
                      <ClassesInput
                        value={flexCell.classes}
                        listId={listId}
                        testId="flex-cell-classes"
                        label={`classes of ${flexCell.id}`}
                        onCommit={(classes) => setCellClasses(flexCell.id, classes)}
                      />
                      {cell ? renderChrome?.(cell) : null}
                    </div>
                  ) : null}
                  {cell ? renderCell(cell) : null}
                  {/* Before and after are a bar on that side of the cell (the stylesheet draws it); a swap says so. */}
                  {side === "swap" ? (
                    <span className="ww-flex-fate" data-testid="flex-fate">
                      swaps places
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {template.rows.length > 0 ? strip(template.rows.length) : null}
    </div>
  );
}
