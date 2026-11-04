/**
 * flex-rows renderer — rows of cells, each row a flexbox, a row's and a
 * cell's Tailwind layout classes as their style (classes.ts). In edit mode
 * every row grows a bar with a field for its classes, and every cell a
 * handle with its id, four arrows that move it, a field for its classes
 * and the adapter's chrome. Render-only: logic in useFlexRowsView.
 */
import type { LayoutRendererProps } from "@wirework/react";
import { ClassesInput } from "./ClassesInput";
import { LAYOUT_CLASS_NAMES, layoutStyle } from "./classes";
import { MOVE_DIRECTIONS, type FlexRowsChange, type FlexRowsPage, type MoveDirection } from "./schema";
import { useFlexRowsView } from "./useFlexRowsView";

const ARROWS: Readonly<Record<MoveDirection, string>> = { left: "←", right: "→", up: "↑", down: "↓" };

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
  const { listId, setCellClasses, setRowClasses, move } = useFlexRowsView(template, onChange);
  return (
    <div className="ww-flex-rows" data-testid="flex-rows">
      {editable ? <datalist id={listId}>{CLASS_OPTIONS}</datalist> : null}
      {template.rows.map((row, rowIndex) => (
        // Positional row key is deliberate: rows have no identity of their
        // own; cells inside carry stable ids and survive row re-keying.
        <section className="ww-flex-rowset" key={rowIndex}>
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
              return (
                <div
                  key={flexCell.id}
                  className="ww-flex-item"
                  data-testid="flex-item"
                  data-cell={flexCell.id}
                  data-classes={flexCell.classes}
                  style={layoutStyle(flexCell.classes)}
                >
                  {editable ? (
                    <div className="ww-flex-handle" data-testid="flex-handle">
                      <span className="ww-flex-handle-label">{flexCell.id}</span>
                      {MOVE_DIRECTIONS.map((direction) => (
                        <button
                          key={direction}
                          type="button"
                          className="ww-cell-action"
                          data-testid="flex-move"
                          data-cell={flexCell.id}
                          data-direction={direction}
                          aria-label={`Move ${flexCell.id} ${direction}`}
                          onClick={() => move(flexCell.id, direction)}
                        >
                          {ARROWS[direction]}
                        </button>
                      ))}
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
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
