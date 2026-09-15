import type { Meta, StoryObj } from "@storybook/react-vite";
import { dummyLabel } from "../widgets/dummy-label";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";

type Args = { text: string; tone: string };

const meta = {
  title: "Widgets/dummy-label",
  argTypes: storyArgTypes(dummyLabel),
  args: { text: "Hello from Storybook", ...storyArgs(dummyLabel) } as Args,
  render: (args) => <WidgetStory definition={dummyLabel} viewModel={{ ...args }} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {};

export const Danger: Story = { args: { tone: "danger" } };

/** The optional `text` input port bound to a seeded store path overrides the static text. */
export const FromStore: Story = {
  render: (args) => (
    <WidgetStory
      key="from-store"
      definition={dummyLabel}
      seed={{ demo: { greeting: "Text from the store" } }}
      viewModel={{ ...args, inputs: { text: "demo.greeting" } }}
    />
  ),
};

/** Bound, but the path holds nothing: the static text is the fallback. */
export const BoundToEmptyPath: Story = {
  render: (args) => (
    <WidgetStory
      key="empty"
      definition={dummyLabel}
      viewModel={{ ...args, inputs: { text: "demo.missing" } }}
    />
  ),
};
