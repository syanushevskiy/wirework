/**
 * The COLUMN STATE of a table's column menu (`columnMenu` in the `table`
 * contract): what the user made of the columns — the order they stand in
 * and the ones hidden, by property — applied to the columns the table has,
 * and where it is kept when no store path is bound: the browser's local
 * storage. Pure arithmetic and one guarded pair of storage calls; the hook
 * (use-column-state.ts) decides when.
 */
import { columnStateSchema, type ColumnState } from "@wirework/widget-contracts";

/** Nothing changed: the columns as configured. */
export const NO_COLUMN_STATE: ColumnState = { order: [], hidden: [] };

interface Named {
  property: string;
}

/**
 * Every column in the order the state says: the ones it names, as named,
 * then the ones it does not (a column the server added since) as they came.
 * A property the table no longer has is skipped.
 */
export function orderedColumns<Column extends Named>(columns: Column[], state: ColumnState): Column[] {
  if (state.order.length === 0) return columns;
  const place = new Map(state.order.map((property, index) => [property, index]));
  const named = columns
    .filter((column) => place.has(column.property))
    .sort((a, b) => (place.get(a.property) ?? 0) - (place.get(b.property) ?? 0));
  return [...named, ...columns.filter((column) => !place.has(column.property))];
}

/** The columns the table shows: in the state's order, without the hidden ones. */
export function shownColumns<Column extends Named>(columns: Column[], state: ColumnState): Column[] {
  const ordered = orderedColumns(columns, state);
  if (state.hidden.length === 0) return ordered;
  const hidden = new Set(state.hidden);
  return ordered.filter((column) => !hidden.has(column.property));
}

/** The state with one column shown or hidden. */
export function toggledColumn(state: ColumnState, property: string, shown: boolean): ColumnState {
  const others = state.hidden.filter((hidden) => hidden !== property);
  return { order: state.order, hidden: shown ? others : [...others, property] };
}

/** The state with every column shown, or every one hidden. */
export function toggledColumns(columns: Named[], state: ColumnState, shown: boolean): ColumnState {
  return { order: state.order, hidden: shown ? [] : columns.map((column) => column.property) };
}

/**
 * The state with one column moved before or after another. The order is
 * written whole — and left EMPTY when the move brought the columns back to
 * how they are configured, so "nothing changed" has one shape.
 */
export function movedColumn(
  columns: Named[],
  state: ColumnState,
  property: string,
  target: string,
  place: "before" | "after",
): ColumnState {
  const order = orderedColumns(columns, state)
    .map((column) => column.property)
    .filter((other) => other !== property);
  const at = order.indexOf(target);
  if (at < 0 || property === target) return state;
  order.splice(place === "before" ? at : at + 1, 0, property);
  const configured = columns.every((column, index) => column.property === order[index]);
  return { order: configured ? [] : order, hidden: state.hidden };
}

/** Whether the state changes anything — what Reset is for. */
export const isColumnStateChanged = (state: ColumnState): boolean => state.order.length > 0 || state.hidden.length > 0;

/** The local-storage key of a table's column state: the one configured, or one made from where its rows are. */
export const columnStateKey = (configured: string, rowsPath: string): string =>
  configured !== "" ? configured : `wirework:columns:${rowsPath}`;

/**
 * What local storage holds under the key — nothing changed when there is
 * nothing, when it is not a column state, or when the browser refuses
 * storage (a private window, blocked site data).
 */
export function readColumnState(key: string): ColumnState {
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (raw === null) return NO_COLUMN_STATE;
    const parsed = columnStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : NO_COLUMN_STATE;
  } catch {
    return NO_COLUMN_STATE;
  }
}

/** Keeps the state under the key; a state that changes nothing removes it. A refusal is not an error: the state lasts the visit. */
export function writeColumnState(key: string, state: ColumnState): void {
  try {
    if (isColumnStateChanged(state)) globalThis.localStorage.setItem(key, JSON.stringify(state));
    else globalThis.localStorage.removeItem(key);
  } catch {
    // Storage refused: nothing to keep it in.
  }
}
