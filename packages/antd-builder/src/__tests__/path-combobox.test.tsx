// @vitest-environment jsdom
/**
 * PathCombobox — the port-binding field: it shows the bound path, hands
 * every edit to `onSelect` as it is typed (a path that does not exist yet
 * may be wired), and is inert while disabled.
 */
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PathCombobox } from "../path-combobox";

// Without vitest globals, Testing Library cannot unmount after each test by itself.
afterEach(cleanup);

function renderField(props: Partial<ComponentProps<typeof PathCombobox>> = {}) {
  const onSelect = vi.fn();
  render(
    <PathCombobox
      id="port-input-rows"
      testId="port-input-rows"
      value="runs.rows"
      suggestions={() => ["runs.rows", "runs.selected"]}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { onSelect, input: screen.getByRole<HTMLInputElement>("combobox") };
}

describe("PathCombobox", () => {
  it("shows the bound path under its test id", () => {
    const { input } = renderField();
    expect(screen.getByTestId("port-input-rows")).toBeTruthy();
    expect(input.value).toBe("runs.rows");
  });

  it("hands every edit to onSelect as it is typed", () => {
    const { input, onSelect } = renderField();
    fireEvent.change(input, { target: { value: "runs.picked" } });
    expect(onSelect.mock.calls.map(([path]) => path)).toEqual(["runs.picked"]);
  });

  it("is inert while disabled", () => {
    const { input } = renderField({ disabled: true });
    expect(input.disabled).toBe(true);
  });
});
