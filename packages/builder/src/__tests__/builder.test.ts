/**
 * The builder's pure logic: ids derived from what is taken, the yes/no/not-set
 * cycle, argument drafts, what a save keeps of a reaction it does not show,
 * what the editor starts from (the default write-back left out), and the one
 * write path — the store first, then the host with what the store holds.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { EventDefinition, SettingField } from "@wirework/schema";
import { createMigrations, defineMigration, renameWidget } from "@wirework/engine";
import { createStore } from "@wirework/store";
import type { EditableTrees, SaveTrees } from "../use-commit";
import { commitTrees } from "../use-commit";
import { DEFAULT_BUILDER_NAMING, modelNamespaceOf, numberedIds } from "../use-builder";
import {
  argumentsOf,
  draftsOfItems,
  editedReaction,
  itemsOf,
  nextParamValue,
  valuesFromViewModel,
  writeBackOf,
  type ParamDraft,
  type ReactionField,
} from "../form-drafts";
import { counter, dial } from "./fixtures";

describe("a named-list setting's entries (tabs, panels — doc/ADR/0009-containers.md)", () => {
  const panels: SettingField = {
    name: "panels",
    kind: "items",
    required: false,
    defaultValue: [{ key: "first", label: "First", open: true }],
    itemFields: [{ name: "open", kind: "boolean", required: false }],
  };
  const layout = { engine: "list", cells: [] };

  it("drafts saved entries with their other fields, keeping each entry whole behind its row", () => {
    const drafts = draftsOfItems(panels, [
      { key: "a", label: "A", open: true, content: layout },
      { key: "b", label: "B" },
    ]);
    expect(drafts).toEqual([
      { label: "A", values: { open: true }, original: { key: "a", label: "A", open: true, content: layout } },
      { label: "B", values: {}, original: { key: "b", label: "B" } },
    ]);
    expect(draftsOfItems(panels, undefined)).toEqual([]);
  });

  it("saves the label as typed, the saved key and layout, and a key made from the label for a new entry — unique in the list", () => {
    const [kept, renamed, fresh, twin, unnamed] = itemsOf(panels, [
      { label: "A", values: { open: false }, original: { key: "a", label: "A", open: true, content: layout } },
      { label: "Run history", values: {}, original: { key: "b", label: "B", open: true } },
      { label: " Run history ", values: { open: true } },
      { label: "Run History!", values: {} },
      { label: "", values: {} },
    ]);
    // The form shows `open`: what it holds is what is saved — the cleared one is gone, the layout stays.
    expect(kept).toEqual({ key: "a", label: "A", open: false, content: layout });
    expect(renamed).toEqual({ key: "b", label: "Run history" });
    expect(fresh).toEqual({ key: "run-history", label: "Run history", open: true });
    expect(twin).toEqual({ key: "run-history-2", label: "Run History!" });
    expect(unnamed).toEqual({ key: "item", label: "" });
  });
});

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
    expect(params[0]).toMatchObject({
      choice: "b",
      choices: [
        { value: "a", label: "a" },
        { value: "b", label: "b" },
      ],
    });
    const { params: none } = argumentsOf(withSelect, {});
    expect(none[0]?.choice).toBeUndefined();
    const { params: flag } = argumentsOf(fields, { flag: true });
    expect(flag.find((param) => param.name === "flag")).toMatchObject({ state: "yes", stateLabel: "yes" });
  });
});

describe("editedReaction — what a save keeps of a reaction the form does not show", () => {
  const row = (draft: Partial<ReactionField>): ReactionField => ({
    index: 0,
    kind: "set",
    set: "",
    from: "",
    fromChoice: "",
    call: "",
    params: [],
    arguments: {},
    filled: false,
    ...draft,
  });

  it("keeps a call's `with` the form cannot show while the action is unchanged, and drops it when it changed", () => {
    const original = { call: "runs/load", with: { page: 2 } };
    expect(editedReaction(row({ kind: "call", call: "runs/load" }), original)).toBe(original);
    expect(editedReaction(row({ kind: "call", call: "nav/go" }), original)).toEqual({ call: "nav/go" });
  });

  it("saves exactly the form's arguments when the action declares parameters", () => {
    const params = [
      { name: "into", kind: "text", required: true, value: "runs", unset: false, state: "no", stateLabel: "" },
    ] as ParamDraft[];
    expect(
      editedReaction(row({ kind: "call", call: "table-view/load", params, arguments: { into: "runs" } }), {
        call: "table-view/load",
        with: { into: "old" },
      }),
    ).toEqual({ call: "table-view/load", with: { into: "runs" } });
    expect(editedReaction(row({ kind: "call", call: "table-view/load", params, arguments: {} }), undefined)).toEqual({
      call: "table-view/load",
    });
  });

  it("keeps a set's `value` while its target is unchanged, and clears the reaction when the path is blank", () => {
    const original = { set: "demo.count", value: 0 };
    expect(editedReaction(row({ kind: "set", set: "demo.count", from: "" }), original)).toBe(original);
    expect(editedReaction(row({ kind: "set", set: "demo.other", from: "value" }), original)).toEqual({
      set: "demo.other",
      from: "value",
    });
    expect(editedReaction(row({ kind: "set", set: "   " }), original)).toBeUndefined();
    expect(editedReaction(row({ kind: "call", call: "" }), original)).toBeUndefined();
  });
});

describe("valuesFromViewModel — the editor's starting point", () => {
  it("drafts every reaction of an event, in order, with the original kept for what the form does not show", () => {
    const on = {
      changed: [
        { set: "demo.count", value: 0 },
        { call: "runs/load", with: { page: 2 } },
      ],
    };
    const values = valuesFromViewModel(counter, { inputs: { value: "demo.count" }, on, label: "Hits" });
    expect(values.paths).toEqual({ value: "demo.count" });
    expect(values.settings).toEqual({ label: "Hits" });
    expect(values.reactions["changed"]?.map((draft) => [draft.kind, draft.set || draft.call])).toEqual([
      ["set", "demo.count"],
      ["call", "runs/load"],
    ]);
    expect(values.reactions["changed"]?.[0]?.original).toBe(on.changed[0]);
    expect(values.reactions["changed"]?.[1]?.with).toEqual({ page: "2" });
  });

  it("leaves the default write-back out when resolve put it first — and keeps one the template placed elsewhere", () => {
    const fallback = { set: "demo.level", from: "value" };
    const resolved = { inputs: { value: "demo.level" }, on: { turned: [fallback, { call: "levels/apply" }] } };
    expect(valuesFromViewModel(dial, resolved).reactions).toEqual({
      turned: [{ kind: "call", set: "", call: "levels/apply", with: {}, original: { call: "levels/apply" } }],
    });
    const placed = { inputs: { value: "demo.level" }, on: { turned: [{ call: "levels/apply" }, fallback] } };
    expect(valuesFromViewModel(dial, placed).reactions["turned"]?.map((draft) => draft.kind)).toEqual(["call", "set"]);
    // The default alone: nothing to edit.
    expect(
      valuesFromViewModel(dial, { inputs: { value: "demo.level" }, on: { turned: [fallback] } }).reactions,
    ).toEqual({});
  });

  it("writeBackOf follows the port's path as the form holds it, and says when the port is not bound yet", () => {
    const turned = dial.events["turned"] as EventDefinition;
    expect(writeBackOf(turned, { value: " demo.level " })).toEqual({
      port: "value",
      path: "demo.level",
      from: "value",
    });
    expect(writeBackOf(turned, {})).toEqual({ port: "value", path: "", from: "value" });
    expect(writeBackOf(counter.events["changed"] as EventDefinition, { value: "x" })).toBeUndefined();
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
    expect(() =>
      commitTrees(
        store,
        () => {
          throw new Error("sync");
        },
        { viewModels },
      ),
    ).not.toThrow();
    await tick();
    expect(store.get("viewModels")).toBe(viewModels);
    expect(error).toHaveBeenCalledTimes(2);
    // Both are reported; in which order the microtasks settle is not promised.
    expect(error.mock.calls.map((call) => call[1])).toEqual(
      expect.arrayContaining([new Error("503"), new Error("sync")]),
    );
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
    commitTrees(
      store,
      () => Promise.reject(new Error("503")),
      { viewModels },
      (error) => void failures.push(error),
    );
    await tick();
    expect(failures).toEqual([new Error("503")]);
  });

  it("gives the host valid trees even when the store holds none", async () => {
    const store = createStore({});
    const seen: EditableTrees[] = [];
    commitTrees(store, (trees) => void seen.push(trees), { viewModels });
    await tick();
    expect(
      z.object({ pages: z.record(z.unknown()), widgets: z.record(z.unknown()) }).safeParse(seen[0]?.viewModels).success,
    ).toBe(true);
    expect(seen[0]?.userViewModels).toEqual({});
  });

  describe("with data formats (doc/ADR/0017-versioning-and-upgrades.md)", () => {
    const migrations = createMigrations();
    migrations.register(defineMigration({ owner: "app", to: 2, cell: renameWidget("old", "new") }));

    it("stamps what it writes with the format this version writes", async () => {
      const store = createStore({ viewModels: { pages: {}, widgets: {} } });
      const saved: EditableTrees[] = [];
      commitTrees(store, (trees) => void saved.push(trees), { viewModels, userViewModels }, undefined, migrations);
      await tick();
      expect(store.get("viewModels")).toEqual({ versions: { app: 2 }, ...viewModels });
      expect(saved[0]?.userViewModels).toEqual({ versions: { app: 2 }, pages: {} });
    });

    it("never writes over a tree saved by a newer version: the commit is refused whole, and the host told", async () => {
      const newer = { versions: { app: 9 }, pages: { p: { view: "theirs" } } };
      const store = createStore({ viewModels, userViewModels: newer });
      const save = vi.fn();
      const failures: unknown[] = [];
      const refused = (error: unknown) => void failures.push(error);
      commitTrees(store, save, { viewModels: { pages: {}, widgets: {} }, userViewModels }, refused, migrations);
      await tick();
      expect(store.get("userViewModels")).toBe(newer);
      expect(store.get("viewModels")).toBe(viewModels);
      expect(save).not.toHaveBeenCalled();
      expect(failures).toEqual([
        new Error(
          "Nothing was changed: what is stored was saved by a newer version of the application (data format app 9; this version reads up to 2)",
        ),
      ]);
      // The shared page alone is another tree: writing it does not touch the user's.
      commitTrees(store, save, { viewModels: { pages: { q: {} }, widgets: {} } }, refused, migrations);
      await tick();
      expect(save).toHaveBeenCalledTimes(1);
      expect(store.get("userViewModels")).toBe(newer);
    });

    it("refuses any stamp above 1 when the host gave no formats", () => {
      const store = createStore({ viewModels, userViewModels: { versions: { app: 2 } } });
      const failures: unknown[] = [];
      commitTrees(
        store,
        () => undefined,
        { userViewModels },
        (error) => void failures.push(error),
      );
      expect(failures).toHaveLength(1);
      expect(store.get("userViewModels")).toEqual({ versions: { app: 2 } });
    });
  });
});
