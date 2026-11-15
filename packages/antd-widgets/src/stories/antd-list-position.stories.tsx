import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdListPosition } from "../widgets/antd-list-position";
import { listPositionConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-list-position" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Position, rows in view and total are DATA: change `position` as a
 * scrolling list would and the handle follows; drag the handle and let go,
 * and `position` follows (the default reaction stored it).
 */
export const Playground: Story = playground(antdListPosition);

// The `list-position` contract's conformance set.
const conformance = listPositionConformance(antdListPosition);
export const Stands: Story = conformance.Stands;
export const Jumps: Story = conformance.Jumps;
export const Vertical: Story = conformance.Vertical;
export const Empty: Story = conformance.Empty;
export const EndUnknown: Story = conformance.EndUnknown;
