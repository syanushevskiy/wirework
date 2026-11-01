/**
 * useWidgetBuilder — choosing a widget and adding it: the form starts from
 * generated paths, Add is gated in the hook (an incomplete form, a host
 * that is not accepting) and, once it went through, everything starts over.
 * A widget whose event writes back by default needs no wiring; what it
 * gets on top is a list of reactions, in order.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { createStore } from "@wirework/store";
import type { AddLock } from "../locks";
import { useWidgetBuilder } from "../use-widget-builder";
import { actions, contracts, counter, dial, registryWith } from "./fixtures";

function setup(addLock?: AddLock, widgets: AnyWidgetDefinition[] = [counter]) {
  const store = createStore({ viewModels: { pages: {}, widgets: {} } });
  const onAdd = vi.fn();
  const registered = actions();
  registered.register({
    name: "levels/apply",
    description: "apply the level",
    params: z.object({ to: z.string() }).strict(),
    handler: () => undefined,
  });
  const hook = renderHook(
    ({ addLock }: { addLock: AddLock | undefined }) =>
      useWidgetBuilder({
        registry: registryWith(...widgets),
        contracts: contracts(),
        store,
        actions: registered,
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

    act(() => result.current.form.setReaction("changed", 0, "set", "builder.counter.value"));
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

  it("a widget that writes back by default is complete at once; the default follows the port and is never saved", () => {
    const { result, onAdd } = setup(undefined, [dial]);
    act(() => result.current.selectWidget("dial"));
    const turned = () => result.current.form.events.find((event) => event.name === "turned");
    expect(turned()?.writesBack).toEqual({ port: "value", path: "builder.dial.value", from: "value" });
    expect(turned()?.reactions).toEqual([]);
    expect(result.current.canAdd).toBe(true);

    act(() => result.current.form.setPortPath("value", "demo.level"));
    expect(turned()?.writesBack?.path).toBe("demo.level");
    // A row that spells the default out is not saved: the engine supplies it from the port.
    act(() => result.current.form.addReaction("turned"));
    act(() => result.current.form.setReaction("turned", 0, "set", "demo.level"));
    act(() => result.current.add());
    expect(onAdd.mock.calls[0]).toEqual(["dial", { inputs: { value: "demo.level" }, on: {} }, {}]);
  });

  it("keeps several reactions of one event in order, blank rows left out, and removes the one asked", () => {
    const { result } = setup(undefined, [dial]);
    act(() => result.current.selectWidget("dial"));
    act(() => result.current.form.addReaction("turned"));
    act(() => result.current.form.setReaction("turned", 0, "kind", "call"));
    act(() => result.current.form.setReaction("turned", 0, "call", "levels/apply"));
    // The action asks for `to`: until it is there the form is not complete.
    expect(result.current.canAdd).toBe(false);
    act(() => result.current.form.setReactionParam("turned", 0, "to", "runs"));
    expect(result.current.canAdd).toBe(true);
    act(() => result.current.form.addReaction("turned"));
    act(() => result.current.form.setReaction("turned", 1, "set", "demo.log"));
    act(() => result.current.form.addReaction("turned"));
    expect(result.current.form.events[0]?.reactions.map((reaction) => reaction.filled)).toEqual([true, true, false]);
    expect(result.current.form.collect().bindings.on).toEqual({
      turned: [
        { call: "levels/apply", with: { to: "runs" } },
        { set: "demo.log", from: "value" },
      ],
    });

    act(() => result.current.form.removeReaction("turned", 0));
    expect(result.current.form.collect().bindings.on).toEqual({ turned: [{ set: "demo.log", from: "value" }] });
  });

  it("is locked by the host, not only its button — and reports the reason for the UI to say", () => {
    const { result, onAdd, rerender } = setup("editing");
    act(() => result.current.selectWidget("counter"));
    act(() => result.current.form.setReaction("changed", 0, "set", "builder.counter.value"));
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
