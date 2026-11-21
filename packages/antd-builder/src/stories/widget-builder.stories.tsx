import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, within } from "storybook/test";
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

/**
 * A CONDITION typed in words (doc/ADR/0008-conditions.md): a path, a check by
 * its phrase, the value it takes; the row reads itself back as a sentence,
 * a value the check refuses holds Add back, and what Add hands over carries
 * the condition as the template's `when`.
 */
export const ShowsWhen: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show widgets" }));
    await userEvent.click(canvas.getByRole("button", { name: /antd-label/ }));
    // A label needs its text; the condition is what this story is about.
    await userEvent.type(canvas.getByTestId("setting-text"), "Plenty");
    await expect(canvas.getByTestId("widget-conditions-always")).toBeVisible();
    await userEvent.click(canvas.getByTestId("condition-add"));
    const path = within(canvas.getByTestId("condition-path")).getByRole("combobox");
    await userEvent.type(path, "demo.count");
    // The path's suggestions open under the field: close them before anything below is clicked.
    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(canvas.getByTestId("condition-is")).getByRole("combobox"));
    await userEvent.click(await screen.findByTitle("is greater than"));
    await userEvent.type(canvas.getByTestId("condition-to"), "ten");
    await expect(canvas.getByTestId("condition-problem")).toHaveTextContent("not a number");
    await expect(canvas.getByRole("button", { name: "Add widget" })).toBeDisabled();
    await userEvent.clear(canvas.getByTestId("condition-to"));
    await userEvent.type(canvas.getByTestId("condition-to"), "10");
    await expect(canvas.getByTestId("condition-sentence")).toHaveTextContent("when demo.count is greater than 10");
    const add = canvas.getByRole("button", { name: "Add widget" });
    await expect(add).toBeEnabled();
    await userEvent.click(add);
    await expect(args.onAdd).toHaveBeenCalledTimes(1);
    await expect(args.onAdd).toHaveBeenCalledWith(
      "antd-label",
      expect.objectContaining({ when: [{ path: "demo.count", is: "greater", to: 10 }] }),
      expect.anything(),
    );
  },
};

/**
 * A setting's DESCRIPTION is part of its label and may run to several lines
 * (the infinite table's `filterRow`, `windowed`, `columnStateKey`,
 * `fetchAhead`): the label is as tall as its text, so every line is whole
 * and the field stands under it — never over its last line.
 */
export const LongDescriptions: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show widgets" }));
    await userEvent.click(canvas.getByRole("button", { name: /antd-infinite-table/ }));
    const settings = await canvas.findByTestId("widget-settings");
    const labels = [...settings.querySelectorAll<HTMLElement>(".ant-form-item-label > label")];
    await expect(labels.length).toBeGreaterThan(10);
    // In a narrow panel several descriptions wrap.
    canvasElement.style.width = "480px";
    const wrapped = labels.filter((label) => label.getBoundingClientRect().height > 40);
    await expect(wrapped.length).toBeGreaterThan(0);
    for (const label of labels) {
      const box = label.getBoundingClientRect();
      // The text inside is no taller than the label that holds it…
      for (const text of label.querySelectorAll<HTMLElement>(".ant-typography")) {
        const lines = text.getBoundingClientRect();
        await expect(lines.top).toBeGreaterThanOrEqual(box.top - 1);
        await expect(lines.bottom).toBeLessThanOrEqual(box.bottom + 1);
      }
      // …and the field begins where the label ends.
      const control = label.closest(".ant-form-item")?.querySelector<HTMLElement>(".ant-form-item-control");
      if (control) await expect(control.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.bottom - 1);
    }
    canvasElement.style.width = "";
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
