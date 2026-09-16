import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdEcho } from "../widgets/antd-echo";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";

type Args = { label?: string };

const meta = {
  title: "Widgets/antd-echo",
  argTypes: storyArgTypes(antdEcho),
  args: { label: "Value", ...storyArgs(antdEcho) } as Args,
  render: (args) => (
    <WidgetStory
      key="seeded"
      definition={antdEcho}
      seed={{ demo: { value: { answer: 42, tags: ["a", "b"] } } }}
      viewModel={{ ...args, inputs: { value: "demo.value" } }}
    />
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Seeded: Story = {};

/** No default declared on the port: an explicit empty state (∅). */
export const EmptyPath: Story = {
  render: (args) => (
    <WidgetStory key="empty" definition={antdEcho} viewModel={{ ...args, inputs: { value: "demo.nothing" } }} />
  ),
};
