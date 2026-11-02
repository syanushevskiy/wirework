import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdRadioGroup } from "../widgets/antd-radio-group";
import { radioGroupConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-radio-group" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pick an option and the `value` control follows; `buttons` shows them as a row of buttons. */
export const Playground: Story = playground(antdRadioGroup);

// The `radio-group` contract's conformance set.
const conformance = radioGroupConformance(antdRadioGroup);
export const Picks: Story = conformance.Picks;
export const FromStore: Story = conformance.FromStore;
