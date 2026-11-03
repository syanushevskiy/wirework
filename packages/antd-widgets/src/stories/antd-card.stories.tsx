import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdCard } from "../widgets/antd-card";
import { antdLabel } from "../widgets/antd-label";
import { cardConformance } from "./conformance";
import { playground } from "./playground";
import { inside } from "./story-engine";

const meta = { title: "Widgets/antd-card" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The title and the size from the controls; outside a page the card says only what it holds. */
export const Playground: Story = playground(antdCard);

// The `card` contract's conformance set, with a label inside.
const conformance = cardConformance(antdCard, { ...inside(antdLabel), label: "antd-label" });
export const Content: Story = conformance.Content;
export const Empty: Story = conformance.Empty;
