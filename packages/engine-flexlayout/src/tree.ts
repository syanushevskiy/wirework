/**
 * Pure helpers over FlexLayout's model JSON: walk tabs, add a tab to the
 * main tabset (creating it if needed), remove a tab. Nodes are plain
 * objects `{ type: "row" | "tabset" | "tab", children?, id?, selected? }`.
 */
import { MAIN_TABSET_ID, type FlexLayoutModelJson } from "./schema";

type JsonNode = Record<string, unknown> & { type?: string; children?: unknown[] };

const isNode = (value: unknown): value is JsonNode =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const childrenOf = (node: JsonNode): JsonNode[] =>
  Array.isArray(node.children) ? node.children.filter(isNode) : [];

/** Ids of every tab in the tree, in document order. */
export function tabIds(model: FlexLayoutModelJson): string[] {
  const ids: string[] = [];
  const walk = (node: JsonNode): void => {
    if (node.type === "tab" && typeof node.id === "string") ids.push(node.id);
    childrenOf(node).forEach(walk);
  };
  walk(model.layout as JsonNode);
  return ids;
}

/** Add a tab for `cellId` to the main tabset (first tabset found, or a new one), selected. */
export function addTab(model: FlexLayoutModelJson, cellId: string): FlexLayoutModelJson {
  const tab: JsonNode = { type: "tab", id: cellId, name: cellId, component: "cell" };
  let added = false;
  const visit = (node: JsonNode): JsonNode => {
    if (!added && node.type === "tabset") {
      added = true;
      const children = [...childrenOf(node), tab];
      return { ...node, children, selected: children.length - 1 };
    }
    return Array.isArray(node.children) ? { ...node, children: childrenOf(node).map(visit) } : node;
  };
  const layout = visit(model.layout as JsonNode);
  if (added) return { ...model, layout };
  // No tabset anywhere: create the main one under the root row.
  const tabset: JsonNode = { type: "tabset", id: MAIN_TABSET_ID, children: [tab], selected: 0 };
  return { ...model, layout: { ...layout, children: [...childrenOf(layout), tabset] } };
}

/**
 * Remove the tab for `cellId`. The tab the user had SELECTED stays
 * selected: removing an earlier tab shifts the index down (it used to stay,
 * silently showing the next tab — team-tiger review, Sasha); removing the
 * selected tab itself selects its neighbour, kept in range.
 */
export function removeTab(model: FlexLayoutModelJson, cellId: string): FlexLayoutModelJson {
  const visit = (node: JsonNode): JsonNode => {
    if (!Array.isArray(node.children)) return node;
    const before = childrenOf(node);
    const removedAt = before.findIndex((child) => child.type === "tab" && child.id === cellId);
    const children = before.filter((_, index) => index !== removedAt).map(visit);
    if (typeof node.selected !== "number") return { ...node, children };
    const shifted = removedAt !== -1 && removedAt < node.selected ? node.selected - 1 : node.selected;
    return { ...node, children, selected: Math.min(shifted, Math.max(0, children.length - 1)) };
  };
  return { ...model, layout: visit(model.layout as JsonNode) };
}

/**
 * Make the model agree with the cell list (the source of truth): drop tabs
 * whose cell is gone, add a tab for every cell without one. The library may
 * report a change from a model instance that predates our last edit.
 */
export function reconcile(model: FlexLayoutModelJson, cellIds: readonly string[]): FlexLayoutModelJson {
  const wanted = new Set(cellIds);
  const present = new Set(tabIds(model));
  const pruned = tabIds(model)
    .filter((id) => !wanted.has(id))
    .reduce((current, id) => removeTab(current, id), model);
  return cellIds.filter((id) => !present.has(id)).reduce((current, id) => addTab(current, id), pruned);
}

/** An empty model: one root row holding the (empty) main tabset. */
export function emptyModel(): FlexLayoutModelJson {
  return {
    global: {},
    layout: { type: "row", children: [{ type: "tabset", id: MAIN_TABSET_ID, children: [] }] },
  };
}
