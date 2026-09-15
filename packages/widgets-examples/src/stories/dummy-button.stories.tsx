import type { Meta, StoryObj } from "@storybook/react-vite";
import { dummyButton } from "../widgets/dummy-button";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";

type Args = { label: string };

const meta = {
  title: "Widgets/dummy-button",
  argTypes: storyArgTypes(dummyButton),
  args: storyArgs(dummyButton) as Args,
  render: (args) => <WidgetStory definition={dummyButton} viewModel={{ ...args }} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click it: the `clicked` event appears in the Actions panel. */
export const Default: Story = {};

/** A `set` reaction with a literal: the click writes a flag into the store. */
export const SetsAFlag: Story = {
  render: (args) => (
    <WidgetStory
      key="flag"
      definition={dummyButton}
      viewModel={{ ...args, on: { clicked: [{ set: "ui.clicked", value: true }] } }}
    />
  ),
};
