import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdDialog } from "../widgets/antd-dialog";
import { antdLabel } from "../widgets/antd-label";
import { dialogConformance } from "./conformance";
import { playground } from "./playground";
import { inside } from "./story-engine";

const meta = { title: "Widgets/antd-dialog" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown in place (`inline`): flip the `open` control, switch `as` between a modal and a drawer. */
export const Playground: Story = playground(antdDialog);

// The `dialog` contract's conformance set, with a label inside.
const conformance = dialogConformance(antdDialog, { ...inside(antdLabel), label: "antd-label" });
export const Open: Story = conformance.Open;
export const Closed: Story = conformance.Closed;
export const Closes: Story = conformance.Closes;
