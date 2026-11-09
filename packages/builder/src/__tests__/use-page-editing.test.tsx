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
import { DEFAULT_BUILDER_NAMING } from "../use-builder";
import type { Commit, EditableTrees } from "../use-commit";
import type { EditTarget } from "../page-edits";
import { usePageEditing } from "../use-page-editing";
import {
  actions,
  box,
  cell,
  counter,
  enginesWith,
  listEngine,
  registryWith,
  treesWithBoxedCounter,
  treesWithCounter,
} from "./fixtures";

interface Props {
  canEdit: boolean;
  target: EditTarget;
  roles?: readonly string[] | undefined;
  trees: EditableTrees;
  at?: string | undefined;
}

function setup(overrides: Partial<Props> = {}) {
  const commit = vi.fn<Commit>();
  const initialProps: Props = {
    canEdit: true,
    target: "base",
    trees: treesWithCounter(),
    ...overrides,
  };
  const hook = renderHook(
    (props: Props) =>
      usePageEditing({
        commit,
        registry: registryWith(counter, box),
        layoutEngines: enginesWith(listEngine),
        actions: actions(),
        page: "demo",
        naming: DEFAULT_BUILDER_NAMING,
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

  it("a change the engine refuses throws at the moment it is made, and counts nothing", () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    expect(() => act(() => result.current.changeLayout({ engine: "list", cells: "nope" }))).toThrow();
    expect(result.current.pendingChanges).toBe(0);
    expect(result.current.cells).toHaveLength(1);
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
    const { result, initialProps } = setup({ target: "user" });
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

  it("copies a shown PREBUILT view into the user's own 'my-own' — numbered when that name is taken", () => {
    const { result } = setup({ target: "user" });
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout(emptyList));
    expect(result.current.shownUserViewModels?.pages?.["demo"]).toEqual({
      view: "my-own",
      templates: { "my-own": emptyList },
    });

    const trees = treesWithCounter();
    trees.userViewModels = { pages: { demo: { view: "default", templates: { "my-own": emptyList } } } };
    const taken = setup({ target: "user", trees });
    act(() => taken.result.current.startEditing());
    act(() => taken.result.current.changeLayout(emptyList));
    expect(taken.result.current.shownUserViewModels?.pages?.["demo"]).toMatchObject({
      view: "my-own-2",
      templates: { "my-own": emptyList, "my-own-2": emptyList },
    });
  });

  it("edits a shown USER view in place", () => {
    const trees = treesWithCounter();
    const mine = { engine: "list", cells: [cell()] };
    trees.userViewModels = { pages: { demo: { view: "mine", templates: { mine } } } };
    const { result } = setup({ target: "user", trees });
    act(() => result.current.startEditing());
    act(() => result.current.removeCellById("custom-1"));
    expect(result.current.shownUserViewModels?.pages?.["demo"]).toMatchObject({
      view: "mine",
      templates: { mine: emptyList },
    });
    expect(Object.keys(result.current.shownUserViewModels?.pages?.["demo"]?.templates ?? {})).toEqual(["mine"]);
  });

  describe("for a ROLE (doc/roles-design.md): the same ops, written into the role's entry", () => {
    const admin = { role: "admin" } as const;
    const withRole = () => {
      const trees = treesWithCounter();
      trees.viewModels.widgets["custom"] = {
        "custom-1": {
          default: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] } },
          loud: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] }, label: "LOUD" },
        },
      };
      return trees;
    };

    it("copies a shown prebuilt view into the role's own, named after the role, and shows the page as the role sees it", () => {
      const { result, initialProps } = setup({ target: admin, roles: ["admin"], trees: withRole() });
      act(() => result.current.startEditing());
      act(() => result.current.changeLayout(emptyList));
      expect(result.current.shownViewModels.roles).toEqual({
        admin: { pages: { demo: { view: "admin", templates: { admin: emptyList } } } },
      });
      expect(result.current.shownViewModels.pages).toEqual(initialProps.trees.viewModels.pages);
      expect(result.current.shownUserViewModels).toBeUndefined();
      expect(result.current.activeView).toBe("admin");
      expect(result.current.cells).toHaveLength(0);
    });

    it("writes a widget's settings and its chosen template into the role's entry, the shared page untouched", () => {
      const { result, initialProps } = setup({ target: admin, roles: ["admin"], trees: withRole() });
      act(() => result.current.startEditing());
      act(() => result.current.setCellView("custom-1", "loud"));
      expect(result.current.cells[0]?.template).toBe("loud");
      act(() => result.current.selectCell("custom-1"));
      const editing = result.current.editingCell;
      if (!editing) throw new Error("no cell selected");
      act(() => result.current.saveWidget(editing, { inputs: { value: "demo.other" }, on: {} }, { label: "Admin" }));
      expect(result.current.shownViewModels.roles).toEqual({
        admin: { pages: { demo: { cells: { "custom-1": { view: "loud", settings: { loud: { label: "Admin" } } } } } } },
      });
      expect(result.current.shownViewModels.widgets).toEqual(initialProps.trees.viewModels.widgets);
      expect(result.current.cells[0]?.viewModel).toMatchObject({ inputs: { value: "demo.count" }, label: "Admin" });
    });

    it("a user's view beats the role's while both are shown; a shared-page target chooses no template", () => {
      const trees = withRole();
      trees.viewModels.roles = { admin: { pages: { demo: { cells: { "custom-1": { view: "loud" } } } } } };
      trees.userViewModels = { pages: { demo: { cells: { "custom-1": { view: "default" } } } } };
      const asUser = setup({ target: "user", roles: ["admin"], trees });
      expect(asUser.result.current.cells[0]?.template).toBe("default");
      const asAdmin = setup({ target: admin, roles: ["admin"], trees });
      expect(asAdmin.result.current.cells[0]?.template).toBe("loud");
      const { result } = setup({ trees });
      act(() => result.current.startEditing());
      act(() => result.current.setCellView("custom-1", "loud"));
      expect(result.current.pendingChanges).toBe(0);
    });
  });

  it("closes the editor when the edit target or the location changes under it", () => {
    const { result, rerender, initialProps } = setup({ trees: treesWithBoxedCounter(), at: "custom-2" });
    act(() => result.current.startEditing());
    act(() => result.current.selectCell("custom-1"));
    expect(result.current.editingCell).toBeDefined();

    rerender({ ...initialProps, target: "user" });
    expect(result.current.editingCell).toBeUndefined();
    rerender(initialProps);
    act(() => result.current.selectCell("custom-1"));
    expect(result.current.editingCell).toBeDefined();
    rerender({ ...initialProps, at: undefined });
    expect(result.current.editingCell).toBeUndefined();
  });

  it("a session survives a change of location: every op lands where it was made", () => {
    const { result, rerender, initialProps } = setup({ trees: treesWithBoxedCounter() });
    act(() => result.current.startEditing());
    const boxOnly = [cell({ id: "custom-2", widget: "box", model: "widgets.custom.custom-2" })];
    act(() => result.current.changeLayout({ engine: "list", cells: boxOnly }));
    rerender({ ...initialProps, at: "custom-2" });
    act(() => result.current.changeLayout(emptyList));
    expect(result.current.pendingChanges).toBe(2);
    expect(result.current.shownViewModels.pages["demo"]?.["default"]).toMatchObject({ cells: [{ id: "custom-2" }] });
    expect(result.current.shownViewModels.widgets["custom"]).toMatchObject({
      "custom-2": { default: { content: emptyList } },
    });
  });

  it("the role target: a role's own copy under a container, and the inner cell under its chain key — the commit carries them", () => {
    const admin = { role: "admin" } as const;
    const { result, commit } = setup({
      target: admin,
      roles: ["admin"],
      trees: treesWithBoxedCounter(),
      at: "custom-2",
    });
    act(() => result.current.startEditing());
    act(() => result.current.selectCell("custom-1"));
    const editing = result.current.editingCell;
    if (!editing) throw new Error("no cell selected");
    act(() => result.current.saveWidget(editing, { inputs: {}, on: {} }, { label: "Admin's" }));
    act(() => result.current.changeLayout(emptyList));
    act(() => result.current.save());
    const committed = commit.mock.calls[0]?.[0];
    expect(committed && "viewModels" in committed ? committed.viewModels.roles : undefined).toEqual({
      admin: {
        pages: {
          demo: {
            cells: {
              "custom-2/custom-1": { settings: { default: { label: "Admin's" } } },
              "custom-2": { settings: { default: { content: emptyList } } },
            },
          },
        },
      },
    });
    expect(committed && "viewModels" in committed ? committed.viewModels.widgets : undefined).toEqual(
      treesWithBoxedCounter().viewModels.widgets,
    );
  });

  it("offers the editing cell's templates to a role's editor only, and choosing one is the role's view for the cell", () => {
    const trees = treesWithCounter();
    trees.viewModels.widgets["custom"] = {
      "custom-1": {
        default: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] } },
        loud: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] }, label: "LOUD" },
      },
    };
    const asAdmin = setup({ target: { role: "admin" }, roles: ["admin"], trees });
    act(() => asAdmin.result.current.startEditing());
    act(() => asAdmin.result.current.selectCell("custom-1"));
    expect(asAdmin.result.current.templateChoice).toMatchObject({ names: ["default", "loud"], chosen: "default" });
    act(() => asAdmin.result.current.templateChoice?.choose("loud"));
    expect(asAdmin.result.current.editingCell?.template).toBe("loud");
    expect(asAdmin.result.current.templateChoice?.chosen).toBe("loud");
    expect(asAdmin.result.current.shownViewModels.roles?.["admin"]?.pages?.["demo"]?.cells).toEqual({
      "custom-1": { view: "loud" },
    });
    // Not for the user's own view, nor on the shared page; nor for a widget with one template.
    for (const target of ["user", "base"] as const) {
      const other = setup({ target, roles: ["admin"], trees });
      act(() => other.result.current.startEditing());
      act(() => other.result.current.selectCell("custom-1"));
      expect(other.result.current.templateChoice).toBeUndefined();
    }
    const one = setup({ target: { role: "admin" }, roles: ["admin"], trees: treesWithCounter() });
    act(() => one.result.current.startEditing());
    act(() => one.result.current.selectCell("custom-1"));
    expect(one.result.current.templateChoice).toBeUndefined();
  });

  it("a role shown a lower role's view copies it under the role's own name", () => {
    const trees = treesWithCounter();
    trees.viewModels.roles = { qa: { pages: { demo: { view: "qa", templates: { qa: emptyList } } } } };
    const { result } = setup({ target: { role: "admin" }, roles: ["qa", "admin"], trees });
    expect(result.current.activeView).toBe("qa");
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout({ engine: "list", cells: [cell()] }));
    expect(result.current.shownViewModels.roles).toEqual({
      qa: { pages: { demo: { view: "qa", templates: { qa: emptyList } } } },
      admin: { pages: { demo: { view: "admin", templates: { admin: { engine: "list", cells: [cell()] } } } } },
    });
  });
});

