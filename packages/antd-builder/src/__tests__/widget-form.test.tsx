/**
 * WidgetForm — the shared form of the builder and the editor: one field per
 * input port and per setting, a reaction per event, every field reachable
 * by the id its helper promises; a typed reaction reaches the form's state;
 * with the bindings locked, ports and reactions are read-only and say why.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWidgetForm } from "@wirework/builder";
import { createStore } from "@wirework/store";
import { WidgetForm, portFieldId, reactionFieldId, settingFieldId } from "../widget-form";
import { actions, counter } from "./fixtures";

function Harness({ bindingsLocked = false }: { bindingsLocked?: boolean }) {
  const form = useWidgetForm(counter, createStore({}), actions());
  return (
    <>
      <WidgetForm form={form} bindingsLocked={bindingsLocked} />
      <output data-testid="valid">{String(form.valid)}</output>
    </>
  );
}

/** The text box of a port field (antd's combobox puts the test id on its wrapper). */
const portInput = (port: string): HTMLInputElement => {
  const input = screen.getByTestId(portFieldId(port)).querySelector("input");
  if (!input) throw new Error(`port field "${port}" has no input`);
  return input;
};

describe("WidgetForm", () => {
  it("renders a field per port, per setting and per event under the promised ids", () => {
    render(<Harness />);
    expect(portInput("value").id).toBe("port-input-value");
    expect(screen.getByTestId("widget-settings")).toBeTruthy();
    expect(screen.getByTestId(settingFieldId("label")).getAttribute("id")).toBe("setting-label");
    expect(screen.getByTestId("widget-event").getAttribute("data-event")).toBe("changed");
    expect(screen.getByTestId(reactionFieldId("changed", "kind"))).toBeTruthy();
    expect(screen.getByTestId(reactionFieldId("changed", "set")).getAttribute("id")).toBe("reaction-changed-set");
  });

  it("marks what is required and describes what has a description", () => {
    render(<Harness />);
    expect(screen.getByText(/input: value/).textContent).toContain("*");
    expect(screen.getByText(/a number/)).toBeTruthy();
    expect(screen.getByText(/Shown above the number/)).toBeTruthy();
    expect(screen.getByText(/on changed:/).textContent).toContain("*");
  });

  it("hands a typed reaction path to the form, which then holds everything the widget needs", () => {
    render(<Harness />);
    expect(screen.getByTestId("valid").textContent).toBe("false");

    fireEvent.change(portInput("value"), { target: { value: "demo.count" } });
    expect(screen.getByTestId("valid").textContent).toBe("false");
    fireEvent.change(screen.getByTestId(reactionFieldId("changed", "set")), { target: { value: "demo.count" } });
    expect(screen.getByTestId("valid").textContent).toBe("true");
  });

  it("locks ports and reactions, and says why", () => {
    render(<Harness bindingsLocked />);
    expect(screen.getByTestId("bindings-locked")).toBeTruthy();
    expect(portInput("value").disabled).toBe(true);
    expect(screen.getByTestId<HTMLInputElement>(reactionFieldId("changed", "set")).disabled).toBe(true);
    expect(screen.getByTestId<HTMLInputElement>(settingFieldId("label")).disabled).toBe(false);
  });
});
