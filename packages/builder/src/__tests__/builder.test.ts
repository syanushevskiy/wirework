/**
 * The builder's pure logic: ids derived from what is taken, the yes/no/not-set
 * cycle, argument drafts, what a save keeps of a reaction it does not show,
 * and the one write path — the store first, then the host with what the
 * store holds.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { SettingField } from "@wirework/schema";
import { createStore } from "@wirework/store";
import type { EditableTrees, SaveTrees } from "../use-commit";
import { commitTrees } from "../use-commit";
import { DEFAULT_BUILDER_NAMING, modelNamespaceOf, numberedIds } from "../use-builder";
import { argumentsOf, editedReaction, nextParamValue, type EventField, type ParamDraft } from "../use-widget-form";

describe("numberedIds", () => {
  const next = numberedIds("custom");

  it("starts at 1 and continues past the highest taken number, gaps included", () => {
    expect(next([])).toBe("custom-1");
    expect(next(["custom-1"])).toBe("custom-2");
    expect(next(["custom-1", "custom-3"])).toBe("custom-4");
    expect(next(["custom-3", "custom-1"])).toBe("custom-4");
  });

  it("counts only its own prefix with a number after it", () => {
    expect(next(["custom-abc", "other-9", "custom", "custom-"])).toBe("custom-1");
    expect(next(["custom-007"])).toBe("custom-8");
    expect(next(["custom-2", "customer-5"])).toBe("custom-3");
  });

  it("is the default naming's id scheme, under widgets.custom", () => {
    expect(DEFAULT_BUILDER_NAMING.cellId(["custom-1"])).toBe("custom-2");
    expect(modelNamespaceOf(DEFAULT_BUILDER_NAMING)).toBe("widgets.custom");
    expect(modelNamespaceOf({ ...DEFAULT_BUILDER_NAMING, modelGroup: "mine" })).toBe("widgets.mine");
  });
});

describe("nextParamValue", () => {
  const param = (value: string | boolean, unset: boolean, required: boolean): ParamDraft => ({
    name: "flag",
    kind: "boolean",
    required,
    value,
    unset,
    state: unset ? "unset" : value === true ? "yes" : "no",
    stateLabel: "",
  });

  it("cycles an optional yes/no through not set, yes, no and back to not set", () => {
    expect(nextParamValue(param(false, true, false))).toBe(true);
    expect(nextParamValue(param(true, false, false))).toBe(false);
    expect(nextParamValue(param(false, false, false))).toBeUndefined();
  });

  it("never lets a required yes/no go back to not set", () => {
    expect(nextParamValue(param(false, true, true))).toBe(true);
    expect(nextParamValue(param(true, false, true))).toBe(false);
    expect(nextParamValue(param(false, false, true))).toBe(true);
  });
});

describe("argumentsOf", () => {
  const fields = [
    { name: "url", kind: "text", required: true },
    { name: "size", kind: "number", required: false },
    { name: "columns", kind: "json", required: false },
    { name: "flag", kind: "boolean", required: false },
  ] as const;

  it("reads every kind of draft into a value, and leaves blank ones out as not set", () => {
    const { params, values } = argumentsOf(fields, { url: "/x", size: "1e3", columns: '{"a":1}', flag: true });
    expect(values).toEqual({ url: "/x", size: 1000, columns: { a: 1 }, flag: true });
    expect(params.map((param) => param.unset)).toEqual([false, false, false, false]);

    const blank = argumentsOf(fields, { url: "  ", size: "" });
    expect(blank.values).toEqual({});
    expect(blank.params.map((param) => param.unset)).toEqual([true, true, true, true]);
  });

  it("keeps a draft that cannot be read out of the values and says why", () => {
    const { params, values } = argumentsOf(fields, { size: "ten", columns: "{oops" });
    expect(values).toEqual({});
    expect(params.find((param) => param.name === "size")?.error).toBe("not a number");
    expect(params.find((param) => param.name === "columns")?.error).toBe("not valid JSON");
  });

  it("shows a yes/no parameter's three answers and a select's options", () => {
    const withSelect: SettingField[] = [{ name: "mode", kind: "select", required: false, options: ["a", "b"] }];
    const { params } = argumentsOf(withSelect, { mode: "b" });
    expect(params[0]).toMatchObject({ choice: "b", choices: [{ value: "a", label: "a" }, { value: "b", label: "b" }] });
    const { params: none } = argumentsOf(withSelect, {});
    expect(none[0]?.choice).toBeUndefined();
    const { params: flag } = argumentsOf(fields, { flag: true });
    expect(flag.find((param) => param.name === "flag")).toMatchObject({ state: "yes", stateLabel: "yes" });
  });
});

describe("editedReaction — what a save keeps of a reaction the form does not show", () => {
  const event = (draft: Partial<EventField>): EventField => ({
    name: "clicked",
    required: false,
    actions: [],
    kind: "set",
    kindChoices: [],
    set: "",
    from: "",
    fromChoice: "",
    call: "",
    actionChoices: [],
    params: [],
    arguments: {},
    kept: 0,
    ...draft,
  });

  it("keeps a call's `with` the form cannot show while the action is unchanged, and drops it when it changed", () => {
    const original = { call: "runs/load", with: { page: 2 } };
    expect(editedReaction(event({ kind: "call", call: "runs/load" }), original)).toBe(original);
    expect(editedReaction(event({ kind: "call", call: "nav/go" }), original)).toEqual({ call: "nav/go" });
  });

  it("saves exactly the form's arguments when the action declares parameters", () => {
    const params = [{ name: "into", kind: "text", required: true, value: "runs", unset: false, state: "no", stateLabel: "" }] as ParamDraft[];
    expect(editedReaction(event({ kind: "call", call: "table-view/load", params, arguments: { into: "runs" } }), { call: "table-view/load", with: { into: "old" } }))
      .toEqual({ call: "table-view/load", with: { into: "runs" } });
    expect(editedReaction(event({ kind: "call", call: "table-view/load", params, arguments: {} }), undefined))
      .toEqual({ call: "table-view/load" });
  });

  it("keeps a set's `value` while its target is unchanged, and clears the reaction when the path is blank", () => {
    const original = { set: "demo.count", value: 0 };
    expect(editedReaction(event({ kind: "set", set: "demo.count", from: "" }), original)).toBe(original);
    expect(editedReaction(event({ kind: "set", set: "demo.other", from: "value" }), original)).toEqual({ set: "demo.other", from: "value" });
    expect(editedReaction(event({ kind: "set", set: "   " }), original)).toBeUndefined();
    expect(editedReaction(event({ kind: "call", call: "" }), original)).toBeUndefined();
  });
});

describe("commitTrees — the one write path", () => {
  const viewModels = { pages: { p: {} }, widgets: {} };
  const userViewModels = { pages: {} };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  afterEach(() => vi.restoreAllMocks());

  it("writes the store first, then hands the host what the store holds — both trees, read back", async () => {
    const store = createStore({ viewModels: { pages: {}, widgets: {} }, userViewModels: { pages: { old: {} } } });
    const saved: EditableTrees[] = [];
    const save: SaveTrees = (trees) => {
      saved.push(trees);
    };
    commitTrees(store, save, { viewModels });
    expect(store.get("viewModels")).toBe(viewModels);
    await tick();
    expect(saved).toEqual([{ viewModels, userViewModels: { pages: { old: {} } } }]);
  });

  it("writes only the tree it was given", () => {
    const store = createStore({ viewModels, userViewModels });
    commitTrees(store, () => undefined, { userViewModels: { pages: { mine: {} } } });
    expect(store.get("viewModels")).toBe(viewModels);
    expect(store.get("userViewModels")).toEqual({ pages: { mine: {} } });
  });

  it("reports a host that fails to save and keeps the page as written — nothing throws, nothing is rolled back", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = createStore({ viewModels: { pages: {}, widgets: {} } });
    expect(() => commitTrees(store, () => Promise.reject(new Error("503")), { viewModels })).not.toThrow();
    expect(() => commitTrees(store, () => { throw new Error("sync"); }, { viewModels })).not.toThrow();
    await tick();
    expect(store.get("viewModels")).toBe(viewModels);
    expect(error).toHaveBeenCalledTimes(2);
    // Both are reported; in which order the microtasks settle is not promised.
    expect(error.mock.calls.map((call) => call[1])).toEqual(expect.arrayContaining([new Error("503"), new Error("sync")]));
  });

  it("saves in commit order, one at a time, however slow the host is", async () => {
    const store = createStore({ viewModels: { pages: {}, widgets: {} } });
    const order: string[] = [];
    let releaseFirst = (): void => undefined;
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const save: SaveTrees = async (trees) => {
      const tag = Object.keys(trees.viewModels.pages).join(",");
      if (tag === "a") await first;
      order.push(tag);
    };
    commitTrees(store, save, { viewModels: { pages: { a: {} }, widgets: {} } });
    commitTrees(store, save, { viewModels: { pages: { b: {} }, widgets: {} } });
    await tick();
    // The second commit's save has not even started: it waits for the first.
    expect(order).toEqual([]);
    releaseFirst();
    await tick();
    expect(order).toEqual(["a", "b"]);
  });

  it("lets the host handle a failed save its own way", async () => {
    const store = createStore({ viewModels: { pages: {}, widgets: {} } });
    const failures: unknown[] = [];
    commitTrees(store, () => Promise.reject(new Error("503")), { viewModels }, (error) => void failures.push(error));
    await tick();
    expect(failures).toEqual([new Error("503")]);
  });

  it("gives the host valid trees even when the store holds none", async () => {
    const store = createStore({});
    const seen: EditableTrees[] = [];
    commitTrees(store, (trees) => void seen.push(trees), { viewModels });
    await tick();
    expect(z.object({ pages: z.record(z.unknown()), widgets: z.record(z.unknown()) }).safeParse(seen[0]?.viewModels).success).toBe(true);
    expect(seen[0]?.userViewModels).toEqual({});
  });
});
