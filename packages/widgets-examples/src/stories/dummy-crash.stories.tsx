import type { Meta, StoryObj } from "@storybook/react-vite";
import { dummyCrash } from "../widgets/dummy-crash";
import { WidgetStory } from "./harness";

const meta = {
  title: "Widgets/dummy-crash",
  render: () => <WidgetStory definition={dummyCrash} viewModel={{ message: "intentional crash" }} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Throws on render: the per-cell error boundary shows the placeholder. */
export const Crashes: Story = {};
