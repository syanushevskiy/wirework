import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdDateRange } from "../widgets/antd-date-range";
import { dateRangeConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-date-range" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pick two days and the `value` control shows the stored pair. */
export const Playground: Story = playground(antdDateRange);

// The `date-range` contract's conformance set.
const conformance = dateRangeConformance(antdDateRange);
export const Value: Story = conformance.Value;
export const Types: Story = conformance.Types;
