import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdFilterBar } from "../widgets/antd-filter-bar";
import { filterBarConformance } from "./conformance";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const filters = [
  { id: "state", label: "Status", options: [{ value: "Running" }, { value: "Failed" }, { value: "Success" }] },
  {
    id: "host",
    label: "Host",
    options: [
      { value: "qa-1", label: "QA 1" },
      { value: "qa-2", label: "QA 2" },
    ],
  },
];

const meta = {
  title: "Widgets/antd-filter-bar",
  render: () => (
    // Which filters there are is DATA; every change emits everything chosen,
    // and the default reaction stores it.
    <WidgetStory
      key="filters"
      definition={antdFilterBar}
      seed={{ demo: { filters, chosen: { state: ["Running"] } } }}
      viewModel={{ inputs: { filters: "demo.filters", value: "demo.chosen" } }}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Which filters there are is DATA: add one in the `filters` control; pick a value and the `value` control follows. */
export const Playground: Story = playground(antdFilterBar);

// The `filter-bar` contract's conformance set.
const conformance = filterBarConformance(antdFilterBar);
export const FromStore: Story = conformance.FromStore;
export const Chosen: Story = conformance.Chosen;
export const NoFilters: Story = conformance.NoFilters;
