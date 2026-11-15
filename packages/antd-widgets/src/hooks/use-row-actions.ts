/**
 * The ROW ACTIONS of the two antd tables (`rowActions` in the `table`
 * contract, doc/ADR/0020-row-actions.md): the actions the page lists, each
 * resolved BY NAME against the ones the table was made with — the standard
 * `favorite` and whatever the host registered, a host's action under a
 * standard name replacing it — and the ONE column they stand in, at the
 * start of every row.
 *
 * Like a toolbar item, an action is a component the host owns that ACTS —
 * so, like a toolbar item, it is handed a function and never `emit`: `act`
 * fires the table's `row-action` with THIS action's name and THIS row, and
 * nothing else. The table stores nothing about a row.
 *
 * The column is no data column: it has no property, so it is not in the
 * column menu, takes no part in the cell selection, Copy or the export, and
 * has no cell tip. Whether an action SHOWS is CSS (styles.css): the row
 * hovered or holding the focus — never state, a hover must not render a
 * table again.
 */
import { createElement, useCallback, useMemo, type ComponentType } from "react";
import type { TableColumnType } from "antd";
import type { Emit } from "@wirework/schema";
import type { RowAction, TableRow, tableRowActionEvents } from "@wirework/widget-contracts";
import { RowActionsCell, RowActionsTitle } from "../widgets/row-actions";
import type { RenderedRow } from "./use-table-rows";

/** The event the row actions emit — the part of every table kind's events a row action decides. */
export type RowActionEvents = typeof tableRowActionEvents;

/** What an action the host registers receives: the row, and the one thing it may do. */
export interface TableRowActionProps {
  row: TableRow;
  /** The row's key (its `rowKey` property). */
  rowKey: string;
  /** The `params` of the action, as the page declared them. */
  params: Record<string, unknown>;
  /** Tell the page: emits the table's `row-action` with this action's name, the row and `detail`. */
  act: (detail?: Record<string, unknown>) => void;
}
export type TableRowAction = ComponentType<TableRowActionProps>;
/** Row actions by name; a page selects them with `rowActions: [{ name }]`. */
export type TableRowActions = Readonly<Record<string, TableRowAction>>;

/** One action as a row's cell renders it. */
export interface RowActionEntry {
  key: string;
  name: string;
  Action: TableRowAction;
  params: Record<string, unknown>;
}

/** What a table does with its row actions: the column to put before its own, and the width it takes. */
export interface RowActionsView {
  column: TableColumnType<RenderedRow> | undefined;
  width: number;
}

/** The width one action takes in the column, px, and the cell's own padding on both sides. */
export const ROW_ACTION_WIDTH = 28;
const CELL_PADDING = 16;

const NO_PARAMS: Record<string, unknown> = {};
const NO_ACTIONS: RowActionsView = { column: undefined, width: 0 };
const warned = new Set<string>();

/** Once per unknown name (see use-table-cell.ts: a runtime name has no boot-time report to land in). */
function warnUnknown(name: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  // eslint-disable-next-line no-console -- a runtime name has no boot-time report to land in
  console.warn(`table: no row action is registered as "${name}" — it is left out`);
}

export function useRowActions(
  emit: Emit<RowActionEvents>,
  configured: RowAction[],
  actions: TableRowActions,
): RowActionsView {
  const entries = useMemo<RowActionEntry[]>(
    () =>
      configured.flatMap(({ name, params }, index) => {
        const Action = actions[name];
        if (Action === undefined) {
          warnUnknown(name);
          return [];
        }
        return [{ key: `${index}:${name}`, name, Action, params: params ?? NO_PARAMS }];
      }),
    [configured, actions],
  );
  const act = useCallback(
    (name: string, rendered: RenderedRow, detail: Record<string, unknown> = {}) =>
      emit("row-action", { name, key: rendered.key, row: rendered.row, detail }),
    [emit],
  );

  return useMemo<RowActionsView>(() => {
    if (entries.length === 0) return NO_ACTIONS;
    const width = entries.length * ROW_ACTION_WIDTH + CELL_PADDING;
    return {
      width,
      column: {
        key: "row-actions",
        title: createElement(RowActionsTitle),
        width,
        // In view however far the table is scrolled sideways.
        fixed: "left",
        className: "ww-table__actions",
        render: (_, rendered) => createElement(RowActionsCell, { entries, rendered, act }),
        onCell: () => ({ "data-cell": "actions" }) as Record<string, string>,
      },
    };
  }, [entries, act]);
}
