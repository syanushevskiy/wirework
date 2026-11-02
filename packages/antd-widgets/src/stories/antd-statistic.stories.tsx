import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdStatistic } from "../widgets/antd-statistic";
import { statisticConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-statistic" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drive `value` from the controls — a number or text; prefix, suffix and precision from the settings. */
export const Playground: Story = playground(antdStatistic);

// The `statistic` contract's conformance set.
const conformance = statisticConformance(antdStatistic);
export const Number: Story = conformance.Number;
export const Text: Story = conformance.Text;
