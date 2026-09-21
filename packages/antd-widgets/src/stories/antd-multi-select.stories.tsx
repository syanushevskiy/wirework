import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdMultiSelect } from "../widgets/antd-multi-select";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-multi-select" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every setting and both ports (the chosen values, the options) as controls. */
export const Playground: Story = playground(antdMultiSelect);

export const MultiSelect: Story = {
  render: () => (
    <WidgetStory
      key="multi-select"
      definition={antdMultiSelect}
      seed={{ demo: { statuses: ["failed"] } }}
      viewModel={{
        inputs: { value: "demo.statuses" },
        on: { changed: [{ set: "demo.statuses", from: "value" }] },
        label: "Statuses",
        options: [
          { value: "success", label: "Success" },
          { value: "failed", label: "Failed" },
          { value: "running", label: "Running" },
        ],
      }}
    />
  ),
};
