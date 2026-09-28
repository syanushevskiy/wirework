/**
 * useWidgetBuilder — choosing a widget and adding it: the form starts from
 * generated paths, Add is gated in the hook (an incomplete form, a host
 * that is not accepting) and, once it went through, everything starts over.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createStore } from "@wirework/store";
import type { AddLock } from "../locks";
import { useWidgetBuilder } from "../use-widget-builder";
import { actions, contracts, counter, registryWith } from "./fixtures";

function setup(addLock?: AddLock) {
  const store = createStore({ viewModels: { pages: {}, widgets: {} } });
  const onAdd = vi.fn();
  const hook = renderHook(
    ({ addLock }: { addLock: AddLock | undefined }) =>
      useWidgetBuilder({
        registry: registryWith(counter),
        contracts: contracts(),
        store,
        actions: actions(),
        page: "builder",
        onAdd,
        addLock,
      }),
    { initialProps: { addLock } },
  );
  return { onAdd, ...hook };
}

describe("useWidgetBuilder", () => {
  it("groups the registered widgets by contract kind, widgets of no contract last", () => {
    const { result } = setup();
    expect(
      result.current.widgetGroups.map((group) => [group.kind, group.widgets.map((widget) => widget.type)]),
    ).toEqual([["other", ["counter"]]]);
    expect(result.current.widgetType).toBe("");
  });

  it("starts the form from generated paths, and adds only once every required binding is there", () => {
    const { result, onAdd } = setup();
    act(() => result.current.selectWidget("counter"));
    expect(result.current.widgetType).toBe("counter");
    expect(result.current.form.fields.map((field) => [field.name, field.value, field.untouched])).toEqual([
      ["value", "builder.counter.value", true],
    ]);
    // The required `changed` event has no reaction yet.
    expect(result.current.canAdd).toBe(false);
    act(() => result.current.add());
    expect(onAdd).not.toHaveBeenCalled();

    act(() => result.current.form.setReaction("changed", "set", "builder.counter.value"));
    expect(result.current.canAdd).toBe(true);
    act(() => result.current.add());
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]).toEqual([
      "counter",
      {
        inputs: { value: "builder.counter.value" },
        on: { changed: [{ set: "builder.counter.value", from: "value" }] },
      },
      {},
    ]);
    // Everything starts over.
    expect(result.current.widgetType).toBe("");
    expect(result.current.form.fields).toEqual([]);
    expect(result.current.search.open).toBe(false);
  });

  it("is locked by the host, not only its button — and reports the reason for the UI to say", () => {
    const { result, onAdd, rerender } = setup("editing");
    act(() => result.current.selectWidget("counter"));
    act(() => result.current.form.setReaction("changed", "set", "builder.counter.value"));
    expect(result.current.canAdd).toBe(true);
    expect(result.current.addLock).toBe("editing");
    expect(result.current.addDisabled).toBe(true);
    act(() => result.current.add());
    expect(onAdd).not.toHaveBeenCalled();

    rerender({ addLock: undefined });
    expect(result.current.addDisabled).toBe(false);
    act(() => result.current.add());
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
