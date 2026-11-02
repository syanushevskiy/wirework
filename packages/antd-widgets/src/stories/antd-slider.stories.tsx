import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdSlider } from "../widgets/antd-slider";
import { sliderConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-slider" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the handle and the `value` control follows; change the range from the settings. */
export const Playground: Story = playground(antdSlider);

// The `slider` contract's conformance set.
const conformance = sliderConformance(antdSlider);
export const Value: Story = conformance.Value;
export const Moves: Story = conformance.Moves;
