import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdLabel } from "../widgets/antd-label";
import { labelConformance } from "./conformance";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";

type Args = { text: string; tone: string };

const meta = {
  title: "Widgets/antd-label",
  argTypes: storyArgTypes(antdLabel),
  args: { text: "Hello from Storybook", ...storyArgs(antdLabel) } as Args,
  render: (args) => <WidgetStory definition={antdLabel} viewModel={{ ...args }} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

// The `label` contract's conformance set — the same for every implementation.
const conformance = labelConformance(antdLabel);
export const Static: Story = conformance.Static;
export const FromStore: Story = conformance.FromStore;
export const BoundToEmptyPath: Story = conformance.BoundToEmptyPath;

// Implementation-specific extras.
export const Danger: Story = { args: { tone: "danger" } };
