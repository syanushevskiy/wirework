import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { WidgetEditor } from "../widget-editor";
import { actions, placedCounter, store } from "./fixtures";

/** The port field's text box — the form holds other comboboxes (a reaction's kind). */
const portInput = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByTestId("port-input-value")).getByRole("combobox");

type Args = { bindingsLocked: boolean; onSave: () => void; onCancel: () => void };

/** The editor of a placed cell: the form prefilled from its resolved view model; Save and Cancel land in the Actions panel. */
const meta = {
  title: "Builder/WidgetEditor",
  args: { bindingsLocked: false, onSave: fn(), onCancel: fn() },
  render: (args) => (
    <WidgetEditor
      cell={placedCounter()}
      store={store()}
      actions={actions()}
      bindingsLocked={args.bindingsLocked}
      onSave={args.onSave}
      onCancel={args.onCancel}
    />
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Prefilled from the cell: the port path, the reaction, the label. */
export const Prefilled: Story = {
  play: async ({ canvas }) => {
    await expect(portInput(canvas)).toHaveValue("demo.count");
    await expect(canvas.getByTestId("reaction-incremented-set")).toHaveValue("demo.count");
    await expect(canvas.getByTestId("setting-label")).toHaveValue("Hits");
  },
};

/** A changed setting is what Save reports, for the cell being edited. */
export const SavesTheChange: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const label = canvas.getByTestId("setting-label");
    await userEvent.clear(label);
    await userEvent.type(label, "Total");
    await userEvent.click(canvas.getByRole("button", { name: "Save widget" }));
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ key: "custom-1" }),
      expect.objectContaining({ inputs: { value: "demo.count" } }),
      expect.objectContaining({ label: "Total" }),
    );
  },
};

/** A user's own view: settings only — inputs and reactions are read-only, and the form says so. */
export const BindingsLocked: Story = {
  args: { bindingsLocked: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("bindings-locked")).toBeVisible();
    await expect(portInput(canvas)).toBeDisabled();
    await expect(canvas.getByTestId("reaction-incremented-set")).toBeDisabled();
    await expect(canvas.getByTestId("setting-label")).toBeEnabled();
  },
};
