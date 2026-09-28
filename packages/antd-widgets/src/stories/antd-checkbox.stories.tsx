import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdCheckbox } from "../widgets/antd-checkbox";
import { checkboxConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-checkbox" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tick the widget and the `checked` control follows; flip the control and the widget follows. */
export const Playground: Story = playground(antdCheckbox);

// The `checkbox` contract's conformance set.
const conformance = checkboxConformance(antdCheckbox);
export const Unchecked: Story = conformance.Unchecked;
export const Toggles: Story = conformance.Toggles;
export const FromStore: Story = conformance.FromStore;
