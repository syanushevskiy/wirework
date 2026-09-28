import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdMultiSelect } from "../widgets/antd-multi-select";
import { multiSelectConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-multi-select" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every setting and both ports (the chosen values, the options) as controls. */
export const Playground: Story = playground(antdMultiSelect);

// The `multi-select` contract's conformance set.
const conformance = multiSelectConformance(antdMultiSelect);
export const Choose: Story = conformance.Choose;
export const FromStore: Story = conformance.FromStore;
