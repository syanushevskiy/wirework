import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdDate } from "../widgets/antd-date";
import { dateConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-date" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pick or type a day and the `value` control shows the stored text; `format` changes the look, never the text. */
export const Playground: Story = playground(antdDate);

// The `date` contract's conformance set.
const conformance = dateConformance(antdDate);
export const Value: Story = conformance.Value;
export const Types: Story = conformance.Types;
export const WithTime: Story = conformance.WithTime;
