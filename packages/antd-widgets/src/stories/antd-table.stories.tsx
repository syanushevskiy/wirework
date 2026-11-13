import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Tag, Tooltip } from "antd";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { antdTable, createAntdTable } from "../widgets/antd-table";
import type { TableCellProps } from "../hooks/use-table-cell";
import type { TableToolbarItemProps } from "../hooks/use-table-toolbar";
import { tableConformance } from "./conformance";
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

// The `table` contract's conformance set.
const conformance = tableConformance(antdTable);
export const Rows: Story = conformance.Rows;
export const RowSelected: Story = conformance.RowSelected;
export const LoadsOnAppearance: Story = conformance.LoadsOnAppearance;
export const BoundToEmptyPath: Story = conformance.BoundToEmptyPath;

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
  return typeof row["message"] === "string" && row["message"] !== "" ? (
    <Tooltip title={row["message"]}>{tag}</Tooltip>
  ) : (
    tag
  );
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
    await userEvent.click(
      within(canvas.getByText("Smoke").closest("tr") as HTMLElement).getByRole("button", { name: "Copy" }),
    );
    await expect(canvas.getByTestId("story-store")).not.toHaveTextContent("selected");
    await userEvent.click(canvas.getByText("Smoke"));
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"selected": "2"');
  },
};

/** No columns configured: one per field of the first row (objects shown as JSON). */
export const InferredColumns: Story = {
  render: () => (
    <WidgetStory
      key="inferred"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{ inputs: { rows: "demo.rows" } }}
    />
  ),
};

/** Rows keyed by another property. */
export const CustomRowKey: Story = {
  render: () => (
    <WidgetStory
      key="row-key"
      definition={antdTable}
      seed={{
        demo: {
          users: [
            { email: "ann@example.com", name: "Ann" },
            { email: "bo@example.com", name: "Bo" },
          ],
        },
      }}
      viewModel={{ inputs: { rows: "demo.users" }, rowKey: "email" }}
    />
  ),
};

/** Columns as a loader derives them: what each header filters by, and which the server sorts by. */
const headerColumns = [
  { title: "#", property: "id", sortable: true },
  { title: "Name", property: "name", filter: { kind: "text" } },
  { title: "Team", property: "owner.team" },
  {
    title: "Status",
    property: "status",
    filter: { kind: "values", options: [{ value: "Success" }, { value: "Failed" }] },
  },
];

/**
 * HEADER FILTERS on the paged table — the same ones the infinite table has,
 * turned on with the `headerFilters` setting: a values column's list to
 * tick, a text column's SEARCH icon, a sortable header. The choice reaches
 * the store whole, under the request's own names (the reactions store it).
 */
