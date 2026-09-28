/**
 * WidgetBuilder — the panel that adds widgets: the catalog opens on "Show
 * widgets" with a card per registered widget, picking a card selects the
 * widget and starts its form from generated paths, Add is offered only once
 * the form is complete and the host accepts, and a host's lock is shown.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AddLock } from "@wirework/builder";
import { createStore } from "@wirework/store";
import { WidgetBuilder, type WidgetBuilderProps } from "../widget-builder";
import { portFieldId, reactionFieldId } from "../widget-form";
import { actions, contracts, counter, registryWith } from "./fixtures";

function renderBuilder(addLock?: AddLock, lockTexts?: WidgetBuilderProps["lockTexts"]) {
  const onAdd = vi.fn();
  render(
    <WidgetBuilder
      registry={registryWith(counter)}
      contracts={contracts()}
      store={createStore({ viewModels: { pages: {}, widgets: {} } })}
      actions={actions()}
      page="builder"
      addLock={addLock}
      lockTexts={lockTexts}
      onAdd={onAdd}
    />,
  );
  return { onAdd, add: () => screen.getByTestId<HTMLButtonElement>("add-widget") };
}

describe("WidgetBuilder", () => {
  it("opens the catalog on Show widgets, with a card per registered widget", () => {
    renderBuilder();
    const palette = screen.getByTestId("widget-palette");
    expect(palette.getAttribute("data-state")).toBe("closed");
    expect(palette.getAttribute("data-registered")).toBe("1");
    expect(screen.queryByTestId("widget-card")).toBeNull();

    fireEvent.click(screen.getByTestId("widget-browse"));
    expect(palette.getAttribute("data-state")).toBe("open");
    const card = screen.getByTestId("widget-card");
    expect(card.getAttribute("data-widget")).toBe("counter");
    expect(card.getAttribute("data-kind")).toBe("other");
    expect(screen.getByText("counts clicks")).toBeTruthy();
  });

  it("selects the widget a card is pressed for, and offers Add once the form is complete", () => {
    const { onAdd, add } = renderBuilder();
    expect(add().disabled).toBe(true);
    fireEvent.click(screen.getByTestId("widget-browse"));
    fireEvent.click(screen.getByTestId("widget-card"));
    expect(screen.getByTestId("widget-selected").textContent).toContain("counter");
    expect(screen.getByTestId(portFieldId("value")).querySelector("input")?.value).toBe("builder.counter.value");
    expect(add().disabled).toBe(true);

    fireEvent.change(screen.getByTestId(reactionFieldId("changed", "set")), {
      target: { value: "builder.counter.value" },
    });
    expect(add().disabled).toBe(false);
    fireEvent.click(add());
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]?.[0]).toBe("counter");
    expect(screen.queryByTestId("widget-selected")).toBeNull();
  });

  it("says the host's lock in words and keeps Add disabled while it holds", () => {
    const { add } = renderBuilder("editing");
    expect(screen.getByTestId("add-widget-locked").textContent).toBe("Save or cancel the page edit to add widgets.");
    fireEvent.click(screen.getByTestId("widget-browse"));
    fireEvent.click(screen.getByTestId("widget-card"));
    fireEvent.change(screen.getByTestId(reactionFieldId("changed", "set")), {
      target: { value: "builder.counter.value" },
    });
    expect(add().disabled).toBe(true);
  });

  it("lets the host say a lock in its own words", () => {
    renderBuilder("user-view", { "user-view": "Switch your view off first" });
    expect(screen.getByTestId("add-widget-locked").textContent).toBe("Switch your view off first");
  });
});
