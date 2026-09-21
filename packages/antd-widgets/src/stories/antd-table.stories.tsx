import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { antdTable } from "../widgets/antd-table";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const rows = [
  { id: "1", name: "Nightly", owner: { team: "Core" }, status: "Success" },
  { id: "2", name: "Smoke", owner: { team: "Web" }, status: "Failed" },
  { id: "3", name: "Regression", owner: { team: "Core" }, status: "Success" },
];

const meta = {
  title: "Widgets/antd-table",
  render: () => (
    // Click a row: `row-selected` in Actions; the reaction stores its key.
    <WidgetStory
      key="columns"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows" },
        on: { "row-selected": [{ set: "demo.selected", from: "key" }] },
        columns: [
          { title: "Name", property: "name" },
          { title: "Team", property: "owner.team" },
          { title: "Status", property: "status" },
        ],
      }}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Rows, columns and `loading` are DATA: edit the rows, add a column, flip
 * loading — what a host's loader would write. `columns` exists twice on
 * purpose: the setting, and the port that wins over it when it holds columns.
 */
export const Playground: Story = playground(antdTable, {
  seed: { demo: { rows } },
  viewModel: {
    inputs: { rows: "demo.rows" },
    on: { "row-selected": [{ set: "demo.selected", from: "key" }] },
    columns: [
      { title: "Name", property: "name" },
      { title: "Team", property: "owner.team" },
      { title: "Status", property: "status" },
    ],
  },
});

export const ConfiguredColumns: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("Smoke"));
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"selected": "2"');
  },
};

/** No columns configured: one per field of the first row (objects shown as JSON). */
export const InferredColumns: Story = {
  render: () => (
    <WidgetStory key="inferred" definition={antdTable} seed={{ demo: { rows } }} viewModel={{ inputs: { rows: "demo.rows" } }} />
  ),
};

/** Rows keyed by another property. */
export const CustomRowKey: Story = {
  render: () => (
    <WidgetStory
      key="row-key"
      definition={antdTable}
      seed={{ demo: { users: [{ email: "ann@example.com", name: "Ann" }, { email: "bo@example.com", name: "Bo" }] } }}
      viewModel={{ inputs: { rows: "demo.users" }, rowKey: "email" }}
    />
  ),
};

/** The bound path holds nothing: the port's default, no rows. */
export const EmptyPath: Story = {
  render: () => (
    <WidgetStory key="empty" definition={antdTable} viewModel={{ inputs: { rows: "demo.missing" }, emptyText: "No runs yet" }} />
  ),
};

/** Columns from the STORE (a table the server describes): the port wins over the setting. */
export const ColumnsFromTheStore: Story = {
  render: () => (
    <WidgetStory
      key="bound-columns"
      definition={antdTable}
      seed={{ demo: { rows, columns: [{ title: "Run", property: "name" }, { title: "Result", property: "status" }] } }}
      viewModel={{
        inputs: { rows: "demo.rows", columns: "demo.columns" },
        columns: [{ title: "Ignored while the port holds columns", property: "id" }],
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("columnheader", { name: "Result" })).toBeVisible();
    await expect(canvas.queryByRole("columnheader", { name: /Ignored/ })).toBeNull();
  },
};
