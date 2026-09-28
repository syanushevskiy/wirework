import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdAlert } from "../widgets/antd-alert";
import { alertConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-alert" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Title, description, tone and icon as settings; the optional `title` port as a data control. */
export const Playground: Story = playground(antdAlert);

// The `alert` contract's conformance set.
const conformance = alertConformance(antdAlert);
export const Static: Story = conformance.Static;
export const FromStore: Story = conformance.FromStore;
export const BoundToEmptyValue: Story = conformance.BoundToEmptyValue;
