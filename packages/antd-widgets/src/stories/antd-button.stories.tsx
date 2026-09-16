import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdButton } from "../widgets/antd-button";
import { buttonConformance } from "./conformance";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";

type Args = { label: string };

const meta = {
  title: "Widgets/antd-button",
  argTypes: storyArgTypes(antdButton),
  args: storyArgs(antdButton) as Args,
  render: (args) => <WidgetStory definition={antdButton} viewModel={{ ...args }} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

// The `button` contract's conformance set.
const conformance = buttonConformance(antdButton);
export const Default: Story = conformance.Default;
export const SetsAFlag: Story = conformance.SetsAFlag;
