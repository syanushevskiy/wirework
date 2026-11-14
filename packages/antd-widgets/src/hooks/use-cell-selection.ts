/**
 * The CELL SELECTION the two antd tables share (doc/ADR/0007-row-window-and-header-filters.md,
 * "Cells are selected and copied"; the `cellSelection` setting):
 *
 *  - A press on a cell selects it; dragging on selects the RECTANGLE from
 *    it to the cell under the pointer; Shift+click reaches from the cell the
 *    selection started at; a press on the small square at the selection's
 *    bottom-right corner drags that corner. Every cell says where it is
 *    (`data-at-row`, `data-at-column`), so the pointer work is one handler
 *    on the table's root reading the cell under the pointer — a row that
 *    leaves the DOM with the row window takes nothing with it: the range is
 *    numbers, not elements.
 *  - A right click opens the MENU at the pointer (on a cell outside the
 *    selection it selects that cell first): Copy, Copy with headers, Export
 *    as CSV. Ctrl/Cmd+C copies too; Escape lets the selection go.
 *  - Copy puts the rectangle on the clipboard (cell-range.ts says as what)
 *    and emits `cells-copied`; Export saves every row HELD, in the columns
 *    shown, and emits `rows-exported`.
 *
 * A control inside a cell — a link, a button — keeps its press: it never
 * starts a selection.
 */
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Emit } from "@wirework/schema";
import type { TableColumn, TableRow, tableCellEvents } from "@wirework/widget-contracts";
import { saveFile, wholeAddress, writeClipboard } from "../browser-io";
import {
  csvText,
  edgesOf,
  exportFile,
  inRect,
  rangeText,
  rectOf,
  rectText,
  sameCell,
  withinColumns,
  type CellAt,
  type CellRange,
} from "../cell-range";
import { INTERACTIVE, type RenderedRow } from "./use-table-rows";

/** The events the cell menu emits — the part of every table kind's events it decides. */
export type CellEvents = typeof tableCellEvents;

/** What the menu offers, by key. */
export const CELL_MENU = [
  { key: "copy", label: "Copy" },
  { key: "copy-headers", label: "Copy with headers" },
  { key: "export", label: "Export as CSV" },
] as const;
export type CellMenuKey = (typeof CELL_MENU)[number]["key"];

/** The data attributes a body cell carries: where it is, and its part in the selection. */
export type CellAttributes = Readonly<Record<string, string | undefined>>;

export interface CellSelectionView {
  /** The attributes of the cell of the column shown at `column` in the row; undefined while the setting is off. */
  cellAttributes: ((column: number, rendered: RenderedRow) => CellAttributes) | undefined;
  /** The handlers of the table's root, where every press, right click and key of its cells arrives. */
  root: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
  /** The menu: whether it is open, and the point of the window it opens (or last opened) at; undefined while the setting is off. */
  menu: { x: number; y: number; open: boolean } | undefined;
  closeMenu: () => void;
  choose: (key: string) => void;
  /** The selection as "rowStart-columnStart/rowEnd-columnEnd" from 1 — a fact for tests; undefined with none. */
  selected: string | undefined;
}

/** The byte order mark a CSV file begins with (U+FEFF), written by its number: the character itself is invisible in source. */
const UTF8_MARK = String.fromCharCode(0xfeff);

/** The corner of the selection's last cell that drags it: this many pixels from its right and bottom edges. */
const HANDLE = 10;

/** The body cell an event's target lies in, within the table, with where it is. */
function cellUnder(target: EventTarget | null, root: HTMLElement): { at: CellAt; element: HTMLElement } | undefined {
  const element = target instanceof Element ? target.closest<HTMLElement>("td[data-at-row]") : null;
  if (element === null || !root.contains(element)) return undefined;
  return { at: { row: Number(element.dataset["atRow"]), column: Number(element.dataset["atColumn"]) }, element };
}

/** Whether the press landed on the small square at the cell's bottom-right corner. */
function onHandle(element: HTMLElement, event: { clientX: number; clientY: number }): boolean {
  if (element.dataset["handle"] !== "true") return false;
  const box = element.getBoundingClientRect();
  return box.right - event.clientX <= HANDLE && box.bottom - event.clientY <= HANDLE;
}

/** Whether keys typed here are the element's own — a field's Ctrl+C copies its text, not the cells. */
const typesText = (target: EventTarget): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"));

