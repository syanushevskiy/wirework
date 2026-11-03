import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdCollapse } from "../widgets/antd-collapse";
import { antdLabel } from "../widgets/antd-label";
import { collapseConformance } from "./conformance";
import { playground } from "./playground";
import { inside } from "./story-engine";

const meta = { title: "Widgets/antd-collapse" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The panels from the controls (an object control); outside a page each panel says only what it holds. */
export const Playground: Story = playground(antdCollapse);

// The `collapse` contract's conformance set, with a label per panel.
const conformance = collapseConformance(antdCollapse, { ...inside(antdLabel), label: "antd-label" });
export const Panels: Story = conformance.Panels;
