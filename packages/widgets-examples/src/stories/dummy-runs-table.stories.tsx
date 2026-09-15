import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RunsData } from "@wirework/schema";
import { dummyRunsTable } from "../widgets/dummy-runs-table";
import { WidgetStory } from "./harness";

const runs: RunsData = {
  order: ["1", "2", "3"],
  byId: {
    "1": { id: "1", name: "Nightly", reference: "REF-1", inbound: "IN-1", status: { state: "Success", message: "ok" } },
    "2": { id: "2", name: "Smoke", reference: "REF-2", inbound: "IN-2", status: { state: "Failed", message: "boom" } },
    "3": { id: "3", name: "Regression", reference: "REF-3", inbound: "IN-3", status: { state: "Success", message: "ok" } },
  },
};

const meta = {
  title: "Widgets/dummy-runs-table",
  render: () => (
    // Click a row: `row-selected` in Actions; the reaction stores the id.
    <WidgetStory
      key="seeded"
      definition={dummyRunsTable}
      seed={{ runs: { data: runs } }}
      viewModel={{ inputs: { data: "runs.data" }, on: { "row-selected": [{ set: "runs.selected", from: "id" }] } }}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Seeded: Story = {};

/** Custom columns (a non-primitive setting: not a control, but a story can set it). */
export const StatusOnly: Story = {
  render: () => (
    <WidgetStory
      key="status"
      definition={dummyRunsTable}
      seed={{ runs: { data: runs } }}
      viewModel={{
        inputs: { data: "runs.data" },
        columns: [
          { name: "Run", property: "name" },
          { name: "Status", property: "status.state" },
        ],
      }}
    />
  ),
};

/** The bound path holds nothing: the port's declared default (no rows). */
export const EmptyPath: Story = {
  render: () => (
    <WidgetStory key="empty" definition={dummyRunsTable} viewModel={{ inputs: { data: "runs.missing" } }} />
  ),
};
