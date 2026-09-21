import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { antdRefresher } from "../widgets/antd-refresher";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";
import { playground } from "./playground";

type Args = { label: string; buttonLabel: string };

const meta = {
  title: "Widgets/antd-refresher",
  argTypes: storyArgTypes(antdRefresher),
  args: storyArgs(antdRefresher) as Args,
  render: (settings) => (
    // `changed` stores the whole schedule; `refresh` stores its trigger, so
    // the store readout shows every click and tick.
    <WidgetStory
      key="default"
      definition={antdRefresher}
      seed={{ demo: { schedule: { enabled: false, interval: 5 } } }}
      viewModel={{
        ...settings,
        inputs: { schedule: "demo.schedule" },
        on: {
          changed: [{ set: "demo.schedule" }],
          refresh: [{ set: "demo.lastTrigger", from: "trigger" }],
        },
      }}
    />
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The schedule and `busy` are DATA: set busy and the button spins; toggle the widget and the schedule control follows. */
export const Playground: Story = playground(antdRefresher);

export const Default: Story = {};

/** Interaction test: the checkbox round-trips through the store; a click is a manual refresh. */
export const ToggleAndRefresh: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("checkbox", { name: "Auto-refresh every" });
    await userEvent.click(toggle);
    await expect(toggle).toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Refresh" }));
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"lastTrigger": "manual"');
  },
};
