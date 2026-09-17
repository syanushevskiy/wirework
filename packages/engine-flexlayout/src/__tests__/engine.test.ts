/** The FlexLayout plugin: the shared engine promises, and its tree helpers. */
import { describe, expect, it } from "vitest";
import { layoutEngineProblems } from "@wirework/engine";
import { flexLayoutEngine } from "../engine";
import type { FlexLayoutModelJson } from "../schema";
import { addTab, emptyModel, reconcile, removeTab, tabIds } from "../tree";

const withTabs = (ids: string[], selected: number): FlexLayoutModelJson => ({
  global: {},
  layout: {
    type: "row",
    children: [
      { type: "tabset", id: "main", selected, children: ids.map((id) => ({ type: "tab", id, name: id, component: "cell" })) },
    ],
  },
});

const selectedOf = (model: FlexLayoutModelJson): unknown =>
  ((model.layout as { children: { selected?: number }[] }).children[0] ?? {}).selected;

describe("flexLayoutEngine", () => {
  it("keeps every layout-engine promise", () => {
    expect(layoutEngineProblems(flexLayoutEngine)).toEqual([]);
  });

  it("applyChange reconciles the library's model with the cell list", () => {
    const template = flexLayoutEngine.appendCell(flexLayoutEngine.empty(), {
      id: "a",
      widget: "w",
      model: "widgets.a",
      template: "default",
    });
    // The library reports a model that still has a tab for a removed cell and lacks "a".
    const changed = flexLayoutEngine.applyChange(template, withTabs(["gone"], 0));
    expect(tabIds(changed.model)).toEqual(["a"]);
  });
});

describe("tree helpers", () => {
  it("addTab appends to the main tabset and selects it; creates the tabset when missing", () => {
    expect(tabIds(addTab(emptyModel(), "a"))).toEqual(["a"]);
    const noTabset: FlexLayoutModelJson = { global: {}, layout: { type: "row", children: [] } };
    expect(tabIds(addTab(noTabset, "a"))).toEqual(["a"]);
    expect(selectedOf(addTab(withTabs(["a"], 0), "b"))).toBe(1);
  });

  it("regression: removing an EARLIER tab keeps the selected tab selected", () => {
    const next = removeTab(withTabs(["custom-1", "custom-2", "custom-3"], 1), "custom-1");
    expect(tabIds(next)).toEqual(["custom-2", "custom-3"]);
    expect(selectedOf(next)).toBe(0); // still custom-2
  });

  it("removing the selected tab selects a neighbour in range; a later tab leaves the index alone", () => {
    expect(selectedOf(removeTab(withTabs(["a", "b", "c"], 2), "c"))).toBe(1);
    expect(selectedOf(removeTab(withTabs(["a", "b", "c"], 0), "b"))).toBe(0);
    expect(selectedOf(removeTab(withTabs(["a"], 0), "a"))).toBe(0);
  });

  it("reconcile drops tabs without cells and adds tabs for new cells", () => {
    expect(tabIds(reconcile(withTabs(["a", "stale"], 0), ["a", "new"]))).toEqual(["a", "new"]);
  });
});
