/**
 * usePageLoad — the page's own `load` event: once per opening, even under
 * StrictMode's double mount; again when the host asks (`reloadKey`) or the
 * page is visited afresh (another store); never when the page is gone
 * before its turn comes.
 */
import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_EVENT_WIDGET, type EventBus, type Store, type WidgetEvent } from "@wirework/schema";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";
import { usePageLoad } from "../usePageLoad";

function Page({ bus, store, reloadKey }: { bus: EventBus; store: Store; reloadKey?: number | undefined }) {
  usePageLoad(bus, store, "demo", reloadKey);
  return null;
}

function listen(bus: EventBus): WidgetEvent[] {
  const events: WidgetEvent[] = [];
  bus.subscribe({}, (event) => events.push(event));
  return events;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("usePageLoad", () => {
  it("emits the page's load once per opening, under StrictMode too, from the page and no cell", () => {
    const bus = createEventBus();
    const events = listen(bus);
    render(
      <StrictMode>
        <Page bus={bus} store={createStore()} />
      </StrictMode>,
    );
    expect(events).toEqual([]);

    act(() => vi.runAllTimers());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      widget: PAGE_EVENT_WIDGET,
      name: "load",
      payload: { page: "demo" },
      source: { page: "demo", cell: "" },
    });
  });

  it("emits again when the host changes reloadKey, and when the page is visited with another store", () => {
    const bus = createEventBus();
    const events = listen(bus);
    const { rerender } = render(<Page bus={bus} store={createStore()} reloadKey={1} />);
    act(() => vi.runAllTimers());
    expect(events).toHaveLength(1);

    rerender(<Page bus={bus} store={createStore()} reloadKey={1} />);
    act(() => vi.runAllTimers());
    expect(events).toHaveLength(2);

    rerender(<Page bus={bus} store={createStore()} reloadKey={2} />);
    act(() => vi.runAllTimers());
    expect(events).toHaveLength(3);
  });

  it("does not emit for a page unmounted before its turn", () => {
    const bus = createEventBus();
    const events = listen(bus);
    const { unmount } = render(<Page bus={bus} store={createStore()} />);
    unmount();
    act(() => vi.runAllTimers());
    expect(events).toEqual([]);
  });
});
