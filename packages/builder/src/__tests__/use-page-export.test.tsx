/**
 * usePageExport — the whole shared page as a file: the widgets inside a
 * container included, the user's overlay never; gated by the edit lock;
 * saved through the given `save`.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EditLock } from "../locks";
import { usePageExport } from "../use-page-export";
import { box, counter, enginesWith, listEngine, registryWith, treesWithBoxedCounter } from "./fixtures";

const route = { path: "/demo", title: "Demo", menu: true };

function setup(editLock: EditLock | undefined = undefined, page = "demo") {
  const save = vi.fn<(fileName: string, text: string) => void>();
  const trees = treesWithBoxedCounter();
  trees.userViewModels = { pages: { demo: { templates: { mine: { engine: "list", cells: [] } } } } };
  const hook = renderHook(() =>
    usePageExport({
      registry: registryWith(counter, box),
      layoutEngines: enginesWith(listEngine),
      viewModels: trees.viewModels,
      page,
      route,
      editLock,
      save,
    }),
  );
  return { save, trees, ...hook };
}

describe("usePageExport", () => {
  it("makes the page's file — views, route and the widgets down into the box — and never the user's own views", () => {
    const { result, trees } = setup();
    expect(result.current.canExport).toBe(true);
    expect(result.current.fileName).toBe("demo.page.json");
    expect(result.current.file).toEqual({
      kind: "wirework-page",
      version: 1,
      page: "demo",
      route,
      templates: trees.viewModels.pages["demo"],
      widgets: {
        "widgets.custom.custom-1": (trees.viewModels.widgets["custom"] as Record<string, unknown>)["custom-1"],
        "widgets.custom.custom-2": (trees.viewModels.widgets["custom"] as Record<string, unknown>)["custom-2"],
      },
    });
    expect(JSON.stringify(result.current.file)).not.toContain("mine");
  });

  it("opens the panel with the text, downloads through `save`, and closes", () => {
    const { result, save } = setup();
    expect(result.current.panel).toBeUndefined();
    act(() => result.current.open());
    expect(result.current.panel?.fileName).toBe("demo.page.json");
    expect(JSON.parse(result.current.panel?.text ?? "")).toEqual(result.current.file);
    act(() => result.current.download());
    expect(save).toHaveBeenCalledWith("demo.page.json", result.current.panel?.text);
    act(() => result.current.close());
    expect(result.current.panel).toBeUndefined();
  });

  it("does nothing without the permission, and for a page the tree lacks", () => {
    const locked = setup("permission");
    expect(locked.result.current.canExport).toBe(false);
    act(() => locked.result.current.open());
    act(() => locked.result.current.download());
    expect(locked.result.current.panel).toBeUndefined();
    expect(locked.save).not.toHaveBeenCalled();
    const missing = setup(undefined, "nobody");
    expect(missing.result.current.canExport).toBe(false);
    expect(missing.result.current.file).toBeUndefined();
  });
});
