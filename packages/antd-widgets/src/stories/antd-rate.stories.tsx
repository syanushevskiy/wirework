import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdRate } from "../widgets/antd-rate";
import { rateConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-rate" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pick a star and the `value` control follows; `count` and `allowHalf` from the settings. */
export const Playground: Story = playground(antdRate);

// The `rate` contract's conformance set.
const conformance = rateConformance(antdRate);
export const Value: Story = conformance.Value;
export const Picks: Story = conformance.Picks;
