/**
 * The COLUMN MENU's logic, shared by the two antd tables (guidelines:
 * render-only components): the state — which columns are hidden, the
 * order they stand in and the edge some are pinned to —, where it lives, the columns the table shows by
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
import type { ColumnPin, ColumnState, TableColumn, tableColumnEvents } from "@wirework/widget-contracts";
import {
  NO_COLUMN_STATE,
  droppedColumn,
  isColumnStateChanged,
  orderedColumns,
  pinnedColumn,
  pinsOf,
  readColumnState,
  shownColumns,
  toggledColumn,
  toggledColumns,
  writeColumnState,
} from "../column-state";

/** The events the column menu emits — the part of every table kind's events it decides. */
export type ColumnEvents = typeof tableColumnEvents;

/** One line of the menu: a column, whether the table shows it, and the edge it is pinned to. */
export interface ColumnMenuItem {
  property: string;
  title: string;
  shown: boolean;
  /** The column cannot be hidden: its checkbox is checked and locked. */
  required: boolean;
  /** The edge the column is pinned to, if any. */
  pin: ColumnPin | undefined;
}

/**
 * One SECTION of the menu: the columns pinned left, the ones not pinned,
 * the ones pinned right — in the order the table has them. The two pinned
 * sections are there only while a column is pinned to that edge.
 */
export interface ColumnMenuSection {
  /** The edge its columns are pinned to; none for the columns in between. */
  edge: ColumnPin | undefined;
  /** The caption over it, and the key of the caption's line in the list (never a column's property). */
  title: string;
  key: string;
  items: ColumnMenuItem[];
}

/** What the ColumnMenu component is given. */
export interface ColumnMenuView {
  /** Every column, in the order the table has them now. */
  items: ColumnMenuItem[];
  /** The same columns by section, each under its caption. */
  sections: ColumnMenuSection[];
  /** Whether a line of the list may be dragged: a column's, never a caption's. */
  draggable: (key: string) => boolean;
  /** All shown, none shown, or some — the "Columns" checkbox above the list. */
  all: boolean;
  some: boolean;
  /** Whether anything differs from the columns as configured: Reset is for that. */
  changed: boolean;
  toggle: (property: string, shown: boolean) => void;
  toggleAll: (shown: boolean) => void;
  /** Pin a column to an edge, or — no edge — let it go. */
  pin: (property: string, edge: ColumnPin | undefined) => void;
  /** antd Tree's drop: one column dragged before or after another. */
  drop: NonNullable<TreeProps["onDrop"]>;
  /** A column may be dropped between others, never INTO one — and never beside a caption. */
  allowDrop: NonNullable<TreeProps["allowDrop"]>;
  reset: () => void;
}

export interface ColumnStateView {
  /** The columns the table shows. */
  columns: TableColumn[];
  /** The edge each pinned column stands at, by property. */
  pinned: Readonly<Record<string, ColumnPin>>;
  /** The menu, when the setting offers it. */
  menu: ColumnMenuView | undefined;
}

/** A caption's line in the list has a key no column has (a property is a dot path: no colon in it). */
const SECTION_KEY = "section:";
const isColumnKey = (key: string): boolean => !key.startsWith(SECTION_KEY);

/** The captions, in the order the sections stand. */
const SECTIONS = [
  { edge: "left", title: "PINNED LEFT" },
  { edge: undefined, title: "COLUMNS" },
  { edge: "right", title: "PINNED RIGHT" },
] as const;

/** The menu's sections: the columns in between always, a pinned one only while it holds a column. */
export function columnSections(items: ColumnMenuItem[]): ColumnMenuSection[] {
  return SECTIONS.map(({ edge, title }) => ({
    edge,
    title,
    key: `${SECTION_KEY}${edge ?? "columns"}`,
    items: items.filter((item) => item.pin === edge),
  })).filter((section) => section.edge === undefined || section.items.length > 0);
}

/**
 * A column is dropped BETWEEN lines, never into one. Under a caption is the
 * head of its section (antd names the place above a section's first column
 * so: "after the line before it"); above a caption is no place at all.
 */
const droppedBetween: NonNullable<TreeProps["allowDrop"]> = ({ dropNode, dropPosition }) =>
  dropPosition !== 0 && (isColumnKey(String(dropNode.key)) || dropPosition === 1);

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
    const pins = pinsOf(state);
    const items = orderedColumns(columns, state).map((column) => ({
      property: column.property,
      title: column.title,
      required: column.required === true,
      shown: column.required === true || !hidden.has(column.property),
      pin: pins[column.property],
    }));
    const count = items.filter((item) => item.shown).length;
    const sections = columnSections(items);
    return {
      items,
      sections,
      draggable: isColumnKey,
      all: items.length > 0 && count === items.length,
      some: count > 0 && count < items.length,
      changed: isColumnStateChanged(state),
      toggle: (property, on) => change(toggledColumn(state, property, on)),
      toggleAll: (on) => change(toggledColumns(columns, state, on)),
      pin: (property, edge) => change(pinnedColumn(state, property, edge)),
      drop: ({ node, dragNode, dropPosition }) => {
        // antd says where the drop is among ALL nodes; against the target's own place it is before or after it.
        const at = Number(node.pos.split("-").at(-1));
        const dragged = String(dragNode.key);
        const section = sections.find((candidate) => candidate.key === node.key);
        if (section === undefined) {
          change(droppedColumn(columns, state, dragged, String(node.key), dropPosition < at ? "before" : "after"));
          return;
        }
        // Under a caption: the head of that section — before its first column, or, the section empty, simply in it.
        const first = section.items.find((item) => item.property !== dragged);
        change(
          first === undefined
            ? pinnedColumn(state, dragged, section.edge)
            : droppedColumn(columns, state, dragged, first.property, "before"),
        );
      },
      allowDrop: droppedBetween,
      reset: () => change(NO_COLUMN_STATE),
    };
  }, [offered, columns, state, change]);

  return { columns: shown, pinned: pinsOf(state), menu };
}
