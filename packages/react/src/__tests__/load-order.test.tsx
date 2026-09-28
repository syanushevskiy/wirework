/**
 * Load events on a mounted page (doc/widget-events-design.md, "Timing"):
 * a widget's `load` fires before the page's, and both fire AFTER the page's
 * reactions are bound — so what they declare actually runs.
 */
import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";
import { PageView } from "../PageView";
import { actions, announcer, cell, layoutEngines, registryWith, viewModels } from "./fixtures";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("load events on a page", () => {
  it("fire cell first, then page, once each, and their reactions have already been bound", () => {
    const bus = createEventBus();
    const store = createStore();
    const order: string[] = [];
    bus.subscribe({ name: "load" }, (event) => order.push(event.widget));
    const models = viewModels(
      [cell({ widget: "announcer", model: "widgets.announcer" })],
      { announcer: { default: { on: { load: [{ set: "log.cell", value: "announced" }] } } } },
      { demo: { load: [{ set: "log.page", from: "page" }] } },
    );

    render(
      <StrictMode>
        <PageView
          page="demo"
          viewModels={models}
          registry={registryWith(announcer)}
          layoutEngines={layoutEngines()}
          actions={actions()}
          store={store}
          bus={bus}
        />
      </StrictMode>,
    );
    expect(order).toEqual([]);

    act(() => vi.runAllTimers());
    expect(order).toEqual(["announcer", "page"]);
    expect(store.get("log.cell")).toBe("announced");
    expect(store.get("log.page")).toBe("demo");
  });

  it("fire again, cells first, when the host reloads the page — in place, nothing remounts", () => {
    const bus = createEventBus();
    const store = createStore();
    const order: string[] = [];
    bus.subscribe({ name: "load" }, (event) => order.push(event.widget));
    const models = viewModels([cell({ widget: "announcer", model: "widgets.announcer" })], {
      announcer: { default: {} },
    });
    const page = (reloadKey: number) => (
      <PageView
        page="demo"
        viewModels={models}
        registry={registryWith(announcer)}
        layoutEngines={layoutEngines()}
        store={store}
        bus={bus}
        reloadKey={reloadKey}
      />
    );

    const { rerender } = render(page(1));
    act(() => vi.runAllTimers());
    const mounted = screen.getByTestId("announcer");
    rerender(page(2));
    act(() => vi.runAllTimers());
    expect(order).toEqual(["announcer", "page", "announcer", "page"]);
    expect(screen.getByTestId("announcer")).toBe(mounted);
  });
});
