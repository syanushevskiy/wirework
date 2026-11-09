/**
 * css-grid renderer (doc/css-grid-design.md) — one CSS grid whose template
 * areas are the page's cell ids; every cell an item placed by `gridArea`.
 * In edit mode the grid grows a ghost per slot (the drop targets, the
 * trailing "+" ones growing the picture), every item a handle bar to drag
 * it by and a corner to resize it, and a TYPED form above the grid: the slot
 * table (a select per slot), the row and column buttons, the track fields.
 * Render-only: logic in useCssGridView, the drag in useCssGridDrag.
 */
import { useRef } from "react";
import type { LayoutRendererProps } from "@wirework/react";
import { isRectangle, spanOf, spanText } from "./areas";
import { EMPTY, type CssGridChange, type CssGridPage, type Span } from "./schema";
import { TrackInput } from "./TrackInput";
import { useCssGridView } from "./useCssGridView";

/** The stylesheet's gap, shown in the form until the template says one. */
const DEFAULT_GAP = "0.5rem";

const inSpan = (span: Span | undefined, row: number, column: number): boolean =>
  span !== undefined && row >= span.r1 && row <= span.r2 && column >= span.c1 && column <= span.c2;

export function CssGridView({
  template,
  cellById,
  editable,
  onChange,
  renderCell,
  renderChrome,
}: LayoutRendererProps<CssGridPage, CssGridChange>) {
  const root = useRef<HTMLDivElement | null>(null);
  const view = useCssGridView(template, onChange, editable, root);
  const { tokens, shown, width, height, drag } = view;
  const refusal = drag.refusal;
  return (
    <div className="ww-css-grid-root">
      {editable ? (
        <form className="ww-css-grid-form" data-testid="css-grid-form" onSubmit={(event) => event.preventDefault()}>
          <table className="ww-css-grid-table">
            <thead>
              <tr>
                <th scope="col">
                  <TrackInput
                    value={template.gap ?? DEFAULT_GAP}
                    testId="css-grid-gap"
                    label="gap"
                    units={["px", "rem"]}
                    keywords={[]}
                    onCommit={view.setGap}
                  />
                </th>
                {view.columns.map((size, c) => (
                  <th scope="col" key={c}>
                    <TrackInput
                      value={size}
                      testId="css-grid-column"
                      label={`size of column ${c + 1}`}
                      data={{ "data-column": c }}
                      onCommit={(next) => view.setColumn(c, next)}
                    />
                    <button
                      type="button"
                      className="ww-cell-action"
                      data-testid="css-grid-remove-column"
                      data-column={c}
                      aria-label={`Remove column ${c + 1}`}
                      disabled={!view.canRemoveColumn(c)}
                      title={view.canRemoveColumn(c) ? undefined : "a widget here has no other slot"}
                      onClick={() => view.removeColumn(c)}
                    >
                      −
                    </button>
                  </th>
                ))}
                <th scope="col">
                  <button
                    type="button"
                    className="ww-cell-action"
                    data-testid="css-grid-add-column"
                    aria-label="Add a column"
                    onClick={view.addColumn}
                  >
                    + column
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((row, r) => (
                // Positional keys: rows and slots have no identity of their own.
                <tr key={r}>
                  <th scope="row">
                    <TrackInput
                      value={view.rows[r] ?? "auto"}
                      testId="css-grid-row-size"
                      label={`size of row ${r + 1}`}
                      data={{ "data-row": r }}
                      onCommit={(next) => view.setRow(r, next)}
                    />
                    <button
                      type="button"
                      className="ww-cell-action"
                      data-testid="css-grid-remove-row"
                      data-row={r}
                      aria-label={`Remove row ${r + 1}`}
                      disabled={!view.canRemoveRow(r)}
                      title={view.canRemoveRow(r) ? undefined : "a widget here has no other slot"}
                      onClick={() => view.removeRow(r)}
                    >
                      −
                    </button>
                  </th>
                  {Array.from({ length: width }, (_, c) => {
                    const token = row[c] ?? EMPTY;
                    const broken = token !== EMPTY && !view.cellIds.includes(token);
                    const notRectangle = token !== EMPTY && !isRectangle(tokens, token);
                    return (
                      <td
                        key={c}
                        className={token === EMPTY ? undefined : "ww-css-grid-held"}
                        data-cell={token === EMPTY ? undefined : token}
                      >
                        <select
                          className="ww-css-grid-slot"
                          data-testid="css-grid-slot"
                          data-row={r}
                          data-column={c}
                          aria-label={`slot row ${r + 1} column ${c + 1}`}
                          {...(broken || notRectangle
                            ? {
                                "aria-invalid": true,
                                title: broken ? `"${token}" is not a cell` : `area "${token}" is not a rectangle`,
                              }
                            : {})}
                          value={token === EMPTY ? "" : token}
                          onChange={(event) =>
                            view.pickSlot(r, c, event.target.value === "" ? undefined : event.target.value)
                          }
                        >
                          <option value="">empty</option>
                          {view.cellIds.map((id) => (
                            <option key={id} value={id}>
                              {id}
                            </option>
                          ))}
                          {broken ? <option value={token}>{token}</option> : null}
                        </select>
                      </td>
                    );
                  })}
                  <td />
                </tr>
              ))}
              <tr>
                <th scope="row">
                  <button
                    type="button"
                    className="ww-cell-action"
                    data-testid="css-grid-add-row"
                    aria-label="Add a row"
                    onClick={view.addRow}
                  >
                    + row
                  </button>
                </th>
              </tr>
            </tbody>
          </table>
          {refusal === undefined ? null : (
            <p className="ww-css-grid-refusal" role="status" data-testid="css-grid-refusal">
              refused: the slot row {refusal.holder.row + 1} column {refusal.holder.column + 1} holds &quot;
              {refusal.holder.id}&quot;
            </p>
          )}
        </form>
      ) : null}
      <div
        ref={root}
        className="ww-css-grid"
        data-testid="css-grid"
        data-rows={height}
        data-columns={width}
        data-column-sizes={view.columns.join(" ")}
        data-row-sizes={view.rows.join(" ")}
        style={view.style}
      >
        {editable
          ? shown.map((row, r) =>
              row.map((token, c) => {
                const hovered = inSpan(drag.hover?.span, r, c);
                const refused = inSpan(refusal?.span, r, c);
                return (
                  <div
                    key={`${r}-${c}`}
                    className="ww-css-grid-ghost"
                    data-testid="css-grid-ghost"
                    data-row={r}
                    data-column={c}
                    data-held={token === EMPTY ? undefined : token}
                    data-new={r >= height ? "row" : c >= width ? "column" : undefined}
                    data-hover={hovered ? (drag.hover?.blocked ? "blocked" : "free") : undefined}
                    data-refused={refused ? "true" : undefined}
                    title={refused && refusal ? `holds "${refusal.holder.id}"` : undefined}
                    style={{ gridRow: r + 1, gridColumn: c + 1 }}
                  >
                    {r >= height || c >= width ? "+" : null}
                  </div>
                );
              }),
            )
          : null}
        {template.cells.map((gridCell) => {
          const cell = cellById(gridCell.id);
          const span = spanOf(tokens, gridCell.id);
          return (
            <div
              key={gridCell.id}
              className="ww-css-grid-item"
              data-testid="css-grid-item"
              data-cell={gridCell.id}
              data-area={span === undefined ? undefined : spanText(span)}
              // A non-rectangle is not placed: CSS would drop the whole picture, so the item auto-flows and the warning says why.
              style={span === undefined || !isRectangle(tokens, gridCell.id) ? undefined : { gridArea: gridCell.id }}
            >
              {editable ? (
                // The whole bar is the drag handle (as react-grid-layout's); the chrome buttons keep their press to themselves.
                <div
                  className="ww-css-grid-handle"
                  data-testid="css-grid-handle"
                  data-cell={gridCell.id}
                  data-draggable={span === undefined ? undefined : "true"}
                  title={span === undefined ? "no slot — placed after the grid" : "drag to another slot"}
                  onPointerDown={span === undefined ? undefined : (event) => drag.start("move", gridCell.id, event)}
                >
                  <span className="ww-css-grid-grip" aria-hidden="true">
                    ✥
                  </span>
                  <span className="ww-css-grid-handle-label" data-testid="css-grid-handle-label">
                    {gridCell.id}
                    {span === undefined ? " · no slot" : ""}
                  </span>
                  {cell ? renderChrome?.(cell) : null}
                </div>
              ) : null}
              {cell ? renderCell(cell) : null}
              {editable && span !== undefined ? (
                <div
                  className="ww-css-grid-resize"
                  data-testid="css-grid-resize"
                  data-cell={gridCell.id}
                  role="presentation"
                  title="drag to span more slots"
                  onPointerDown={(event) => drag.start("resize", gridCell.id, event)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
