import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdTag } from "../widgets/antd-tag";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-tag" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The static text and tone as settings; the optional `text` port as a data control. */
export const Playground: Story = playground(antdTag);

export const Tag: Story = {
  render: () => <WidgetStory key="tag" definition={antdTag} viewModel={{ text: "Failed", tone: "danger" }} />,
};
