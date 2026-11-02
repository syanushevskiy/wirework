import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdSwitch } from "../widgets/antd-switch";
import { switchConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-switch" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip the widget and the `checked` control follows; flip the control and the widget follows. */
export const Playground: Story = playground(antdSwitch);

// The `switch` contract's conformance set.
const conformance = switchConformance(antdSwitch);
export const Off: Story = conformance.Off;
export const Flips: Story = conformance.Flips;
export const FromStore: Story = conformance.FromStore;
