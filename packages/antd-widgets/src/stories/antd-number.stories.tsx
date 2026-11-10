import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdNumber } from "../widgets/antd-number";
import { numberConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-number" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type or step a number and the `value` control follows; set the control and the field follows. */
export const Playground: Story = playground(antdNumber);

// The `number` contract's conformance set.
const conformance = numberConformance(antdNumber);
export const Value: Story = conformance.Value;
export const Types: Story = conformance.Types;
export const Empties: Story = conformance.Empties;
