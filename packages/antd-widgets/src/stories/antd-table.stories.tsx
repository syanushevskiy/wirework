import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Tag, Tooltip } from "antd";
import { expect, within } from "storybook/test";
import { antdTable, createAntdTable } from "../widgets/antd-table";
import type { TableCellProps } from "../hooks/use-table-cell";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const rows = [
  { id: "1", name: "Nightly", owner: { team: "Core" }, status: "Success", message: "" },
  { id: "2", name: "Smoke", owner: { team: "Web" }, status: "Failed", message: "Timed out after 30 s" },
  { id: "3", name: "Regression", owner: { team: "Core" }, status: "Success", message: "" },
];

/** Columns with CELLS: links to the run (slots select row properties) and a tag per status. */
const cellColumns = [
  { title: "#", property: "id", cell: { kind: "link", to: "/demo/runs/{id}" } },
  { title: "Name", property: "name", cell: { kind: "link", to: "/demo/runs/{id}" } },
  { title: "Team", property: "owner.team" },
  { title: "Status", property: "status", cell: { kind: "tag", tones: { Success: "success", Failed: "danger" } } },
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
    on: {
      "row-selected": [{ set: "demo.selected", from: "key" }],
      "link-clicked": [{ set: "demo.followed", from: "href" }],
    },
    columns: cellColumns,
  },
});

export const ConfiguredColumns: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("Smoke"));
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"selected": "2"');
  },
};

/**
 * Cells: `#` and Name are links to the run, Status a tag in a tone. A plain
 * click on a link emits `link-clicked` with the address — and NOT
 * `row-selected`: the store gets `followed`, never `selected`.
 */
export const Cells: Story = {
  render: () => (
    <WidgetStory
      key="cells"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows" },
        on: {
          "row-selected": [{ set: "demo.selected", from: "key" }],
          "link-clicked": [{ set: "demo.followed", from: "href" }],
        },
        columns: cellColumns,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const link = canvas.getByRole("link", { name: "Smoke" });
    await expect(link).toHaveAttribute("href", "/demo/runs/2");
    await expect(canvas.getByText("Failed")).toHaveAttribute("data-tone", "danger");
    await userEvent.click(link);
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"followed": "/demo/runs/2"');
    await expect(canvas.getByTestId("story-store")).not.toHaveTextContent("selected");
  },
};

/** A renderer the HOST registers: the status tag with the failure's message in a tooltip — two row properties, which no predefined kind offers. */
function StatusWithMessage({ text, row }: TableCellProps) {
  const tag = <Tag color={text === "Failed" ? "error" : "success"}>{text}</Tag>;
  return typeof row["message"] === "string" && row["message"] !== "" ? <Tooltip title={row["message"]}>{tag}</Tooltip> : tag;
}

/** A renderer that ACTS: a button next to the value. The button owns its click — the row is not selected by it. */
function WithButton({ text }: TableCellProps) {
  return (
    <>
      {text} <Button size="small">Copy</Button>
    </>
  );
}

/** Custom cells: the host's own table offers renderers by name; a column selects one. An unknown name shows the text. */
export const CustomCell: Story = {
  render: () => (
    <WidgetStory
      key="custom"
      definition={createAntdTable({ cells: { "status-with-message": StatusWithMessage, "with-button": WithButton } })}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows" },
        on: { "row-selected": [{ set: "demo.selected", from: "key" }] },
        columns: [
          { title: "Name", property: "name" },
          { title: "Id", property: "id", cell: { kind: "custom", name: "with-button" } },
          { title: "Status", property: "status", cell: { kind: "custom", name: "status-with-message" } },
          { title: "Team", property: "owner.team", cell: { kind: "custom", name: "no-such-renderer" } },
        ],
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Failed")).toBeVisible();
    await expect(canvas.getAllByText("Core")[0]).toHaveAttribute("data-cell-problem", "unknown-renderer");
    // A button inside a cell owns its click: no row-selected.
    await userEvent.click(within(canvas.getByText("Smoke").closest("tr") as HTMLElement).getByRole("button", { name: "Copy" }));
    await expect(canvas.getByTestId("story-store")).not.toHaveTextContent("selected");
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
