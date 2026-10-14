/**
 * One tree over two stores: the shared roots outlive a page, the page's own
 * roots start over with it — and nothing reading or writing can tell.
 */
import { describe, expect, it, vi } from "vitest";
import { createStore, layerStores } from "../index";

const SHARED = ["app", "userViewModels"];

function layers(pageState: Record<string, unknown> = {}, sharedState: Record<string, unknown> = {}) {
  const page = createStore(pageState);
  const shared = createStore(sharedState);
  return { page, shared, store: layerStores({ page, shared, sharedRoots: SHARED }) };
}

describe("layerStores", () => {
  it("reads and writes each root in the layer that owns it", () => {
    const { page, shared, store } = layers({ runs: { page: 1 } }, { app: { user: { name: "Ann" } } });
    expect(store.get("app.user.name")).toBe("Ann");
    expect(store.get("runs.page")).toBe(1);
    store.set("app.settings.pageSize", 10);
    store.set("runs.page", 2);
    expect(shared.get("app.settings.pageSize")).toBe(10);
    expect(page.get("runs.page")).toBe(2);
    expect(page.get("app")).toBeUndefined();
    expect(shared.get("runs")).toBeUndefined();
  });

  it("keeps the shared state when the page starts over", () => {
    const shared = createStore({ app: { user: { name: "Ann" } } });
    const first = layerStores({ page: createStore({ demo: { counter: 3 } }), shared, sharedRoots: SHARED });
    first.set("app.settings.pageSize", 10);
    const second = layerStores({ page: createStore({}), shared, sharedRoots: SHARED });
    expect(second.get("demo.counter")).toBeUndefined();
    expect(second.get("app.settings.pageSize")).toBe(10);
  });

  it("shows one tree, with the same snapshot while nothing changed", () => {
    const { store } = layers({ runs: { page: 1 } }, { app: { user: { name: "Ann" } } });
    const before = store.snapshot();
    expect(before).toEqual({ runs: { page: 1 }, app: { user: { name: "Ann" } } });
    expect(store.snapshot()).toBe(before);
    store.set("runs.page", 2);
    expect(store.snapshot()).not.toBe(before);
    expect(store.snapshot()).toEqual({ runs: { page: 2 }, app: { user: { name: "Ann" } } });
    // A change in the SHARED layer alone is a new snapshot too.
    const afterPage = store.snapshot();
    store.set("app.user.name", "Bob");
    expect(store.snapshot()).not.toBe(afterPage);
    expect(store.snapshot()).toEqual({ runs: { page: 2 }, app: { user: { name: "Bob" } } });
  });

  it("shadows a shared root the page store happens to hold", () => {
    const { store } = layers({ app: { user: { name: "page copy" } } }, { app: { user: { name: "Ann" } } });
    expect(store.get("app.user.name")).toBe("Ann");
    expect(store.snapshot()).toEqual({ app: { user: { name: "Ann" } } });
  });

  it("notifies a path from its own layer, and the root from both", () => {
    const { store } = layers({ runs: { page: 1 } }, { app: { settings: { pageSize: 5 } } });
    const onShared = vi.fn();
    const onPage = vi.fn();
    const onRoot = vi.fn();
    const stopShared = store.subscribe("app.settings.pageSize", onShared);
    store.subscribe("runs.page", onPage);
    const stopRoot = store.subscribe("", onRoot);
    store.set("app.settings.pageSize", 10);
    expect(onShared).toHaveBeenCalledOnce();
    expect(onPage).not.toHaveBeenCalled();
    store.set("runs.page", 2);
    expect(onPage).toHaveBeenCalledOnce();
    expect(onRoot).toHaveBeenCalledTimes(2);
    // Each unsubscribe stops its own subscription, in whichever layer it lives.
    stopShared();
    stopRoot();
    store.set("app.settings.pageSize", 15);
    store.set("runs.page", 3);
    expect(onShared).toHaveBeenCalledOnce();
    expect(onRoot).toHaveBeenCalledTimes(2);
  });

  it("keeps the configuration guard of the layer that owns the root", () => {
    const { shared, store } = layers({}, { userViewModels: {} });
    expect(() => store.set("userViewModels.pages", {})).toThrow(/setConfig/);
    store.setConfig("userViewModels.pages", { runs: { view: "my-own" } });
    expect(shared.get("userViewModels.pages.runs.view")).toBe("my-own");
  });

  it("replace splits the tree between the layers, and keeps the shared roots it does not name", () => {
    const sharedState = { app: { user: { name: "Ann" } }, userViewModels: { pages: { runs: {} } } };
    const { page, shared, store } = layers({ runs: { page: 1 } }, sharedState);
    store.replace({ runs: { page: 4 }, extra: true, app: { settings: { pageSize: 5 } } });
    expect(page.snapshot()).toEqual({ runs: { page: 4 }, extra: true });
    // A named shared root is replaced whole, never merged; an unnamed one stays.
    expect(shared.snapshot()).toEqual({ app: { settings: { pageSize: 5 } }, userViewModels: { pages: { runs: {} } } });
  });

  it("replace with a page-only tree leaves the shared layer alone — the user, the permissions, the overlay stay", () => {
    const sharedState = {
      app: { user: { name: "Ann" }, permissions: { editPages: true } },
      userViewModels: { pages: {} },
    };
    const { page, shared, store } = layers({ runs: { page: 1 }, demo: { counter: 3 } }, sharedState);
    const onRoot = vi.fn();
    store.subscribe("", onRoot);
    store.replace({ demo: { counter: 0 } });
    expect(page.snapshot()).toEqual({ demo: { counter: 0 } });
    expect(shared.snapshot()).toEqual(sharedState);
    expect(store.get("app.permissions.editPages")).toBe(true);
    // One layer written, one notification.
    expect(onRoot).toHaveBeenCalledOnce();
  });

  it("routes a validated read to the layer that owns the root", () => {
    const { store } = layers({ runs: { page: "1" } }, { app: { settings: { pageSize: 5 } } });
    const number = { parse: (input: unknown) => (typeof input === "number" ? input : undefined) };
    expect(store.getAs("app.settings.pageSize", number)).toBe(5);
    expect(store.getAs("runs.page", number)).toBeUndefined();
  });
});