describe("usePageEditing — layouts inside containers (doc/containers-design.md)", () => {
  it("shows the layout at a chain as the page, under its nested name, and edits it in place", () => {
    const { result, commit } = setup({ trees: treesWithBoxedCounter(), at: "custom-2" });
    expect(result.current.layoutPage).toBe("demo/custom-2");
    expect(result.current.cells.map((cell) => cell.key)).toEqual(["custom-1"]);
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout(emptyList));
    expect(result.current.cells).toEqual([]);
    // The page's own layout is untouched: the op went into the box's template.
    expect(result.current.shownViewModels.pages?.["demo"]).toEqual(treesWithBoxedCounter().viewModels.pages["demo"]);
    expect(result.current.shownViewModels.widgets["custom"]).toMatchObject({
      "custom-2": { default: { title: "Boxed", content: emptyList } },
    });
    act(() => result.current.save());
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("with the overlay on, edits the layout inside a container as the USER's own copy — the container's setting in the overlay — and shows it", () => {
    const { result, initialProps, commit } = setup({
      trees: treesWithBoxedCounter(),
      at: "custom-2",
      target: "user",
    });
    expect(result.current.cells.map((cell) => cell.key)).toEqual(["custom-1"]);
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout(emptyList));
    expect(result.current.cells).toEqual([]);
    // The shared page is untouched: the op went into the user's settings for the box.
    expect(result.current.shownViewModels).toBe(initialProps.trees.viewModels);
    expect(result.current.shownUserViewModels).toEqual({
      pages: { demo: { cells: { "custom-2": { settings: { default: { content: emptyList } } } } } },
    });
    act(() => result.current.save());
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("customises a widget inside a container under its chain key, and shows it so", () => {
    const { result } = setup({ trees: treesWithBoxedCounter(), at: "custom-2", target: "user" });
    act(() => result.current.startEditing());
    act(() => result.current.selectCell("custom-1"));
    const editing = result.current.editingCell;
    if (!editing) throw new Error("no cell selected");
    act(() => result.current.saveWidget(editing, { inputs: {}, on: {} }, { label: "Mine" }));
    expect(result.current.shownUserViewModels).toEqual({
      pages: { demo: { cells: { "custom-2/custom-1": { settings: { default: { label: "Mine" } } } } } },
    });
    const shown = result.current.plan.problem === undefined ? result.current.plan.cells[0]?.viewModel : undefined;
    expect(shown).toMatchObject({ label: "Mine" });
  });

  it("keeps the user's own layout inside a container when the container's own form is saved in their view", () => {
    const trees = treesWithBoxedCounter();
    trees.userViewModels = {
      pages: { demo: { cells: { "custom-2": { settings: { default: { content: emptyList } } } } } },
    };
    const { result } = setup({ trees, target: "user" });
    act(() => result.current.startEditing());
    act(() => result.current.selectCell("custom-2"));
    const editing = result.current.editingCell;
    if (!editing) throw new Error("no cell selected");
    act(() => result.current.saveWidget(editing, { inputs: {}, on: {} }, { title: "Mine" }));
    expect(result.current.shownUserViewModels?.pages?.["demo"]?.cells?.["custom-2"]).toEqual({
      settings: { default: { content: emptyList, title: "Mine" } },
    });
  });

  it("removes a cell from the user's own layout inside a container with its overlay entry under the chain key", () => {
    const trees = treesWithBoxedCounter();
    trees.userViewModels = {
      pages: { demo: { cells: { "custom-2/custom-1": { settings: { default: { label: "Mine" } } } } } },
    };
    const { result } = setup({ trees, at: "custom-2", target: "user" });
    act(() => result.current.startEditing());
    act(() => result.current.removeCellById("custom-1"));
    expect(result.current.cells).toEqual([]);
    expect(result.current.shownUserViewModels).toEqual({
      pages: { demo: { cells: { "custom-2": { settings: { default: { content: emptyList } } } } } },
    });
  });

  it("the user's commit under a container carries the user's copy and nothing else; a container's own form keeps its layout", () => {
    const { result, commit, initialProps } = setup({ trees: treesWithBoxedCounter(), at: "custom-2", target: "user" });
    act(() => result.current.startEditing());
    act(() => result.current.changeLayout(emptyList));
    act(() => result.current.save());
    expect(commit.mock.calls[0]?.[0]).toEqual({
      viewModels: initialProps.trees.viewModels,
      userViewModels: { pages: { demo: { cells: { "custom-2": { settings: { default: { content: emptyList } } } } } } },
    });

    // On the shared page, saving the box's own form (no layout in it) keeps the layout the box holds.
    const base = setup({ trees: treesWithBoxedCounter() });
    act(() => base.result.current.startEditing());
    act(() => base.result.current.selectCell("custom-2"));
    const editing = base.result.current.editingCell;
    if (!editing) throw new Error("no cell selected");
    act(() => base.result.current.saveWidget(editing, { inputs: {}, on: {} }, { title: "Renamed" }));
    expect(base.result.current.shownViewModels.widgets["custom"]).toMatchObject({
      "custom-2": { default: { title: "Renamed", content: { engine: "list", cells: [cell()] } } },
    });
  });

  it("is a page without a template when the chain leads nowhere", () => {
    const { result } = setup({ trees: treesWithBoxedCounter(), at: "nobody" });
    expect(result.current.plan.problem).toMatch(/no template/);
    expect(result.current.engine).toBeUndefined();
  });

  it("removes a container with the templates of the cells inside it that nothing references any more", () => {
    const { result } = setup({ trees: treesWithBoxedCounter() });
    act(() => result.current.startEditing());
    act(() => result.current.removeCellById("custom-2"));
    expect(result.current.cells).toEqual([]);
    expect(result.current.shownViewModels.widgets["custom"]).toEqual({});
  });

  it("keeps an inner cell's template while a layout still references it", () => {
    const trees = treesWithBoxedCounter();
    // The counter sits in the box AND on the page.
    trees.viewModels.pages = {
      demo: {
        default: {
          engine: "list",
          cells: [cell({ id: "custom-2", widget: "box", model: "widgets.custom.custom-2" }), cell()],
        },
      },
    };
    const { result } = setup({ trees });
    act(() => result.current.startEditing());
    act(() => result.current.removeCellById("custom-2"));
    expect(Object.keys(result.current.shownViewModels.widgets["custom"] as object)).toEqual(["custom-1"]);
  });

  it("wraps a cell in a container: a new container cell holding the cell on an empty layout of the same engine", () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.wrapCell("custom-1", "box"));
    expect(result.current.pendingChanges).toBe(1);
    expect(result.current.cells.map((cell) => [cell.key, cell.widget])).toEqual([["custom-2", "box"]]);
    expect(result.current.shownViewModels.widgets["custom"]).toEqual({
      ...(treesWithCounter().viewModels.widgets["custom"] as Record<string, unknown>),
      "custom-2": { default: { content: { engine: "list", cells: [cell()] } } },
    });
  });

  it("wraps nothing in a widget that contains no layout, nor in a user's view", () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => result.current.wrapCell("custom-1", "counter"));
    expect(result.current.pendingChanges).toBe(0);
    const user = setup({ target: "user" });
    act(() => user.result.current.startEditing());
    act(() => user.result.current.wrapCell("custom-1", "box"));
    expect(user.result.current.pendingChanges).toBe(0);
  });
});
