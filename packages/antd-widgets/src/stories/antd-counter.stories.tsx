import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { antdCounter } from "../widgets/antd-counter";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";
import { playground } from "./playground";

type Args = { step: number; label: string; initial: number };

const meta = {
  title: "Widgets/antd-counter",
  argTypes: { ...storyArgTypes(antdCounter), initial: { control: "number", description: "Seeded store value" } },
  args: { ...storyArgs(antdCounter), initial: 0 } as Args,
  render: ({ initial, ...settings }) => (
    // Its own reaction stores the emitted value, exactly as on a page.
    <WidgetStory
      key={String(initial)}
      definition={antdCounter}
      seed={{ demo: { counter: initial } }}
      viewModel={{
        ...settings,
        inputs: { value: "demo.counter" },
        on: { incremented: [{ set: "demo.counter", from: "value" }] },
      }}
    />
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click it and the `value` control counts along; set the control and the counter shows it. */
export const Playground: Story = playground(antdCounter, { hide: ["initial"] });

export const Default: Story = {};

export const StepOfFive: Story = { args: { step: 5, initial: 10 } };

/** Interaction test: two clicks -> the reaction wrote 2 back into the store. */
export const Clicks: Story = {
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByTestId("antd-counter");
    await userEvent.click(button);
    await userEvent.click(button);
    await expect(button).toHaveTextContent("(2)");
  },
};

/** The bound path holds nothing: the port's declared default (0) shows. */
export const EmptyPath: Story = {
  render: (args) => (
    <WidgetStory
      key="empty"
      definition={antdCounter}
      viewModel={{
        step: args.step,
        label: args.label,
        inputs: { value: "demo.missing" },
        on: { incremented: [{ set: "demo.missing", from: "value" }] },
      }}
    />
  ),
};
