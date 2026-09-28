import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { WidgetBuilder } from "../widget-builder";
import { actions, contracts, registry, store } from "./fixtures";

type Args = { addLocked: string | undefined; onAdd: (widgetType: string) => void };

/**
 * The panel that adds widgets: the catalog of registered widgets (live
 * previews, grouped by contract), the form for the chosen one, and Add. What
 * Add hands over lands in the Actions panel.
 */
const meta = {
  title: "Builder/WidgetBuilder",
  args: { addLocked: undefined, onAdd: fn() },
  argTypes: { addLocked: { control: "text", description: "Why the host is not accepting a widget right now" } },
  render: (args) => (
    <WidgetBuilder
      registry={registry()}
      contracts={contracts()}
      store={store()}
      actions={actions()}
      page="builder"
      addLocked={args.addLocked}
      onAdd={args.onAdd}
    />
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Pick a widget from the list and add it: a button needs no wiring, so Add is offered at once. */
export const AddsAButton: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show widgets" }));
    await userEvent.click(canvas.getByRole("button", { name: /antd-button/ }));
    await expect(canvas.getByTestId("widget-selected")).toHaveTextContent("antd-button");
    await userEvent.click(canvas.getByRole("button", { name: "Add widget" }));
    await expect(args.onAdd).toHaveBeenCalledWith("antd-button", expect.anything(), expect.anything());
    // Everything starts over.
    await expect(canvas.queryByTestId("widget-selected")).toBeNull();
  },
};

/** A widget with a required event waits until its reaction is wired. */
export const WaitsForTheWiring: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show widgets" }));
    await userEvent.click(canvas.getByRole("button", { name: /antd-counter/ }));
    const add = canvas.getByRole("button", { name: "Add widget" });
    await expect(add).toBeDisabled();
    await userEvent.type(canvas.getByTestId("reaction-incremented-set"), "demo.count");
    await expect(add).toBeEnabled();
  },
};

/** The host is not accepting widgets (a page edit is open): Add is locked, and says why. */
export const Locked: Story = {
  args: { addLocked: "Finish editing the page first" },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("add-widget-locked")).toHaveTextContent("Finish editing the page first");
    await expect(canvas.getByRole("button", { name: "Add widget" })).toBeDisabled();
  },
};
