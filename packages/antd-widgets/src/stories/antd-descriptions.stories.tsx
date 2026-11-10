import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdDescriptions } from "../widgets/antd-descriptions";
import { descriptionsConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-descriptions" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Edit the record in the `record` control and the fields follow; the `items` control picks the cell kinds. */
export const Playground: Story = playground(antdDescriptions);

// The `descriptions` contract's conformance set.
const conformance = descriptionsConformance(antdDescriptions);
export const Fields: Story = conformance.Fields;
export const LinkClicked: Story = conformance.LinkClicked;
export const BoundToEmptyPath: Story = conformance.BoundToEmptyPath;
