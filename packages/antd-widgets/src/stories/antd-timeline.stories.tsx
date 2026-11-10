import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdTimeline } from "../widgets/antd-timeline";
import { timelineConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-timeline" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Edit the entries in the `items` control; `pending` adds an open last one. */
export const Playground: Story = playground(antdTimeline);

// The `timeline` contract's conformance set.
const conformance = timelineConformance(antdTimeline);
export const Entries: Story = conformance.Entries;
export const Pending: Story = conformance.Pending;
