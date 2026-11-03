import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdLabel } from "../widgets/antd-label";
import { antdTabs } from "../widgets/antd-tabs";
import { tabsConformance } from "./conformance";
import { playground } from "./playground";
import { inside } from "./story-engine";

const meta = { title: "Widgets/antd-tabs" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The tabs from the controls (an object control); outside a page each tab says only what it holds. */
export const Playground: Story = playground(antdTabs);

// The `tabs` contract's conformance set, with a label per tab.
const conformance = tabsConformance(antdTabs, { ...inside(antdLabel), label: "antd-label" });
export const Switches: Story = conformance.Switches;
