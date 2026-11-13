/**
 * css-grid renderer (doc/css-grid-design.md) — one CSS grid whose template
 * areas are the page's cell ids; every cell an item placed by `gridArea`.
 * In edit mode the grid grows a ghost per slot (the drop targets, the
 * trailing "+" ones growing the picture), every item a handle bar to drag
 * it by — onto a slot, or onto another widget to swap places — and four
 * edges and a corner to resize it by, taking slots from its neighbours; a
 * widget left with no slot waits in the TRAY under the grid, with a warning,
 * to be dragged back in. Above the grid a TYPED form: the slot table (a
 * select per slot), the row and column buttons, the track fields.
 * Render-only: logic in useCssGridView, the drag in useCssGridDrag.
 */
import { useRef } from "react";
import type { LayoutRendererProps } from "@wirework/react";
import { RESIZE_EDGES, isRectangle, spanOf, spanText, type ResizeEdge } from "./areas";
import { EMPTY, type CssGridChange, type CssGridPage } from "./schema";
import { TrackInput } from "./TrackInput";
import { useCssGridView } from "./useCssGridView";

/** The stylesheet's gap, shown in the form until the template says one. */
const DEFAULT_GAP = "0.5rem";

const TAKES = "it takes the slots it is pulled over, a neighbour gives way";
const EDGE_TITLES: Readonly<Record<ResizeEdge, string>> = {
  n: `drag the top edge — ${TAKES}`,
  e: `drag the right edge — ${TAKES}`,
  s: `drag the bottom edge — ${TAKES}`,
  w: `drag the left edge — ${TAKES}`,
  se: `drag the corner — ${TAKES}`,
};

export function CssGridView({
  template,
  cellById,
  editable,
  onChange,
  renderCell,
  renderChrome,
}: LayoutRendererProps<CssGridPage, CssGridChange>) {
  const root = useRef<HTMLDivElement | null>(null);
  const tray = useRef<HTMLDivElement | null>(null);
  const view = useCssGridView(template, onChange, editable, root, tray);
  const { tokens, shown, width, height, drag } = view;
  const drop = drag.drop;

  /** One cell: in its slots, or — with none — in the tray (edit mode) or after the grid. */
  const item = (gridCell: CssGridPage["cells"][number]) => {
    const cell = cellById(gridCell.id);
    const span = spanOf(tokens, gridCell.id);
    const fate =
      drop === undefined
        ? undefined
        : drop.id === gridCell.id
          ? "moving"
          : drop.swap === gridCell.id
            ? "swap"
            : drop.out.includes(gridCell.id)
              ? "out"
              : undefined;
    return (
      <div
        key={gridCell.id}
        className="ww-css-grid-item"
        data-testid="css-grid-item"
        data-cell={gridCell.id}
        data-area={span === undefined ? undefined : spanText(span)}
        data-dragging={drag.dragging === gridCell.id ? "true" : undefined}
        data-drop={fate}
        // A non-rectangle is not placed: CSS would drop the whole picture, so the item auto-flows and the warning says why.
        style={span === undefined || !isRectangle(tokens, gridCell.id) ? undefined : { gridArea: gridCell.id }}
      >
        {editable ? (
          // The whole bar is the drag handle (as react-grid-layout's); the chrome buttons keep their press to themselves.
          <div
            className="ww-css-grid-handle"
            data-testid="css-grid-handle"
            data-cell={gridCell.id}
            title={
              span === undefined
                ? "no slot yet — drag onto the grid"
                : "drag to a slot, or onto another widget to swap places"
            }
            onPointerDown={(event) => drag.start("move", gridCell.id, event)}
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
        {fate === "swap" || fate === "out" ? (
          <span className="ww-css-grid-fate" data-testid="css-grid-fate">
            {fate === "swap" ? "swaps places" : "loses its slot"}
          </span>
        ) : null}
        {editable && span !== undefined
          ? RESIZE_EDGES.map((edge) => (
              <div
                key={edge}
                className="ww-css-grid-resize"
                data-testid="css-grid-resize"
                data-cell={gridCell.id}
                data-edge={edge}
                role="presentation"
                title={EDGE_TITLES[edge]}
                onPointerDown={(event) => drag.start(edge, gridCell.id, event)}
              />
            ))
          : null}
      </div>
    );
  };

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
        data-dragging={drag.dragging === undefined ? undefined : "true"}
        style={view.style}
      >
        {editable
          ? shown.map((row, r) =>
              row.map((token, c) => (
                <div
                  key={`${r}-${c}`}
                  className="ww-css-grid-ghost"
                  data-testid="css-grid-ghost"
                  data-row={r}
                  data-column={c}
                  data-held={token === EMPTY ? undefined : token}
                  data-new={r >= height ? "row" : c >= width ? "column" : undefined}
                  style={{ gridRow: r + 1, gridColumn: c + 1 }}
                >
                  {r >= height || c >= width ? "+" : null}
                </div>
              )),
            )
          : null}
        {/* In edit mode a cell with no slot waits in the tray below; on the page as people see it, it flows after the grid. */}
        {template.cells.filter((gridCell) => !editable || !view.offGrid.includes(gridCell.id)).map(item)}
        {/* What letting go now would do: the slots the dragged widget would fill, drawn over whatever is there. */}
        {drop?.span === undefined ? null : (
          <div
            className="ww-css-grid-drop"
            data-testid="css-grid-drop"
            data-area={spanText(drop.span)}
            style={{
              gridRow: `${drop.span.r1 + 1} / ${drop.span.r2 + 2}`,
              gridColumn: `${drop.span.c1 + 1} / ${drop.span.c2 + 2}`,
            }}
          />
        )}
      </div>
      {editable ? (
        <div
          ref={tray}
          className="ww-css-grid-tray"
          data-testid="css-grid-tray"
          data-count={view.offGrid.length}
          data-hover={drop?.tray ? "true" : undefined}
        >
          {view.offGrid.length === 0 ? (
            <p className="ww-css-grid-tray-note">Off the grid: drop a widget here to take it out of its slots.</p>
          ) : (
            <p className="ww-css-grid-tray-note" role="alert" data-testid="css-grid-unassigned">
              {view.offGrid.length === 1 ? "1 widget has" : `${view.offGrid.length} widgets have`} no slot in the grid:{" "}
              {view.offGrid.join(", ")}. Drag {view.offGrid.length === 1 ? "it" : "each"} onto a slot — until then{" "}
              {view.offGrid.length === 1 ? "it shows" : "they show"} after the grid.
            </p>
          )}
          <div className="ww-css-grid-tray-items">
            {template.cells.filter((gridCell) => view.offGrid.includes(gridCell.id)).map(item)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
