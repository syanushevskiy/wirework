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
import type { EditContext } from "../page-edits";
import { DEFAULT_BUILDER_NAMING, useBuilder } from "../use-builder";
import { commitTrees, type Commit, type EditableTrees } from "../use-commit";
import { box, cell, counter, enginesWith, gridEngine, listEngine, registryWith } from "./fixtures";

const emptyPage = (): ViewModels => ({ pages: { builder: { default: { engine: "list", cells: [] } } }, widgets: {} });
const registry = registryWith(counter, box);
const layoutEngines = enginesWith(listEngine, gridEngine);

function setup(viewModels: ViewModels, canEdit = true, at?: string, context?: EditContext) {
  const store = createStore({ viewModels, userViewModels: {} });
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
        registry,
        layoutEngines,
        page: "builder",
        at,
        naming: DEFAULT_BUILDER_NAMING,
        cancelEditing,
        onAdded,
        context,
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
    expect(result.current.engineLock).toBeUndefined();
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
    expect(onAdded).toHaveBeenCalledWith({ id: "custom-1", widget: "counter", layouts: [] });
    expect(result.current.hasCells).toBe(true);
    expect(result.current.engineLock).toBe("widgets-placed");

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
    expect(result.current.engineLock).toBe("no-template");
    act(() => result.current.addWidget("counter", bindings, {}));
    expect(store.get("viewModels")).toEqual({ pages: {}, widgets: {} });
    expect(onAdded).not.toHaveBeenCalled();
  });
});

describe("useBuilder — for a role (doc/roles-design.md)", () => {
  it("places the widget in the role's own view — a copy of the shared layout with the new cell — and its template for everyone", () => {
    const shared: ViewModels = {
      pages: { builder: { default: { engine: "list", cells: [cell({ id: "custom-1" })] } } },
      widgets: { custom: { "custom-1": { default: { inputs: { value: "demo.n" } } } } },
    };
    const forAdmin: EditContext = {
      layoutEngines,
      registry,
      page: "builder",
      at: undefined,
      target: { role: "admin" },
      roles: ["admin"],
      naming: DEFAULT_BUILDER_NAMING,
      view: "default",
    };
    const { result, page, store, onAdded } = setup(shared, true, undefined, forAdmin);
    act(() => result.current.addWidget("counter", bindings, { label: "Admins too" }));
    // The shared page is as it was; the admin's view holds both cells; the template is under the builder's group.
    expect(page()).toEqual(shared.pages["builder"]?.["default"]);
    expect(store.get("viewModels.roles.admin.pages.builder")).toEqual({
      view: "admin",
      templates: {
        admin: {
          engine: "list",
          cells: [
            cell({ id: "custom-1" }),
            { id: "custom-2", widget: "counter", model: "widgets.custom.custom-2", template: "default" },
          ],
        },
      },
    });
    expect(store.get("viewModels.widgets.custom.custom-2")).toEqual({ default: { ...bindings, label: "Admins too" } });
    expect(onAdded).toHaveBeenCalledWith({ id: "custom-2", widget: "counter", layouts: [] });
  });
});

describe("useBuilder — containers (doc/containers-design.md)", () => {
  it("starts a placed container's layout empty, on the engine of the layout it is placed in, and names it to the host", () => {
    const { result, store, onAdded } = setup(emptyPage());
    act(() => result.current.setEngine("grid"));
    act(() => result.current.addWidget("box", { inputs: {}, on: {} }, { title: "Controls" }));
    expect(store.get("viewModels.widgets.custom.custom-1.default")).toEqual({
      inputs: {},
      title: "Controls",
      content: { engine: "grid", cells: [] },
    });
    expect(onAdded).toHaveBeenCalledWith({ id: "custom-1", widget: "box", layouts: ["content"] });
  });

  it("adds INTO the layout at a chain of containers, numbering from every placed widget", () => {
    const viewModels: ViewModels = {
      pages: {
        builder: {
          default: {
            engine: "list",
            cells: [{ id: "custom-1", widget: "box", model: "widgets.custom.custom-1", template: "default" }],
          },
        },
      },
      widgets: { custom: { "custom-1": { default: { content: { engine: "list", cells: [] } } } } },
    };
    const { result, store, page } = setup(viewModels, true, "custom-1");
    expect(result.current.hasCells).toBe(false);
    expect(result.current.engineLock).toBeUndefined();
    act(() => result.current.addWidget("counter", bindings, {}));
    expect(page()?.["cells"]).toHaveLength(1);
    expect(store.get("viewModels.widgets.custom.custom-1.default.content")).toEqual({
      engine: "list",
      cells: [{ id: "custom-2", widget: "counter", model: "widgets.custom.custom-2", template: "default" }],
    });
    expect(result.current.hasCells).toBe(true);
    expect(result.current.engineLock).toBe("widgets-placed");
  });

  it("has no template when the chain leads nowhere", () => {
    const { result, store } = setup(emptyPage(), true, "nobody");
    expect(result.current.engineLock).toBe("no-template");
    act(() => result.current.addWidget("counter", bindings, {}));
    expect(store.get("viewModels")).toEqual(emptyPage());
  });
});
