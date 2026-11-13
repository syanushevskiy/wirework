/**
 * The COLUMN MENU's logic, shared by the two antd tables (guidelines:
 * render-only components): the state — which columns are hidden and the
 * order they stand in —, where it lives, the columns the table shows by
 * it, and what the menu (ColumnMenu) is given.
 *
 * WHERE THE STATE LIVES is configuration: with the `columnState` port bound
 * it is the store's — read through the port, changed only by the
 * `columns-changed` event the default reaction writes back —; unbound, the
 * browser's local storage keeps it under the table's key, so it survives a
 * reload. Either way every change EMITS `columns-changed` with the whole
 * state, and Reset is a change to "nothing changed".
 */
import { useCallback, useMemo, useState } from "react";
import type { TreeProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { ColumnState, TableColumn, tableColumnEvents } from "@wirework/widget-contracts";
import {
  NO_COLUMN_STATE,
  isColumnStateChanged,
  movedColumn,
  orderedColumns,
  readColumnState,
  shownColumns,
  toggledColumn,
  toggledColumns,
  writeColumnState,
} from "../column-state";

/** The events the column menu emits — the part of every table kind's events it decides. */
export type ColumnEvents = typeof tableColumnEvents;

/** One line of the menu: a column, and whether the table shows it. */
export interface ColumnMenuItem {
  property: string;
  title: string;
  shown: boolean;
}

/** What the ColumnMenu component is given. */
export interface ColumnMenuView {
  /** Every column, in the order the table has them now. */
  items: ColumnMenuItem[];
  /** All shown, none shown, or some — the "Columns" checkbox above the list. */
  all: boolean;
  some: boolean;
  /** Whether anything differs from the columns as configured: Reset is for that. */
  changed: boolean;
  toggle: (property: string, shown: boolean) => void;
  toggleAll: (shown: boolean) => void;
  /** antd Tree's drop: one column dragged before or after another. */
  drop: NonNullable<TreeProps["onDrop"]>;
  /** A column may be dropped between others, never INTO one. */
  allowDrop: NonNullable<TreeProps["allowDrop"]>;
  reset: () => void;
}

export interface ColumnStateView {
  /** The columns the table shows. */
  columns: TableColumn[];
  /** The menu, when the setting offers it. */
  menu: ColumnMenuView | undefined;
}

const droppedBetween: NonNullable<TreeProps["allowDrop"]> = ({ dropPosition }) => dropPosition !== 0;

export function useColumnState(
  store: ReadableStore,
  emit: Emit<ColumnEvents>,
  path: string | undefined,
  port: PortDefinition<ColumnState>,
  columns: TableColumn[],
  /** The `columnMenu` setting, and the local-storage key the state is kept under while no path is bound. */
  offered: boolean,
  key: string,
): ColumnStateView {
  const bound = path !== undefined;
  const stored = usePort(store, path, port);

  // Local storage is read once per key; from then on the state is React's, written through on every change.
  const [local, setLocal] = useState(() => ({ key, state: readColumnState(key) }));
  if (local.key !== key) setLocal({ key, state: readColumnState(key) });

  // Without a menu nobody could bring a hidden column back: what local storage holds applies only with it.
  const state = bound ? (stored ?? NO_COLUMN_STATE) : offered && local.key === key ? local.state : NO_COLUMN_STATE;

  const change = useCallback(
    (next: ColumnState) => {
      if (!bound) {
        setLocal({ key, state: next });
        writeColumnState(key, next);
      }
      // Bound, the default reaction writes it back; either way the page hears of it.
      emit("columns-changed", { columnState: next });
    },
    [bound, key, emit],
  );

  const shown = useMemo(() => shownColumns(columns, state), [columns, state]);

  const menu = useMemo<ColumnMenuView | undefined>(() => {
    if (!offered) return undefined;
    const hidden = new Set(state.hidden);
    const items = orderedColumns(columns, state).map((column) => ({
      property: column.property,
      title: column.title,
      shown: !hidden.has(column.property),
    }));
    const count = items.filter((item) => item.shown).length;
    return {
      items,
      all: items.length > 0 && count === items.length,
      some: count > 0 && count < items.length,
      changed: isColumnStateChanged(state),
      toggle: (property, on) => change(toggledColumn(state, property, on)),
      toggleAll: (on) => change(toggledColumns(columns, state, on)),
      drop: ({ node, dragNode, dropPosition }) => {
        // antd says where the drop is among ALL nodes; against the target's own place it is before or after it.
        const at = Number(node.pos.split("-").at(-1));
        change(
          movedColumn(columns, state, String(dragNode.key), String(node.key), dropPosition < at ? "before" : "after"),
        );
      },
      allowDrop: droppedBetween,
      reset: () => change(NO_COLUMN_STATE),
    };
  }, [offered, columns, state, change]);

  return { columns: shown, menu };
}
