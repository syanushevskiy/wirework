import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdSteps } from "../widgets/antd-steps";
import { stepsConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-steps" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the `current` control by key or position; name and add steps in `items`. */
export const Playground: Story = playground(antdSteps);

// The `steps` contract's conformance set.
const conformance = stepsConformance(antdSteps);
export const Current: Story = conformance.Current;
export const Failed: Story = conformance.Failed;
export const Clicks: Story = conformance.Clicks;
