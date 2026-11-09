/**
 * Page edits as pure functions: an op made from a context and applied to
 * plain trees — the routing by target and location without a hook around it.
 * The session that replays them is use-page-editing.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_BUILDER_NAMING } from "../use-builder";
import {
  changeLayoutOp,
  plannedInput,
  removeCellOp,
  saveWidgetOp,
  setCellViewOp,
  wrapCellOp,
  type EditContext,
} from "../page-edits";
import {
  box,
  cell,
  counter,
  enginesWith,
  listEngine,
  registryWith,
  treesWithBoxedCounter,
  treesWithCounter,
} from "./fixtures";

const context = (overrides: Partial<EditContext> = {}): EditContext => ({
  registry: registryWith(counter, box),
  layoutEngines: enginesWith(listEngine),
  page: "demo",
  at: undefined,
  target: "base",
  roles: undefined,
  naming: DEFAULT_BUILDER_NAMING,
  view: "default",
  ...overrides,
});
const emptyList = { engine: "list", cells: [] };

describe("plannedInput", () => {
  it("is the page with the user's overlay and roles, or the layout at a chain with the layers ready-made", () => {
    const trees = treesWithBoxedCounter();
    const page = plannedInput(context({ target: "user", roles: ["admin"] }), trees);
    expect(page).toEqual({ page: "demo", viewModels: trees.viewModels, userViewModels: {}, roles: ["admin"] });
    const inside = plannedInput(context({ at: "custom-2" }), trees);
    expect(inside.page).toBe("demo/custom-2");
    expect(inside.viewModels.pages).toEqual({ "demo/custom-2": { default: { engine: "list", cells: [cell()] } } });
    expect(inside.overlays).toEqual([]);
    expect(plannedInput(context({ at: "nobody" }), trees).viewModels.pages).toEqual({ "demo/nobody": {} });
  });
});

describe("the ops, by target", () => {
  it("edit the shared page in place, an overlay as its own copy, and nothing where the view does not resolve", () => {
    const trees = treesWithCounter();
    expect(changeLayoutOp(context(), emptyList)(trees).viewModels.pages["demo"]).toEqual({ default: emptyList });
    expect(changeLayoutOp(context({ target: "user" }), emptyList)(trees).userViewModels).toEqual({
      pages: { demo: { view: "my-own", templates: { "my-own": emptyList } } },
    });
    const forAdmin = changeLayoutOp(context({ target: { role: "admin" }, roles: ["admin"] }), emptyList)(trees);
    expect(forAdmin.viewModels.roles).toEqual({
      admin: { pages: { demo: { view: "admin", templates: { admin: emptyList } } } },
    });
    expect(forAdmin.viewModels.pages).toBe(trees.viewModels.pages);
    expect(changeLayoutOp(context({ view: undefined }), emptyList)(trees)).toBe(trees);
  });

  it("remove a cell with its orphaned template on the shared page, with its entry in an overlay", () => {
    const trees = treesWithCounter();
    expect(removeCellOp(context(), "custom-1")(trees).viewModels.widgets["custom"]).toEqual({});
    const overlay = { pages: { demo: { cells: { "custom-1": { view: "x" } } } } };
    const forUser = removeCellOp(context({ target: "user" }), "custom-1")({ ...trees, userViewModels: overlay });
    expect(forUser.viewModels).toBe(trees.viewModels);
    expect(forUser.userViewModels.pages?.["demo"]?.cells).toEqual({});
  });

  it("wrap only on the shared page and only in a container; choose a template only for an overlay", () => {
    expect(wrapCellOp(context({ target: "user" }), "custom-1", "box")).toBeUndefined();
    expect(wrapCellOp(context(), "custom-1", "counter")).toBeUndefined();
    const wrapped = wrapCellOp(context(), "custom-1", "box")?.(treesWithCounter());
    expect(wrapped?.viewModels.widgets["custom"]).toMatchObject({
      "custom-2": { default: { content: { cells: [cell()] } } },
    });
    expect(setCellViewOp(context(), "custom-1", "loud")).toBeUndefined();
    expect(
      setCellViewOp(context({ target: { role: "ops" } }), "custom-1", "loud")?.(treesWithCounter()).viewModels.roles,
    ).toEqual({
      ops: { pages: { demo: { cells: { "custom-1": { view: "loud" } } } } },
    });
  });

  it("save a widget's wiring on the shared page and its settings alone in an overlay, under the chain key inside a container", () => {
    const trees = treesWithBoxedCounter();
    const definition = counter;
    const inner = {
      key: "custom-1",
      widget: "counter",
      model: "widgets.custom.custom-1",
      template: "default",
      viewModel: {},
      definition,
    };
    const rewired = { inputs: { value: "demo.other" }, on: {} };
    const base = saveWidgetOp(context({ at: "custom-2" }), inner, rewired, { label: "Base" })(trees);
    expect(base.viewModels.widgets["custom"]).toMatchObject({
      "custom-1": { default: { inputs: { value: "demo.other" }, label: "Base" } },
    });
    const user = saveWidgetOp(context({ at: "custom-2", target: "user" }), inner, rewired, { label: "Mine" })(trees);
    expect(user.viewModels).toBe(trees.viewModels);
    expect(user.userViewModels).toEqual({
      pages: { demo: { cells: { "custom-2/custom-1": { settings: { default: { label: "Mine" } } } } } },
    });
  });
});
