/**
 * usePageEditing — one edit session per page: nothing changes outside a
 * session or without the permission; a session replays its ops on the
 * shown page and commits them on Save (`committed`), commits nothing when
 * untouched (`unchanged`), and is refused when the permission went away
 * (`refused`); Cancel drops everything. Edits route to the shared page or
 * the user's own overlay by `target`.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Commit, EditableTrees } from "../use-commit";
import { usePageEditing, type EditTarget } from "../use-page-editing";
import { actions, cell, counter, enginesWith, listEngine, registryWith, treesWithCounter } from "./fixtures";

interface Props {
  canEdit: boolean;
  target: EditTarget;
  withUserOverlay: boolean;
  trees: EditableTrees;
}

function setup(overrides: Partial<Props> = {}) {
  const commit = vi.fn<Commit>();
  const initialProps: Props = {
    canEdit: true,
    target: "base",
    withUserOverlay: false,
    trees: treesWithCounter(),
    ...overrides,
  };
  const hook = renderHook(
    (props: Props) =>
      usePageEditing({
        commit,
        registry: registryWith(counter),
        layoutEngines: enginesWith(listEngine),
        actions: actions(),
        page: "demo",
        modelNamespace: "widgets.custom",
        ...props,
      }),
    { initialProps },
  );
  return { commit, initialProps, ...hook };
}

const emptyList = { engine: "list", cells: [] };

afterEach(() => vi.restoreAllMocks());

describe("usePageEditing — the session", () => {
  it("saves nothing without a session, and nothing from a session that changed nothing", () => {
    const { result, commit } = setup();
    expect(result.current.editing).toBe(false);
    expect(result.current.save()).toBe("unchanged");

    act(() => result.current.startEditing());
    expect(result.current.editing).toBe(true);
    expect(result.current.pendingChanges).toBe(0);
    let outcome;
    act(() => {
      outcome = result.current.save();
    });
    expect(outcome).toBe("unchanged");
    expect(result.current.editing).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it("does not open without the permission", () => {
    const { result } = setup({ canEdit: false });
    act(() => result.current.startEditing());
    expect(result.current.editing).toBe(false);
  });

  it("replays a layout change on the shown page and commits it on Save", () => {
    const { result, commit, initialProps } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout(emptyList));
    expect(result.current.pendingChanges).toBe(1);
    expect(result.current.cells).toEqual([]);
    expect(result.current.shownViewModels.pages?.["demo"]?.["default"]).toEqual(emptyList);

    let outcome;
    act(() => {
      outcome = result.current.save();
    });
    expect(outcome).toBe("committed");
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0]?.[0]).toEqual({
      viewModels: { ...initialProps.trees.viewModels, pages: { demo: { default: emptyList } } },
      userViewModels: {},
    });
    expect(result.current.editing).toBe(false);
  });

  it("reports a change the engine refuses and counts nothing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout({ engine: "list", cells: "nope" }));
    expect(result.current.pendingChanges).toBe(0);
    expect(result.current.cells).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('does not fit the "list" engine');
  });

  it("refuses to commit a session whose permission went away", () => {
    const { result, commit, rerender, initialProps } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout(emptyList));
    rerender({ ...initialProps, canEdit: false });

    let outcome;
    act(() => {
      outcome = result.current.save();
    });
    expect(outcome).toBe("refused");
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.editing).toBe(false);
  });

  it("drops every op on Cancel", () => {
    const { result, commit } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout(emptyList));
    act(() => result.current.cancel());
    expect(result.current.editing).toBe(false);
    expect(result.current.pendingChanges).toBe(0);
    expect(result.current.cells).toHaveLength(1);
    expect(commit).not.toHaveBeenCalled();
  });

  it("changes nothing outside a session", () => {
    const { result } = setup();
    act(() => result.current.changeLayout(emptyList));
    act(() => result.current.removeCellById("custom-1"));
    act(() => result.current.selectCell("custom-1"));
    expect(result.current.cells).toHaveLength(1);
    expect(result.current.pendingChanges).toBe(0);
    expect(result.current.editingCell).toBeUndefined();
  });
});

describe("usePageEditing — the ops", () => {
  it("removes a cell, and with it the builder-owned template nobody references any more", () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.removeCellById("custom-1"));
    expect(result.current.cells).toEqual([]);
    expect(result.current.shownViewModels.widgets["custom"]).toEqual({});
  });

  it("keeps a template the page author owns when its cell is removed", () => {
    const trees = treesWithCounter();
    trees.viewModels.pages = { demo: { default: { engine: "list", cells: [cell({ model: "widgets.theirs" })] } } };
    trees.viewModels.widgets = {
      theirs: { default: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] } } },
    };
    const { result } = setup({ trees });
    act(() => result.current.startEditing());
    act(() => result.current.removeCellById("custom-1"));
    expect(result.current.cells).toEqual([]);
    expect(result.current.shownViewModels.widgets["theirs"]).toBe(trees.viewModels.widgets["theirs"]);
  });

  it("rewrites a widget's inputs, reactions and settings on the shared page", () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.selectCell("custom-1"));
    const editing = result.current.editingCell;
    expect(editing?.key).toBe("custom-1");
    if (!editing) throw new Error("no cell selected");

    const rewired = { inputs: { value: "demo.other" }, on: { changed: [{ set: "demo.other" }] } };
    act(() => result.current.saveWidget(editing, rewired, { label: "Total" }));
    expect(result.current.editingCell).toBeUndefined();
    expect(result.current.plan.problem === undefined && result.current.plan.cells[0]?.viewModel).toEqual({
      ...rewired,
      label: "Total",
    });
    expect(result.current.shownViewModels.widgets["custom"]).toEqual({
      "custom-1": { default: { ...rewired, label: "Total" } },
    });
  });

  it("writes settings only into the user's overlay, and leaves the shared page alone", () => {
    const { result, initialProps } = setup({ target: "user", withUserOverlay: true });
    act(() => result.current.startEditing());
    act(() => result.current.selectCell("custom-1"));
    const editing = result.current.editingCell;
    if (!editing) throw new Error("no cell selected");

    const rewired = { inputs: { value: "demo.other" }, on: { changed: [{ set: "demo.other" }] } };
    act(() => result.current.saveWidget(editing, rewired, { label: "Mine" }));
    expect(result.current.shownViewModels).toBe(initialProps.trees.viewModels);
    expect(result.current.shownUserViewModels).toEqual({
      pages: { demo: { cells: { "custom-1": { settings: { default: { label: "Mine" } } } } } },
    });
    const shown = result.current.plan.problem === undefined ? result.current.plan.cells[0]?.viewModel : undefined;
    expect(shown).toEqual({ inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] }, label: "Mine" });
  });

  it("closes the editor when the edit target changes under it", () => {
    const { result, rerender, initialProps } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.selectCell("custom-1"));
    expect(result.current.editingCell).toBeDefined();

    rerender({ ...initialProps, target: "user", withUserOverlay: true });
    expect(result.current.editingCell).toBeUndefined();
  });
});
