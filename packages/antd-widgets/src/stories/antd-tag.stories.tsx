import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdTag } from "../widgets/antd-tag";
import { tagConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-tag" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The static text and tone as settings; the optional `text` port as a data control. */
export const Playground: Story = playground(antdTag);

// The `tag` contract's conformance set.
const conformance = tagConformance(antdTag);
export const Static: Story = conformance.Static;
export const FromStore: Story = conformance.FromStore;
export const BoundToEmptyValue: Story = conformance.BoundToEmptyValue;
