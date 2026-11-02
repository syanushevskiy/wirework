import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdDivider } from "../widgets/antd-divider";
import { dividerConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-divider" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The title, where it sits on the line, and a dashed line — all from the settings. */
export const Playground: Story = playground(antdDivider);

// The `divider` contract's conformance set.
const conformance = dividerConformance(antdDivider);
export const Titled: Story = conformance.Titled;
export const Plain: Story = conformance.Plain;
