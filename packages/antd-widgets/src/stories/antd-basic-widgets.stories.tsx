/**
 * The basic widgets (doc/widget-catalog.md): select, tag, checkbox, progress
 * and alert, each with its own reactions bound through the harness, so a
 * pick or a tick lands in the store readout underneath.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { antdAlert } from "../widgets/antd-alert";
import { antdCheckbox } from "../widgets/antd-checkbox";
import { antdMultiSelect } from "../widgets/antd-multi-select";
import { antdProgress } from "../widgets/antd-progress";
import { antdSelect } from "../widgets/antd-select";
import { antdTag } from "../widgets/antd-tag";
import { WidgetStory } from "./harness";

const meta = { title: "Widgets/basic widgets" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Select: Story = {
  render: () => (
    <WidgetStory
      key="select"
      definition={antdSelect}
      seed={{ demo: { environment: "" } }}
      viewModel={{
        inputs: { value: "demo.environment" },
        on: { changed: [{ set: "demo.environment", from: "value" }] },
        label: "Environment",
        options: [
          { value: "staging", label: "Staging" },
          { value: "production", label: "Production" },
        ],
      }}
    />
  ),
};

/** Options from the store instead of the setting — how a host loads them. */
export const SelectWithStoreOptions: Story = {
  render: () => (
    <WidgetStory
      key="select-options"
      definition={antdSelect}
      seed={{ demo: { app: "", apps: [{ value: "billing" }, { value: "search", label: "Search API" }] } }}
      viewModel={{
        inputs: { value: "demo.app", options: "demo.apps" },
        on: { changed: [{ set: "demo.app", from: "value" }] },
        label: "Application",
      }}
    />
  ),
};

export const MultiSelect: Story = {
  render: () => (
    <WidgetStory
      key="multi-select"
      definition={antdMultiSelect}
      seed={{ demo: { statuses: ["failed"] } }}
      viewModel={{
        inputs: { value: "demo.statuses" },
        on: { changed: [{ set: "demo.statuses", from: "value" }] },
        label: "Statuses",
        options: [
          { value: "success", label: "Success" },
          { value: "failed", label: "Failed" },
          { value: "running", label: "Running" },
        ],
      }}
    />
  ),
};

export const Checkbox: Story = {
  render: () => (
    <WidgetStory
      key="checkbox"
      definition={antdCheckbox}
      seed={{ demo: { agreed: false } }}
      viewModel={{
        inputs: { checked: "demo.agreed" },
        on: { changed: [{ set: "demo.agreed", from: "checked" }] },
        label: "I agree",
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox", { name: "I agree" });
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"agreed": true');
  },
};

export const Tag: Story = {
  render: () => <WidgetStory key="tag" definition={antdTag} viewModel={{ text: "Failed", tone: "danger" }} />,
};

/** 130 in the store: the bar is full, never overfull. */
export const ProgressClamped: Story = {
  render: () => (
    <WidgetStory
      key="progress"
      definition={antdProgress}
      seed={{ demo: { percent: 130 } }}
      viewModel={{ inputs: { percent: "demo.percent" }, label: "Rollout" }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("progressbar", { name: "Rollout" })).toBeVisible();
    await expect(canvas.getByText("100%")).toBeVisible();
  },
};

export const Alert: Story = {
  render: () => (
    <WidgetStory
      key="alert"
      definition={antdAlert}
      viewModel={{ title: "Deployment failed", description: "2 checks did not pass.", tone: "danger" }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Deployment failed");
  },
};
