/**
 * The engine's path TOOLING: overlay merge and path enumeration. Reading
 * and writing a path is @wirework/schema's, tested there.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createStore } from "@wirework/store";
import {
  boundPaths,
  collectPaths,
  compatibleStorePaths,
  deepMerge,
  suggestedInputPaths,
  widgetPathName,
} from "../paths";

describe("deepMerge", () => {
  it("merges plain objects recursively and replaces everything else", () => {
    expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 3 } })).toEqual({ a: { b: 1, c: 3 } });
    expect(deepMerge([1, 2, 3], [9])).toEqual([9]);
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, "text")).toBe("text");
  });

  it("drops keys that would pollute the prototype", () => {
    const merged = deepMerge({}, JSON.parse('{"__proto__":{"bad":1}}')) as Record<string, unknown>;
    expect(merged["bad"]).toBeUndefined();
    expect(({} as Record<string, unknown>)["bad"]).toBeUndefined();
  });
});

describe("collectPaths", () => {
  it("lists branches and leaves, including array indexes", () => {
    const paths = collectPaths({ a: { b: 1 }, list: [{ x: 1 }] });
    expect(paths).toContain("a");
    expect(paths).toContain("a.b");
    expect(paths).toContain("list.0.x");
  });

  it("skips keys no store path could address, and terminates on cycles", () => {
    const cyclic: Record<string, unknown> = { ok: 1, "with space": 2, "with.dot": 3 };
    cyclic["self"] = cyclic;
    const paths = collectPaths(cyclic);
    expect(paths).toContain("ok");
    expect(paths.some((path) => path.includes(" ") || path.includes("with.dot"))).toBe(false);
    expect(paths.length).toBeLessThan(100);
  });
});

describe("generated paths", () => {
  const refresher = { kind: "refresher", type: "antd-refresher", io: { inputs: { schedule: {}, busy: {} } } };

  it("names a widget by its contract kind, else by its type without the vendor word, in camelCase", () => {
    expect(widgetPathName({ kind: "refresher", type: "antd-refresher" })).toBe("refresher");
    expect(widgetPathName({ kind: "multi-select", type: "antd-multi-select" })).toBe("multiSelect");
    expect(widgetPathName({ type: "antd-counter" })).toBe("counter");
    expect(widgetPathName({ type: "gauge" })).toBe("gauge");
  });

  it("suggests <page>.<name>.<port> for EVERY input port, existing in the store or not", () => {
    expect(suggestedInputPaths("builder", refresher, [])).toEqual({
      schedule: "builder.refresher.schedule",
      busy: "builder.refresher.busy",
    });
  });

  it("ends a path in the port's suggestedName when it declares one: a table's rows live at .data", () => {
    const table = {
      kind: "table",
      type: "antd-table",
      io: { inputs: { rows: { suggestedName: "data" }, loading: {}, columns: {} } },
    };
    expect(suggestedInputPaths("builder", table, [])).toEqual({
      rows: "builder.table.data",
      loading: "builder.table.loading",
      columns: "builder.table.columns",
    });
    // Taken is still decided by the widget's root, whatever the last segment is called.
    expect(suggestedInputPaths("builder", table, ["builder.table.data"])["rows"]).toBe("builder.table2.data");
  });

  it("numbers the next instance: the first name no bound path lives under", () => {
    expect(suggestedInputPaths("builder", refresher, ["builder.refresher.schedule"])["schedule"]).toBe(
      "builder.refresher2.schedule",
    );
    expect(
      suggestedInputPaths("builder", refresher, ["builder.refresher.busy", "builder.refresher2.schedule"])["schedule"],
    ).toBe("builder.refresher3.schedule");
    // Another page's, and a longer name's, paths do not take the name.
    expect(
      suggestedInputPaths("builder", refresher, ["demo.refresher.schedule", "builder.refresherX.schedule"])["schedule"],
    ).toBe("builder.refresher.schedule");
  });

  it("frees a name when the widget that used it is gone", () => {
    expect(suggestedInputPaths("builder", refresher, ["builder.refresher2.schedule"])["schedule"]).toBe(
      "builder.refresher.schedule",
    );
  });

  it("reads what is bound from the view models: inputs and the targets of set reactions", () => {
    const bound = boundPaths({
      widgets: {
        custom: {
          "custom-1": {
            default: {
              inputs: { schedule: "builder.refresher.schedule" },
              on: {
                changed: [{ set: "builder.refresher.schedule" }],
                refresh: [{ call: "table-view/load", with: { into: "jobs" } }, { set: "builder.refreshed", value: true }],
              },
              label: "not a path",
            },
          },
        },
      },
    });
    expect(bound.sort()).toEqual(["builder.refreshed", "builder.refresher.schedule", "builder.refresher.schedule"]);
    expect(boundPaths(undefined)).toEqual([]);
  });
});

describe("compatibleStorePaths", () => {
  it("offers only paths whose current value fits the port", () => {
    const store = createStore({ demo: { counter: 2, name: "x" } });
    expect(compatibleStorePaths(store, z.number())).toEqual(["demo.counter"]);
  });

  it("regression: never offers a configuration path", () => {
    const store = createStore({ viewModels: { pages: {} }, userViewModels: {}, demo: { n: 1 } });
    const paths = compatibleStorePaths(store, z.unknown());
    expect(paths.some((path) => path.startsWith("viewModels") || path.startsWith("userViewModels"))).toBe(false);
    expect(paths).toContain("demo.n");
  });
});
