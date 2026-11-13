/**
 * The TOOLBAR of the two antd tables (`toolbar` in the `table` contract):
 * the items the page lists, each resolved BY NAME against the items the
 * table was made with — the standard two (`reset-filters`, `refresh`) and
 * whatever the host registered, a host's item under a standard name
 * replacing it. Like a custom cell's renderer, an item is a component the
 * host owns; unlike a cell it ACTS, so it is handed what a tool of a table
 * may do: ask for the rows again and filter by nothing.
 *
 * A name nothing is registered under shows nothing, and the console says
 * why — once per name: the list is configuration, read at runtime.
 */
import { useCallback, useMemo, type ComponentType } from "react";
import type { Emit } from "@wirework/schema";
import type { tableToolbarEvents, ToolbarItem } from "@wirework/widget-contracts";

/** The events the toolbar itself emits — the part of every table kind's events a tool decides. */
export type ToolbarEvents = typeof tableToolbarEvents;

/** What an item the host registers receives: the table's state a tool shows, and what it may do. */
export interface TableToolbarItemProps {
  /** The `params` of the item, as the page declared them. */
  params: Record<string, unknown>;
  /** True while the rows are being fetched. */
  loading: boolean;
  /** True while the table is filtered by anything. */
  filtered: boolean;
  /** Ask for the rows again: emits the table's `refresh`. */
  refresh: () => void;
  /** Filter by nothing: emits the table's `filter-changed` with nothing chosen. */
  resetFilters: () => void;
}
export type TableToolbarItem = ComponentType<TableToolbarItemProps>;
/** Toolbar items by name; a page selects them with `toolbar: [{ name }]`. */
export type TableToolbarItems = Readonly<Record<string, TableToolbarItem>>;

/** One item as the toolbar renders it. */
export interface ToolbarEntry {
  key: string;
  name: string;
  Item: TableToolbarItem;
  props: TableToolbarItemProps;
}

/** What of the table the toolbar's items show and use. */
export interface ToolbarState {
  loading: boolean;
  filtered: boolean;
  resetFilters: () => void;
}

const NO_PARAMS: Record<string, unknown> = {};
const warned = new Set<string>();

/** Once per unknown name (see use-table-cell.ts: a runtime name has no boot-time report to land in). */
function warnUnknown(name: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  // eslint-disable-next-line no-console -- a runtime name has no boot-time report to land in
  console.warn(`table: no toolbar item is registered as "${name}" — it is left out`);
}

export function useTableToolbar(
  emit: Emit<ToolbarEvents>,
  configured: ToolbarItem[],
  items: TableToolbarItems,
  { loading, filtered, resetFilters }: ToolbarState,
): ToolbarEntry[] {
  const refresh = useCallback(() => emit("refresh", {}), [emit]);
  return useMemo(
    () =>
      configured.flatMap(({ name, params }, index) => {
        const Item = items[name];
        if (Item === undefined) {
          warnUnknown(name);
          return [];
        }
        const props = { params: params ?? NO_PARAMS, loading, filtered, refresh, resetFilters };
        return [{ key: `${index}:${name}`, name, Item, props }];
      }),
    [configured, items, loading, filtered, refresh, resetFilters],
  );
}
