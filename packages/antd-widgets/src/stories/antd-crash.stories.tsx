import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdCrash } from "../widgets/antd-crash";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = {
  title: "Widgets/antd-crash",
  render: () => <WidgetStory definition={antdCrash} viewModel={{ message: "intentional crash" }} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Its message is the only control: the error boundary's placeholder shows it. */
export const Playground: Story = playground(antdCrash);

/** Throws on render: the per-cell error boundary shows the placeholder. */
export const Crashes: Story = {};
