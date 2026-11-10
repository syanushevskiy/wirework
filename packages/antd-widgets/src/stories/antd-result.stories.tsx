import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdResult } from "../widgets/antd-result";
import { resultConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-result" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every status picture from the `status` control; the action's click lands in the Actions panel. */
export const Playground: Story = playground(antdResult);

// The `result` contract's conformance set.
const conformance = resultConformance(antdResult);
export const Static: Story = conformance.Static;
export const Alerting: Story = conformance.Alerting;
export const FromStore: Story = conformance.FromStore;
export const Action: Story = conformance.Action;
