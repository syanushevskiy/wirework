import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdProgress } from "../widgets/antd-progress";
import { progressConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-progress" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drive `percent` from the controls — past 100 too: the bar clamps. */
export const Playground: Story = playground(antdProgress);

// The `progress` contract's conformance set.
const conformance = progressConformance(antdProgress);
export const Value: Story = conformance.Value;
export const Clamped: Story = conformance.Clamped;
export const BoundToEmptyPath: Story = conformance.BoundToEmptyPath;
export const WithoutValue: Story = conformance.WithoutValue;