export function useCellSelection(
  emit: Emit<CellEvents>,
  enabled: boolean,
  /** The columns shown, in order, and the rows held — `offset` rows into the whole list. */
  columns: TableColumn[],
  rows: TableRow[],
  offset: number,
  /** The export's name (the setting) and the rows' store path it is made from when that is empty. */
  exportName: string,
  rowsPath: string,
): CellSelectionView {
  const [range, setRange] = useState<CellRange | undefined>(undefined);
  const [menu, setMenu] = useState({ x: 0, y: 0, open: false });
  const rect = useMemo(
    () => (range === undefined ? undefined : withinColumns(rectOf(range), columns.length)),
    [range, columns.length],
  );

  const cellAttributes = useMemo(() => {
    if (!enabled) return undefined;
    return (column: number, rendered: RenderedRow): CellAttributes => {
      const at = { row: offset + rendered.index, column };
      const where = { "data-at-row": String(at.row), "data-at-column": String(column) };
      if (rect === undefined || range === undefined || !inRect(rect, at)) return where;
      return {
        ...where,
        "data-selected": "true",
        "data-edge": edgesOf(rect, at),
        "data-anchor": sameCell(range.anchor, at) ? "true" : undefined,
        "data-handle": at.row === rect.bottom && at.column === rect.right ? "true" : undefined,
      };
    };
  }, [enabled, offset, rect, range]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE) !== null) return;
      const root = event.currentTarget;
      const pressed = cellUnder(event.target, root);
      if (pressed === undefined) return;
      // The corner's square drags the corner: the selection keeps its opposite one. Shift reaches from where it started.
      const anchor =
        rect !== undefined && onHandle(pressed.element, event)
          ? { row: rect.top, column: rect.left }
          : event.shiftKey && range !== undefined
            ? range.anchor
            : pressed.at;
      const focus =
        rect !== undefined && onHandle(pressed.element, event) ? { row: rect.bottom, column: rect.right } : pressed.at;
      setRange({ anchor, focus });
      const move = (e: PointerEvent) => {
        const over = cellUnder(document.elementFromPoint(e.clientX, e.clientY), root);
        if (over === undefined) return;
        setRange((current) =>
          current !== undefined && sameCell(current.focus, over.at) ? current : { anchor, focus: over.at },
        );
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [enabled, rect, range],
  );

  /** The row the menu was opened on: the focus goes back to it when the menu closes, so the table hears the keys again. */
  const menuRow = useRef<HTMLElement | null>(null);
  const onContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!enabled) return;
      const pressed = cellUnder(event.target, event.currentTarget);
      if (pressed === undefined) return;
      event.preventDefault();
      if (rect === undefined || !inRect(rect, pressed.at)) setRange({ anchor: pressed.at, focus: pressed.at });
      setMenu({ x: event.clientX, y: event.clientY, open: true });
      menuRow.current = pressed.element.closest("tr");
    },
    [enabled, rect],
  );

  const closeMenu = useCallback(() => {
    setMenu((last) => (last.open ? { ...last, open: false } : last));
    if (menuRow.current?.isConnected === true) menuRow.current.focus({ preventScroll: true });
    menuRow.current = null;
  }, []);

  const copy = useCallback(
    (headers: boolean) => {
      if (rect === undefined) return;
      const copied = rangeText(rows, offset, columns, rect, headers, wholeAddress);
      writeClipboard(copied.text);
      emit("cells-copied", { ...copied, headers });
    },
    [rect, rows, offset, columns, emit],
  );

  const exportRows = useCallback(() => {
    const file = exportFile(exportName, rowsPath);
    // The mark first: a spreadsheet reads the file as UTF-8 by it.
    saveFile(file, UTF8_MARK + csvText(rows, columns, wholeAddress), "text/csv;charset=utf-8");
    emit("rows-exported", { file, rows: rows.length, columns: columns.length });
  }, [exportName, rowsPath, rows, columns, emit]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!enabled || rect === undefined || typesText(event.target)) return;
      if (event.key === "Escape") {
        setRange(undefined);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        // Text the user selected by hand (a header, a status line) is theirs to copy.
        if ((window.getSelection()?.toString() ?? "") !== "") return;
        event.preventDefault();
        copy(false);
      }
    },
    [enabled, rect, copy],
  );

  const choose = useCallback(
    (key: string) => {
      closeMenu();
      if (key === "copy") copy(false);
      else if (key === "copy-headers") copy(true);
      else if (key === "export") exportRows();
    },
    [closeMenu, copy, exportRows],
  );

  return {
    cellAttributes,
    root: { onPointerDown, onContextMenu, onKeyDown },
    menu: enabled ? menu : undefined,
    closeMenu,
    choose,
    selected: rect === undefined ? undefined : rectText(rect),
  };
}
