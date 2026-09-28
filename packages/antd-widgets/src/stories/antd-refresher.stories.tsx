import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdRefresher } from "../widgets/antd-refresher";
import { refresherConformance } from "./conformance";
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

// The `refresher` contract's conformance set.
const conformance = refresherConformance(antdRefresher);
export const Idle: Story = conformance.Idle;
export const ManualRefresh: Story = conformance.ManualRefresh;
export const Schedule: Story = conformance.Schedule;
