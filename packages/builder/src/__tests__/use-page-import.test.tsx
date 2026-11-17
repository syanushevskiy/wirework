/**
 * usePageImport — a page file pasted, checked as it is typed, and put in
 * place of the shared page by ONE commit; gated by the edit lock; a file
 * that is refused never reaches the commit.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { exportPageFile, pageFile } from "@wirework/engine";
import type { EditLock } from "../locks";
import type { Commit } from "../use-commit";
import { usePageImport } from "../use-page-import";
import { box, counter, enginesWith, listEngine, registryWith, treesWithBoxedCounter } from "./fixtures";

const registry = registryWith(counter, box);
const layoutEngines = enginesWith(listEngine);

/** What another admin exported: the page with the boxed counter. */
function exported(page = "demo"): string {
  const file = pageFile({ viewModels: treesWithBoxedCounter().viewModels, registry, layoutEngines }, "demo");
  if (file === undefined) throw new Error("no page");
  return exportPageFile({ ...file, page });
}

function setup(editLock: EditLock | undefined = undefined) {
  const commit = vi.fn<Commit>();
  const cancelEditing = vi.fn();
  const onImported = vi.fn();
  const hook = renderHook(() =>
    usePageImport({
      registry,
      layoutEngines,
      // The importing admin's page: empty.
      viewModels: { pages: { demo: { default: { engine: "list", cells: [] } } }, widgets: {} },
      page: "demo",
      commit,
      editLock,
      cancelEditing,
      onImported,
    }),
  );
  return { commit, cancelEditing, onImported, ...hook };
}

describe("usePageImport", () => {
  it("says what a pasted file holds, and Import commits the page, ends the edit session and closes", () => {
    const { result, commit, cancelEditing, onImported } = setup();
    act(() => result.current.open());
    expect(result.current.panel).toEqual({ text: "" });
    act(() => result.current.setText(exported()));
    expect(result.current.panel?.summary).toEqual({ views: ["default"], roles: [], widgets: 2, warnings: [] });
    act(() => result.current.apply());
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0]?.[0]).toMatchObject({
      viewModels: { pages: { demo: treesWithBoxedCounter().viewModels.pages["demo"] } },
    });
    expect(cancelEditing).toHaveBeenCalledTimes(1);
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(result.current.panel).toBeUndefined();
  });

  it("says why a file is refused, and does not commit it", () => {
    const { result, commit } = setup();
    act(() => result.current.open());
    act(() => result.current.setText(exported("elsewhere")));
    expect(result.current.panel?.problem).toBe('the file is the page "elsewhere", and this is the page "demo"');
    expect(result.current.panel?.summary).toBeUndefined();
    act(() => result.current.apply());
    expect(commit).not.toHaveBeenCalled();
  });

  it("does nothing without the permission", () => {
    const { result, commit } = setup("permission");
    expect(result.current.canImport).toBe(false);
    act(() => result.current.open());
    expect(result.current.panel).toBeUndefined();
    act(() => result.current.apply());
    expect(commit).not.toHaveBeenCalled();
  });
});
