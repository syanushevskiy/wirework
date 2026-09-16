import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdCrash } from "../widgets/antd-crash";
import { WidgetStory } from "./harness";

const meta = {
  title: "Widgets/antd-crash",
  render: () => <WidgetStory definition={antdCrash} viewModel={{ message: "intentional crash" }} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Throws on render: the per-cell error boundary shows the placeholder. */
export const Crashes: Story = {};
