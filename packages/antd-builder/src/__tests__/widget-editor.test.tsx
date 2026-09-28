/**
 * WidgetEditor — the drawer that edits a placed cell: the form is prefilled
 * from the cell's resolved view model, Save reports what was collected,
 * Cancel reports nothing, and a user's own view locks the bindings.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createStore } from "@wirework/store";
import { WidgetEditor } from "../widget-editor";
import { portFieldId, reactionFieldId, settingFieldId } from "../widget-form";
import { actions, placedCounter } from "./fixtures";

function renderEditor(bindingsLocked = false) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const cell = placedCounter();
  render(
    <WidgetEditor
      cell={cell}
      store={createStore({ demo: { count: 1 } })}
      actions={actions()}
      bindingsLocked={bindingsLocked}
      onSave={onSave}
      onCancel={onCancel}
    />,
  );
  return { cell, onSave, onCancel };
}

describe("WidgetEditor", () => {
  it("opens on the cell, prefilled from its view model", () => {
    renderEditor();
    expect(screen.getByTestId("widget-editor").getAttribute("data-cell")).toBe("custom-1");
    expect(screen.getByTestId(portFieldId("value")).querySelector("input")?.value).toBe("demo.count");
    expect(screen.getByTestId<HTMLInputElement>(reactionFieldId("changed", "set")).value).toBe("demo.count");
    expect(screen.getByTestId<HTMLInputElement>(settingFieldId("label")).value).toBe("Count");
  });

  it("saves what the form collected, for the cell it edits", () => {
    const { cell, onSave } = renderEditor();
    fireEvent.change(screen.getByTestId(settingFieldId("label")), { target: { value: "Total" } });
    fireEvent.click(screen.getByTestId("widget-save"));
    expect(onSave).toHaveBeenCalledTimes(1);
    const [saved, bindings, settings] = onSave.mock.calls[0] ?? [];
    expect(saved).toBe(cell);
    expect(bindings).toEqual({ inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] } });
    expect(settings).toEqual({ label: "Total" });
  });

  it("cancels without saving", () => {
    const { onSave, onCancel } = renderEditor();
    fireEvent.click(screen.getByTestId("widget-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("locks the bindings for a user's own view", () => {
    renderEditor(true);
    expect(screen.getByTestId("bindings-locked")).toBeTruthy();
    expect(screen.getByTestId<HTMLInputElement>(reactionFieldId("changed", "set")).disabled).toBe(true);
  });
});
