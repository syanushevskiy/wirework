import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import type { AddLock } from "@wirework/builder";
import { WidgetBuilder } from "../widget-builder";
import { actions, contracts, registry, store } from "./fixtures";

type Args = { addLock: AddLock | undefined; onAdd: (widgetType: string) => void };

/**
 * The panel that adds widgets: the catalog of registered widgets (live
 * previews, grouped by contract), the form for the chosen one, and Add. What
 * Add hands over lands in the Actions panel.
 */
const meta = {
  title: "Builder/WidgetBuilder",
  args: { addLock: undefined, onAdd: fn() },
  argTypes: {
    addLock: {
      control: "select",
      options: [undefined, "permission", "editing", "user-view"],
      description: "Why the host is not accepting a widget right now",
    },
  },
  render: (args) => (
    <WidgetBuilder
      registry={registry()}
      contracts={contracts()}
      store={store()}
      actions={actions()}
      page="builder"
      addLock={args.addLock}
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

/**
 * A controlled widget writes its value back by default: the form says so
 * (following the port's path) and Add is offered at once; a reaction added
 * on top is what FOLLOWS.
 */
export const WritesBackByDefault: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show widgets" }));
    await userEvent.click(canvas.getByRole("button", { name: /antd-counter/ }));
    const fallback = canvas.getByTestId("reaction-incremented-default");
    await expect(fallback).toHaveAttribute("data-path", "builder.counter.value");
    await expect(canvas.queryByTestId("reaction-incremented-set")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Add widget" })).toBeEnabled();
    await userEvent.click(canvas.getByTestId("reaction-incremented-add"));
    await expect(canvas.getByText("then:")).toBeVisible();
    await userEvent.type(canvas.getByTestId("reaction-incremented-set"), "demo.log");
    await expect(canvas.getByTestId("reaction-incremented-set")).toHaveValue("demo.log");
  },
};

/** A widget with a required event that writes nothing back waits until its reaction is wired. */
export const WaitsForTheWiring: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show widgets" }));
    await userEvent.click(canvas.getByRole("button", { name: /antd-refresher/ }));
    const add = canvas.getByRole("button", { name: "Add widget" });
    // `changed` writes the schedule back by default; `refresh` has nothing to do yet.
    await expect(canvas.getByTestId("reaction-changed-default")).toHaveAttribute(
      "data-path",
      "builder.refresher.schedule",
    );
    await expect(add).toBeDisabled();
    await userEvent.type(canvas.getByTestId("reaction-refresh-set"), "demo.refreshed");
    await expect(add).toBeEnabled();
  },
};

/** The host is not accepting widgets (a page edit is open): Add is locked, and says why. */
export const Locked: Story = {
  args: { addLock: "editing" },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("add-widget-locked")).toHaveTextContent("Save or cancel the page edit");
    await expect(canvas.getByRole("button", { name: "Add widget" })).toBeDisabled();
  },
};
