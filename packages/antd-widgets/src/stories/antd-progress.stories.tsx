import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { antdProgress } from "../widgets/antd-progress";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-progress" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drive `percent` from the controls — past 100 too: the bar clamps. */
export const Playground: Story = playground(antdProgress);

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
