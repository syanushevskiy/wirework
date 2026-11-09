/**
 * ALL CssGridView logic: the picture as tokens, the grid's size, the inline
 * style the template says (and nothing more), and every change edit mode
 * reports — a slot picked in the table, a row or column added or removed,
 * a track sized, the gap set, a rectangle dropped or resized (useCssGridDrag).
 * The picture's rules live in areas.ts; this hook only composes payloads.
 */
import { useCallback, useMemo, type CSSProperties, type RefObject } from "react";
import { columnCount, grownTo, isDrawable, tokensOf, withSlot, withoutColumn, withoutRow } from "./areas";
import { EMPTY, type CssGridChange, type CssGridPage } from "./schema";
import { useCssGridDrag } from "./useCssGridDrag";

/** The room the trailing "+" slots take in edit mode: a drop there grows the picture. */
const NEW_TRACK = "2rem";

const DEFAULT_COLUMN = "1fr";
const DEFAULT_ROW = "auto";

/** `columns` as the template has them, or one default per column. */
const columnSizes = (template: CssGridPage, width: number): string[] =>
  template.columns ?? Array<string>(width).fill(DEFAULT_COLUMN);
const rowSizes = (template: CssGridPage, height: number): string[] =>
  template.rows ?? Array<string>(height).fill(DEFAULT_ROW);

export function useCssGridView(
  template: CssGridPage,
  onChange: ((change: CssGridChange) => void) | undefined,
  editable: boolean,
  /** The grid element, whose ghost slots the drag measures. */
  root: RefObject<HTMLElement | null>,
) {
  const tokens = useMemo(() => tokensOf(template.areas), [template.areas]);
  const width = columnCount(tokens);
  const height = tokens.length;
  const cellIds = useMemo(() => template.cells.map((cell) => cell.id), [template.cells]);

  /** Edit mode shows one more row and column of ghosts — the "+" slots. */
  const shown = useMemo(
    () => (editable ? grownTo(tokens, height + 1, width + 1) : tokens),
    [tokens, editable, height, width],
  );

  const style = useMemo((): CSSProperties => {
    const columns = columnSizes(template, width);
    const rows = rowSizes(template, height);
    const drawable = isDrawable(tokens);
    return {
      gridTemplateColumns: [...columns, ...(editable ? [NEW_TRACK] : [])].join(" "),
      gridTemplateRows: [...rows, ...(editable ? [NEW_TRACK] : [])].join(" "),
      // A picture CSS would drop (an area that is no rectangle) is not set at all: the page auto-flows and the warning says why.
      ...(drawable ? { gridTemplateAreas: shown.map((row) => `"${row.join(" ")}"`).join(" ") } : {}),
      ...(template.gap === undefined ? {} : { gap: template.gap }),
    };
  }, [template, tokens, shown, editable, width, height]);

  /** The whole picture after a drop or a pick, with the tracks that follow a grown or shrunk grid. */
  const picture = useCallback(
    (next: readonly (readonly string[])[]) => {
      const nextWidth = columnCount(next);
      const change: CssGridChange = { kind: "areas", areas: next.map((row) => row.join(" ")) };
      if (template.columns !== undefined && nextWidth !== template.columns.length) {
        change.columns = Array.from({ length: nextWidth }, (_, c) => template.columns?.[c] ?? DEFAULT_COLUMN);
      }
      if (template.rows !== undefined && next.length !== template.rows.length) {
        change.rows = Array.from({ length: next.length }, (_, r) => template.rows?.[r] ?? DEFAULT_ROW);
      }
      onChange?.(change);
    },
    [template.columns, template.rows, onChange],
  );

  const drag = useCssGridDrag(root, tokens, picture);

  const pickSlot = useCallback(
    (row: number, column: number, id: string | undefined) => {
      drag.dismiss();
      picture(withSlot(tokens, row, column, id));
    },
    [tokens, picture, drag],
  );
  const addRow = useCallback(
    () => picture(grownTo(tokens, height + 1, Math.max(1, width))),
    [tokens, picture, height, width],
  );
  const addColumn = useCallback(
    () => picture(grownTo(tokens, Math.max(1, height), width + 1)),
    [tokens, picture, height, width],
  );
  /** Undefined when a cell in the row has no other slot: the button says so instead of acting. */
  const rowRemoval = useCallback((row: number) => withoutRow(tokens, row), [tokens]);
  const columnRemoval = useCallback(
    (column: number) => {
      const next = withoutColumn(tokens, column);
      // A column removed from every row of one slot leaves rows of nothing: keep the picture's rows.
      return next?.map((row) => (row.length === 0 ? [EMPTY] : row));
    },
    [tokens],
  );
  const removeRow = useCallback(
    (row: number) => {
      const next = rowRemoval(row);
      if (next !== undefined) picture(next);
    },
    [rowRemoval, picture],
  );
  const removeColumn = useCallback(
    (column: number) => {
      const next = columnRemoval(column);
      if (next !== undefined) picture(next);
    },
    [columnRemoval, picture],
  );

  const setColumn = useCallback(
    (column: number, size: string) =>
      onChange?.({ kind: "tracks", columns: columnSizes(template, width).map((s, c) => (c === column ? size : s)) }),
    [template, width, onChange],
  );
  const setRow = useCallback(
    (row: number, size: string) =>
      onChange?.({ kind: "tracks", rows: rowSizes(template, height).map((s, r) => (r === row ? size : s)) }),
    [template, height, onChange],
  );
  const setGap = useCallback((gap: string) => onChange?.({ kind: "tracks", gap }), [onChange]);

  return {
    tokens,
    shown,
    width,
    height,
    cellIds,
    style,
    columns: columnSizes(template, width),
    rows: rowSizes(template, height),
    drag,
    pickSlot,
    addRow,
    addColumn,
    canRemoveRow: (row: number) => rowRemoval(row) !== undefined,
    canRemoveColumn: (column: number) => columnRemoval(column) !== undefined,
    removeRow,
    removeColumn,
    setColumn,
    setRow,
    setGap,
  };
}