export const HeaderFilters: Story = {
  render: () => (
    <WidgetStory
      key="header-filters"
      definition={antdTable}
      seed={{ demo: { rows, filterIn: {}, filterLike: {}, orderBy: {} } }}
      viewModel={{
        inputs: {
          rows: "demo.rows",
          filterIn: "demo.filterIn",
          filterLike: "demo.filterLike",
          orderBy: "demo.orderBy",
        },
        on: {
          "filter-changed": [
            { set: "demo.filterIn", from: "filterIn" },
            { set: "demo.filterLike", from: "filterLike" },
          ],
          "sort-changed": [{ set: "demo.orderBy", from: "orderBy" }],
        },
        columns: headerColumns,
        headerFilters: true,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const status = canvas.getByRole("columnheader", { name: /Status/ });
    await expect(within(status).getByRole("img", { name: "filter" })).toBeVisible();
    await expect(
      within(canvas.getByRole("columnheader", { name: /Name/ })).getByRole("img", { name: "search" }),
    ).toBeVisible();
    await userEvent.click(within(status).getByRole("button"));
    // A Select of several values: a pick filters AT ONCE — nothing to apply; Done only closes.
    const values = within(await within(document.body).findByRole("group", { name: "Values of Status" }));
    const store = canvas.getByTestId("story-store");
    // Searched by label: typing leaves the values that match.
    await userEvent.type(values.getByRole("combobox"), "succ");
    await waitFor(() => expect(within(document.body).getByTitle("Success")).toBeVisible());
    await waitFor(() => expect(within(document.body).queryByTitle("Failed")).toBeNull());
    await userEvent.click(within(document.body).getByTitle("Success"));
    await waitFor(() => expect(store).toHaveTextContent('"filterIn": { "status": [ "Success" ] }'));
    // A second value is a second tag, and filters at once too.
    await userEvent.click(await within(document.body).findByTitle("Failed"));
    await waitFor(() => expect(store).toHaveTextContent('"filterIn": { "status": [ "Success", "Failed" ] }'));
    // Reset filters by nothing and leaves the box open; Done closes it and changes nothing.
    await userEvent.click(values.getByRole("button", { name: "Reset" }));
    await waitFor(() => expect(store).toHaveTextContent('"filterIn": {}'));
    await userEvent.click(values.getByRole("combobox"));
    await userEvent.click(await within(document.body).findByTitle("Failed"));
    await waitFor(() => expect(store).toHaveTextContent('"filterIn": { "status": [ "Failed" ] }'));
    await userEvent.click(values.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(within(document.body).queryByRole("group", { name: "Values of Status" })).toBeNull());
    await expect(store).toHaveTextContent('"filterIn": { "status": [ "Failed" ] }');
    await userEvent.click(within(canvas.getByRole("columnheader", { name: /#/ })).getByText("#"));
    await expect(store).toHaveTextContent('"orderBy": { "id": "ASC" }');
  },
};

/**
 * A DATE column is filtered by a PERIOD: its header's calendar icon opens a
 * start and an end date — typed here, never clicked in a calendar —, Filter
 * sends both under the request's `filterBetween`, and Reset takes the
 * period away again.
 */
export const HeaderPeriod: Story = {
  render: () => (
    <WidgetStory
      key="header-period"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows", filterBetween: "demo.filterBetween" },
        on: { "filter-changed": [{ set: "demo.filterBetween", from: "filterBetween" }] },
        columns: [
          { title: "Name", property: "name" },
          { title: "Started", property: "started", filter: { kind: "dates" } },
        ],
        headerFilters: true,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const body = within(document.body);
    const store = canvas.getByTestId("story-store");
    const started = canvas.getByRole("columnheader", { name: /Started/ });
    await expect(within(started).getByRole("img", { name: "calendar" })).toBeVisible();
    await userEvent.click(within(started).getByRole("button"));
    const period = await body.findByRole("group", { name: "Period of Started" });
    const [from, to] = within(period).getAllByRole("textbox");
    await userEvent.type(from as HTMLElement, "2026-11-01{Enter}");
    await userEvent.type(to as HTMLElement, "2026-11-03{Enter}");
    await userEvent.click(within(period).getByRole("button", { name: "Filter" }));
    await waitFor(() =>
      expect(store).toHaveTextContent('"filterBetween": { "started": [ "2026-11-01", "2026-11-03" ] }'),
    );
    // Reset clears the period and says so at once.
    await userEvent.click(within(started).getByRole("button"));
    await userEvent.click(
      within(await body.findByRole("group", { name: "Period of Started" })).getByRole("button", { name: "Reset" }),
    );
    await waitFor(() => expect(store).toHaveTextContent('"filterBetween": {}'));
  },
};

const periodColumns = [
  { title: "Name", property: "name" },
  { title: "Started", property: "started", filter: { kind: "dates" } },
];

/**
 * A period needs somewhere to live: while the `filterBetween` port is not
 * bound a date column has NO filter in its header — a loader gives every
 * date column one by default, and a calendar whose choice goes nowhere
 * would be worse than none.
 */
export const PeriodNeedsItsPort: Story = {
  render: () => (
    <WidgetStory
      key="period-unbound"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{ inputs: { rows: "demo.rows" }, columns: periodColumns, headerFilters: true }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(within(canvas.getByRole("columnheader", { name: /Started/ })).queryByRole("button")).toBeNull();
  },
};

/**
 * The FILTER ROW shows a date column's period as two fields, each its own:
 * a start date alone filters "from then on", the end date closes the period.
 */
export const FilterRowPeriod: Story = {
  render: () => (
    <WidgetStory
      key="filter-row-period"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows", filterBetween: "demo.filterBetween" },
        on: { "filter-changed": [{ set: "demo.filterBetween", from: "filterBetween" }] },
        columns: periodColumns,
        filterRow: true,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const store = canvas.getByTestId("story-store");
    const fields = () => within(canvas.getByRole("group", { name: "Filter Started" })).getAllByRole("textbox");
    await userEvent.type(fields()[0] as HTMLElement, "2026-11-01{Enter}");
    await waitFor(() => expect(store).toHaveTextContent('"filterBetween": { "started": [ "2026-11-01", "" ] }'));
    await userEvent.type(fields()[1] as HTMLElement, "2026-11-03{Enter}");
    await waitFor(() =>
      expect(store).toHaveTextContent('"filterBetween": { "started": [ "2026-11-01", "2026-11-03" ] }'),
    );
  },
};

/**
 * A header speaks for the columns it shows. What is filtered by through a
 * column the user HID in the column menu (or by a filter bar's own filter)
 * stays when another header's filter changes.
 */
export const FiltersOfHiddenColumnsStay: Story = {
  render: () => (
    <WidgetStory
      key="hidden-filters"
      definition={antdTable}
      seed={{
        demo: { rows, filterIn: { status: ["Failed"] }, columnState: { order: [], hidden: ["status"] } },
      }}
      viewModel={{
        inputs: { rows: "demo.rows", filterIn: "demo.filterIn", columnState: "demo.columnState" },
        on: { "filter-changed": [{ set: "demo.filterIn", from: "filterIn" }] },
        columns: [
          { title: "Name", property: "name" },
          {
            title: "Team",
            property: "owner.team",
            filter: { kind: "values", options: [{ value: "Core" }, { value: "Web" }] },
          },
          {
            title: "Status",
            property: "status",
            filter: { kind: "values", options: [{ value: "Success" }, { value: "Failed" }] },
          },
        ],
        headerFilters: true,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByRole("columnheader", { name: /Status/ })).toBeNull();
    await userEvent.click(within(canvas.getByRole("columnheader", { name: /Team/ })).getByRole("button"));
    const values = within(await within(document.body).findByRole("group", { name: "Values of Team" }));
    await userEvent.click(values.getByRole("combobox"));
    await userEvent.click(await within(document.body).findByTitle("Core"));
    await waitFor(() =>
      expect(canvas.getByTestId("story-store")).toHaveTextContent(
        '"filterIn": { "status": [ "Failed" ], "owner.team": [ "Core" ] }',
      ),
    );
  },
};

/** Without the setting (the default) the same columns are plain headers: no trigger, no sorting. */
export const HeadersOff: Story = {
  render: () => (
    <WidgetStory
      key="headers-off"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{ inputs: { rows: "demo.rows" }, columns: headerColumns }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(within(canvas.getByRole("columnheader", { name: "Status" })).queryByRole("button")).toBeNull();
    await expect(within(canvas.getByRole("columnheader", { name: "Name" })).queryByRole("img")).toBeNull();
  },
};

/** Columns from the STORE (a table the server describes): the port wins over the setting. */
export const ColumnsFromTheStore: Story = {
  render: () => (
    <WidgetStory
      key="bound-columns"
      definition={antdTable}
      seed={{
        demo: {
          rows,
          columns: [
            { title: "Run", property: "name" },
            { title: "Result", property: "status" },
          ],
        },
      }}
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

const COLUMNS_KEY = "story:table-columns";
const headerTitles = (canvas: { getAllByRole: (role: string) => HTMLElement[] }) =>
  canvas.getAllByRole("columnheader").map((header) => header.textContent);

/**
 * The COLUMN MENU (`columnMenu`): the settings button above the table lists
 * every column with a checkbox; hiding one takes it out of the table and is
 * KEPT — with no `columnState` path bound, in the browser's local storage
 * under the table's key — and Reset brings the columns back as configured
 * and forgets what was kept.
 */
export const ColumnMenu: Story = {
  loaders: [() => globalThis.localStorage.removeItem(COLUMNS_KEY)],
  render: () => (
    <WidgetStory
      key="column-menu"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows" },
        columns: headerColumns,
        columnMenu: true,
        columnStateKey: COLUMNS_KEY,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const body = within(document.body);
    await expect(headerTitles(canvas)).toEqual(["#", "Name", "Team", "Status"]);
    await userEvent.click(canvas.getByRole("button", { name: "Column settings" }));
    const reset = await body.findByRole("button", { name: "Reset" });
    // Nothing is changed yet: there is nothing to reset.
    await expect(reset).toBeDisabled();
    await userEvent.click(body.getByRole("checkbox", { name: "Team" }));
    await waitFor(() => expect(headerTitles(canvas)).toEqual(["#", "Name", "Status"]));
    await expect(JSON.parse(globalThis.localStorage.getItem(COLUMNS_KEY) ?? "{}")).toEqual({
      order: [],
      hidden: ["owner.team"],
    });
    // "Columns" above the list is every column at once.
    await userEvent.click(body.getByRole("checkbox", { name: "Columns" }));
    await waitFor(() => expect(headerTitles(canvas)).toEqual(["#", "Name", "Team", "Status"]));
    await userEvent.click(body.getByRole("checkbox", { name: "Name" }));
    await waitFor(() => expect(headerTitles(canvas)).toEqual(["#", "Team", "Status"]));
    await userEvent.click(reset);
    await waitFor(() => expect(headerTitles(canvas)).toEqual(["#", "Name", "Team", "Status"]));
    await expect(globalThis.localStorage.getItem(COLUMNS_KEY)).toBeNull();
  },
};

/** What local storage holds is how the table OPENS: the order kept and the hidden column, as after a reload. */
export const ColumnStateKept: Story = {
  loaders: [
    () =>
      globalThis.localStorage.setItem(
        COLUMNS_KEY,
        JSON.stringify({ order: ["status", "id", "name", "owner.team"], hidden: ["name"] }),
      ),
  ],
  render: () => (
    <WidgetStory
      key="column-state-kept"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows" },
        columns: headerColumns,
        columnMenu: true,
        columnStateKey: COLUMNS_KEY,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(headerTitles(canvas)).toEqual(["Status", "#", "Team"]);
    await userEvent.click(canvas.getByRole("button", { name: "Column settings" }));
    await userEvent.click(await within(document.body).findByRole("button", { name: "Reset" }));
    await waitFor(() => expect(headerTitles(canvas)).toEqual(["#", "Name", "Team", "Status"]));
    globalThis.localStorage.removeItem(COLUMNS_KEY);
  },
};

/**
 * With the `columnState` port BOUND the state is the store's: the table
 * shows what the path holds, a change is emitted and written back by the
 * default reaction, and local storage is left alone.
 */
export const ColumnStateInTheStore: Story = {
  loaders: [() => globalThis.localStorage.removeItem("wirework:columns:demo.rows")],
  render: () => (
    <WidgetStory
      key="column-state-store"
      definition={antdTable}
      seed={{ demo: { rows, columnState: { order: [], hidden: ["id"] } } }}
      viewModel={{
        inputs: { rows: "demo.rows", columnState: "demo.columnState" },
        columns: headerColumns,
        columnMenu: true,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(headerTitles(canvas)).toEqual(["Name", "Team", "Status"]);
    await userEvent.click(canvas.getByRole("button", { name: "Column settings" }));
    await userEvent.click(await within(document.body).findByRole("checkbox", { name: "Status" }));
    await waitFor(() => expect(headerTitles(canvas)).toEqual(["Name", "Team"]));
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"hidden": [ "id", "status" ]');
    await expect(globalThis.localStorage.getItem("wirework:columns:demo.rows")).toBeNull();
  },
};

/** Eight plain columns: 8 × 110 = 880 px is the least the table needs. */
const wideColumns = ["a", "b", "c", "d", "e", "f", "g", "h"].map((name) => ({
  title: `Column ${name.toUpperCase()}`,
  property: name,
}));
const wideRows = [1, 2, 3].map((id) => ({
  id: String(id),
  ...Object.fromEntries(wideColumns.map((column) => [column.property, `${column.property}${id}`])),
}));

/** The box a table scrolls sideways in, if any: an ancestor of its `table` that shows less than it holds. */
function sidewaysBox(root: HTMLElement): HTMLElement | undefined {
  for (let box = root.querySelector("table")?.parentElement; box && box !== root; box = box.parentElement) {
    const scrolls = ["auto", "scroll"].includes(getComputedStyle(box).overflowX);
    if (scrolls && box.scrollWidth > box.clientWidth + 1) return box;
  }
  return undefined;
}

/**
 * SIDEWAYS SCROLL: the least width a table needs is the sum of its columns'
 * widths — 110 px each unless the column says its own, an id column 88. In
 * a box narrower than that the table keeps its width and scrolls sideways.
 */
export const SidewaysScroll: Story = {
  render: () => (
    <div style={{ width: 600 }}>
      <WidgetStory
        key="sideways"
        definition={antdTable}
        seed={{ demo: { rows: wideRows } }}
        viewModel={{ inputs: { rows: "demo.rows" }, columns: wideColumns }}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const widget = canvas.getByTestId("antd-table");
    await expect(widget).toHaveAttribute("data-min-width", "880");
    await waitFor(() => expect(sidewaysBox(widget)).toBeDefined());
    await expect(canvas.getByRole("table").getBoundingClientRect().width).toBeGreaterThanOrEqual(880);
  },
};

/** In a box wider than the columns need, the table stretches to fill it — nothing scrolls. */
export const FillsAWiderBox: Story = {
  render: () => (
    <div style={{ width: 1000 }}>
      <WidgetStory
        key="fills"
        definition={antdTable}
        seed={{ demo: { rows: wideRows } }}
        viewModel={{ inputs: { rows: "demo.rows" }, columns: wideColumns }}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const widget = canvas.getByTestId("antd-table");
    await expect(sidewaysBox(widget)).toBeUndefined();
    await expect(canvas.getByRole("table").getBoundingClientRect().width).toBeGreaterThan(900);
  },
};

/** The widths the sum is made of: an id column 88, a column's own `width`, 110 for the rest. */
export const ColumnWidths: Story = {
  render: () => (
    <WidgetStory
      key="widths"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows" },
        columns: [
          { title: "#", property: "id" },
          { title: "Name", property: "name", width: 300 },
          { title: "Status", property: "status" },
        ],
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("antd-table")).toHaveAttribute("data-min-width", "498");
  },
};

/** What the toolbar stories share: a filtered table whose reactions store the choice and note a refresh. */
const toolbarViewModel = {
  inputs: { rows: "demo.rows", filterIn: "demo.filterIn", filterLike: "demo.filterLike" },
  on: {
    "filter-changed": [
      { set: "demo.filterIn", from: "filterIn" },
      { set: "demo.filterLike", from: "filterLike" },
    ],
    refresh: [{ set: "demo.asked", value: "again" }],
  },
  columns: headerColumns,
  headerFilters: true,
};
const toolbarSeed = { demo: { rows, filterIn: { status: ["Failed"] }, filterLike: { name: "smoke" } } };

/**
 * The TOOLBAR: the tools the page lists, beside the column menu's button.
 * "Reset filters" filters by nothing — and has nothing to do once nothing is
 * filtered by —, "Reload" emits `refresh` for a reaction to ask for the rows.
 */
export const Toolbar: Story = {
  render: () => (
    <WidgetStory
      key="toolbar"
      definition={antdTable}
      seed={toolbarSeed}
      viewModel={{ ...toolbarViewModel, toolbar: [{ name: "reset-filters" }, { name: "refresh" }] }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const tools = within(canvas.getByRole("toolbar", { name: "Table tools" }));
    const store = canvas.getByTestId("story-store");
    const reset = tools.getByRole("button", { name: "Reset filters" });
    await expect(reset).toBeEnabled();
    await userEvent.click(reset);
    await expect(store).toHaveTextContent('"filterIn": {}');
    await expect(store).toHaveTextContent('"filterLike": {}');
    await waitFor(() => expect(reset).toBeDisabled());
    await userEvent.click(tools.getByRole("button", { name: "Reload" }));
    await expect(store).toHaveTextContent('"asked": "again"');
    // The column menu's button stands in the same row, last.
    await expect(tools.getByRole("button", { name: "Column settings" })).toBeVisible();
  },
};

/** No toolbar listed and the column menu off: nothing above the table. */
export const NoToolbar: Story = {
  render: () => (
    <WidgetStory
      key="no-toolbar"
      definition={antdTable}
      seed={toolbarSeed}
      viewModel={{ ...toolbarViewModel, columnMenu: false }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("toolbar")).toBeNull();
  },
};

/** A refresher of the HOST's own: it shows what it likes and asks through what it is handed. */
function HostRefresher({ params, loading, refresh }: TableToolbarItemProps) {
  return (
    <Button size="small" loading={loading} onClick={refresh}>
      {typeof params["label"] === "string" ? params["label"] : "Refresh"}
    </Button>
  );
}

/** A tool no standard item is: it reads the table's state. */
function FilteredNote({ filtered }: TableToolbarItemProps) {
  return <Tag>{filtered ? "filtered" : "everything"}</Tag>;
}

/**
 * The host's own items, registered by name as its cells are: one under the
 * standard name `refresh` REPLACES the standard refresher, a new name adds a
 * tool. A name nothing is registered under is left out.
 */
export const CustomToolbarItems: Story = {
  render: () => (
    <WidgetStory
      key="custom-toolbar"
      definition={createAntdTable({ toolbar: { refresh: HostRefresher, "filtered-note": FilteredNote } })}
      seed={toolbarSeed}
      viewModel={{
        ...toolbarViewModel,
        toolbar: [
          { name: "filtered-note" },
          { name: "reset-filters" },
          { name: "refresh", params: { label: "Fetch again" } },
          { name: "no-such-item" },
        ],
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const tools = within(canvas.getByRole("toolbar", { name: "Table tools" }));
    await expect(tools.getAllByTestId("table-toolbar-item").map((item) => item.dataset["name"])).toEqual([
      "filtered-note",
      "reset-filters",
      "refresh",
    ]);
    await expect(tools.queryByRole("button", { name: "Reload" })).toBeNull();
    await userEvent.click(tools.getByRole("button", { name: "Fetch again" }));
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"asked": "again"');
    await expect(tools.getByText("filtered")).toBeVisible();
    await userEvent.click(tools.getByRole("button", { name: "Reset filters" }));
    await expect(await tools.findByText("everything")).toBeVisible();
  },
};

/** The body cell of a row, by the row's key and the column's property. */
const bodyCell = (root: HTMLElement, key: string, property: string): HTMLElement => {
  const cell = root.querySelector<HTMLElement>(`tr[data-row-key="${key}"] td[data-property="${property}"]`);
  if (cell === null) throw new Error(`no cell ${property} in row ${key}`);
  return cell;
};

/**
 * CELLS ARE SELECTED like a spreadsheet's: a click selects one — outlined,
 * with the small square at its corner —, Shift+click a rectangle from it.
 * A right click opens the menu; Copy with headers puts the rectangle on the
 * clipboard — a tag as its text, a link as the address it leads to — and
 * emits `cells-copied`, which this story's reaction stores. Ctrl+C copies
 * too; Escape lets the selection go. (A drag is a real pointer's work: the
 * e2e suite's `table-copy.feature`.)
 */
export const CellSelection: Story = {
  render: () => (
    <WidgetStory
      key="cell-selection"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{
        inputs: { rows: "demo.rows" },
        on: {
          "cells-copied": [
            { set: "demo.copied", from: "text" },
            { set: "demo.copiedRows", from: "rows" },
          ],
        },
        columns: cellColumns,
      }}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const table = canvas.getByTestId("antd-table");
    const store = canvas.getByTestId("story-store");
    await expect(table).not.toHaveAttribute("data-selected");
    await userEvent.click(bodyCell(canvasElement, "1", "owner.team"));
    await expect(table).toHaveAttribute("data-selected", "1-3/1-3");
    await expect(bodyCell(canvasElement, "1", "owner.team")).toHaveAttribute("data-handle", "true");
    await expect(bodyCell(canvasElement, "1", "owner.team")).toHaveAttribute("data-edge", "top right bottom left");
    // Shift+click: from the cell it started at to this one — the corner's square moves to the rectangle's last cell.
    await userEvent.keyboard("{Shift>}");
    await userEvent.click(bodyCell(canvasElement, "2", "status"));
    await userEvent.keyboard("{/Shift}");
    await expect(table).toHaveAttribute("data-selected", "1-3/2-4");
    await expect(bodyCell(canvasElement, "1", "owner.team")).toHaveAttribute("data-anchor", "true");
    await expect(bodyCell(canvasElement, "2", "status")).toHaveAttribute("data-handle", "true");
    await expect(bodyCell(canvasElement, "1", "status")).toHaveAttribute("data-edge", "top right");
    // Ctrl+C: the rectangle, a line per row, tabs between (the store's readout shows them escaped).
    await userEvent.keyboard("{Control>}c{/Control}");
    await expect(store).toHaveTextContent('"copied": "Core\\tSuccess\\nWeb\\tFailed"');
    await expect(store).toHaveTextContent('"copiedRows": 2');
    // A right click outside the selection selects that cell; the menu copies it with its title — a link as its address.
    await fireEvent.contextMenu(bodyCell(canvasElement, "3", "name"));
    await expect(table).toHaveAttribute("data-selected", "3-2/3-2");
    const menu = within(document.body);
    await expect((await menu.findAllByRole("menuitem")).map((item) => item.textContent)).toEqual([
      "Copy",
      "Copy with headers",
      "Export as CSV",
    ]);
    await userEvent.click(menu.getByRole("menuitem", { name: "Copy with headers" }));
    await expect(store).toHaveTextContent(`"copied": "Name\\n${window.location.origin}/demo/runs/3"`);
    // Escape lets the selection go (the keys arrive from the row the click focused).
    await userEvent.click(bodyCell(canvasElement, "1", "owner.team"));
    await userEvent.keyboard("{Escape}");
    await expect(table).not.toHaveAttribute("data-selected");
  },
};

/** With `cellSelection` off the cells are plain: nothing is selected, and a right click is the browser's. */
export const CellSelectionOff: Story = {
  render: () => (
    <WidgetStory
      key="cell-selection-off"
      definition={antdTable}
      seed={{ demo: { rows } }}
      viewModel={{ inputs: { rows: "demo.rows" }, columns: cellColumns, cellSelection: false }}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const table = canvas.getByTestId("antd-table");
    await userEvent.click(bodyCell(canvasElement, "1", "owner.team"));
    await expect(table).not.toHaveAttribute("data-selected");
    await expect(bodyCell(canvasElement, "1", "owner.team")).not.toHaveAttribute("data-at-row");
    await fireEvent.contextMenu(bodyCell(canvasElement, "1", "owner.team"));
    await expect(within(document.body).queryByRole("menuitem")).toBeNull();
  },
};
