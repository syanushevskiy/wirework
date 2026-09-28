/**
 * useBuilder — the page a builder adds to: the engine is a free choice until
 * the first widget is placed and locked from then on; a placed widget gets a
 * numbered id and a builder-owned template; nothing is written without the
 * permission or without a page template to append to. Every write goes
 * through `commit` (the store, then the host).
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ViewModels } from "@wirework/schema";
import { createStore } from "@wirework/store";
import { DEFAULT_BUILDER_NAMING, useBuilder } from "../use-builder";
import { commitTrees, type Commit, type EditableTrees } from "../use-commit";
import { enginesWith, gridEngine, listEngine } from "./fixtures";

const emptyPage = (): ViewModels => ({ pages: { builder: { default: { engine: "list", cells: [] } } }, widgets: {} });

function setup(viewModels: ViewModels, canEdit = true) {
  const store = createStore({ viewModels });
  const saved: EditableTrees[] = [];
  const commit: Commit = (next) => commitTrees(store, (trees) => void saved.push(trees), next);
  const cancelEditing = vi.fn();
  const onAdded = vi.fn();
  const hook = renderHook(
    ({ canEdit }) =>
      useBuilder({
        store,
        commit,
        canEdit,
        layoutEngines: enginesWith(listEngine, gridEngine),
        page: "builder",
        naming: DEFAULT_BUILDER_NAMING,
        cancelEditing,
        onAdded,
      }),
    { initialProps: { canEdit } },
  );
  const page = () => store.get<ViewModels>("viewModels")?.pages?.["builder"]?.["default"];
  return { store, saved, cancelEditing, onAdded, page, ...hook };
}

const bindings = { inputs: { value: "builder.counter.value" }, on: { changed: [{ set: "builder.counter.value" }] } };

describe("useBuilder", () => {
  it("lets the engine be chosen while the page is empty, and locks it once a widget is placed", () => {
    const { result, page, cancelEditing, onAdded, store } = setup(emptyPage());
    expect(result.current.engineLocked).toBe(false);
    expect(result.current.hasCells).toBe(false);

    act(() => result.current.setEngine("grid"));
    expect(page()).toEqual({ engine: "grid", cells: [] });
    expect(cancelEditing).toHaveBeenCalledTimes(1);

    act(() => result.current.addWidget("counter", bindings, { label: "Hits" }));
    expect(page()).toEqual({
      engine: "grid",
      cells: [{ id: "custom-1", widget: "counter", model: "widgets.custom.custom-1", template: "default" }],
    });
    expect(store.get("viewModels.widgets.custom.custom-1")).toEqual({ default: { ...bindings, label: "Hits" } });
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(result.current.hasCells).toBe(true);
    expect(result.current.engineLocked).toBe(true);

    act(() => result.current.setEngine("list"));
    expect(page()?.["engine"]).toBe("grid");
    expect(cancelEditing).toHaveBeenCalledTimes(1);
  });

  it("numbers the placed widgets from what the page already holds, and hands every commit to the host", async () => {
    const { result, page, saved } = setup(emptyPage());
    act(() => result.current.addWidget("counter", bindings, {}));
    act(() => result.current.addWidget("counter", bindings, {}));
    expect(page()?.["cells"]).toHaveLength(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved).toHaveLength(2);
    expect(Object.keys(saved[1]?.viewModels.widgets["custom"] as object)).toEqual(["custom-1", "custom-2"]);
  });

  it("writes nothing without the permission", () => {
    const { result, page, saved, onAdded } = setup(emptyPage(), false);
    act(() => result.current.setEngine("grid"));
    act(() => result.current.addWidget("counter", bindings, {}));
    expect(page()).toEqual({ engine: "list", cells: [] });
    expect(saved).toEqual([]);
    expect(onAdded).not.toHaveBeenCalled();
  });

  it("writes nothing when the page has no template to append to", () => {
    const { result, store, onAdded } = setup({ pages: {}, widgets: {} });
    expect(result.current.engineLocked).toBe(true);
    act(() => result.current.addWidget("counter", bindings, {}));
    expect(store.get("viewModels")).toEqual({ pages: {}, widgets: {} });
    expect(onAdded).not.toHaveBeenCalled();
  });
});
