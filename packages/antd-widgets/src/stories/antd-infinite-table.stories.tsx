import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { antdInfiniteTable } from "../widgets/antd-infinite-table";
import { tableConformance } from "./conformance";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

/** A dropdown opens in a portal outside the story's canvas. */
const page = () => within(document.body);

const rows = [
  { id: "1", name: "Nightly", owner: { team: "Core" }, status: "Success" },
  { id: "2", name: "Smoke", owner: { team: "Web" }, status: "Failed" },
  { id: "3", name: "Regression", owner: { team: "Core" }, status: "Success" },
];

/** Columns as a loader derives them: what each header filters by, and which the server sorts by. */
const headerColumns = [
  { title: "#", property: "id", sortable: true },
  { title: "Name", property: "name", filter: { kind: "text" }, sortable: true },
  { title: "Team", property: "owner.team" },
  {
    title: "Status",
    property: "status",
    cell: { kind: "tag", tones: { Success: "success", Failed: "danger" } },
    filter: { kind: "values", options: [{ value: "Success" }, { value: "Failed" }] },
  },
];

/** The wiring a page gives the list: what the headers choose goes to the store, and the end asks for more. */
const reactions = {
  "row-selected": [{ set: "demo.selected", from: "key" }],
  "filter-changed": [
    { set: "demo.filterIn", from: "filterIn" },
    { set: "demo.filterLike", from: "filterLike" },
  ],
  "sort-changed": [{ set: "demo.orderBy", from: "orderBy" }],
  more: [{ set: "demo.asked", from: "offset" }],
};

const meta = {
  title: "Widgets/antd-infinite-table",
  render: () => (
    <WidgetStory
      key="headers"
      definition={antdInfiniteTable}
      seed={{ demo: { rows, total: 3 } }}
      viewModel={{
        inputs: {
          rows: "demo.rows",
          total: "demo.total",
          filterIn: "demo.filterIn",
          filterLike: "demo.filterLike",
          orderBy: "demo.orderBy",
        },
        on: reactions,
        columns: headerColumns,
        height: 240,
      }}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Rows, total, columns and what the headers chose are DATA: edit them as a
 * loader would. Lower `total` to the rows held and the list asks for nothing;
 * raise it and `more` goes out at once — the end is in view.
 */
export const Playground: Story = playground(antdInfiniteTable, {
  seed: { demo: { rows, total: 3, filterIn: {}, filterLike: {}, orderBy: {} } },
  viewModel: {
    inputs: {
      rows: "demo.rows",
      total: "demo.total",
      filterIn: "demo.filterIn",
      filterLike: "demo.filterLike",
      orderBy: "demo.orderBy",
    },
    on: reactions,
    columns: headerColumns,
  },
});

// Everything the `table` contract promises holds for the infinite table too.
const conformance = tableConformance(antdInfiniteTable);
export const Rows: Story = conformance.Rows;
export const RowSelected: Story = conformance.RowSelected;
export const LoadsOnAppearance: Story = conformance.LoadsOnAppearance;
export const BoundToEmptyPath: Story = conformance.BoundToEmptyPath;

/** A values filter lives in its column header: tick a value, OK — the whole choice reaches the store under the request's own name. */
export const HeaderFilter: Story = {
  play: async ({ canvas, userEvent }) => {
    const header = canvas.getByRole("columnheader", { name: /Status/ });
    await expect(within(header).getByRole("img", { name: "filter" })).toBeVisible();
    await userEvent.click(within(header).getByRole("button"));
    await userEvent.click(await page().findByRole("menuitem", { name: "Failed" }));
    await userEvent.click(page().getByRole("button", { name: "OK" }));
    const store = canvas.getByTestId("story-store");
    await expect(store).toHaveTextContent('"filterIn": { "status": [ "Failed" ] }');
    await expect(store).toHaveTextContent('"filterLike": {}');
  },
};

/** A text filter is a SEARCH icon in its column header: type, Enter — the text reaches the store as `filterLike`; Reset clears it. */
export const HeaderSearch: Story = {
  play: async ({ canvas, userEvent }) => {
    const header = canvas.getByRole("columnheader", { name: /Name/ });
    await expect(within(header).getByRole("img", { name: "search" })).toBeVisible();
    // A column without a filter has no trigger at all.
    await expect(within(canvas.getByRole("columnheader", { name: /Team/ })).queryByRole("button")).toBeNull();
    await userEvent.click(within(header).getByRole("button"));
    const box = await page().findByRole("textbox", { name: "Search Name" });
    await userEvent.type(box, "smo{Enter}");
    const store = canvas.getByTestId("story-store");
    await expect(store).toHaveTextContent('"filterLike": { "name": "smo" }');
    await expect(store).toHaveTextContent('"filterIn": {}');
    await userEvent.click(within(header).getByRole("button"));
    await userEvent.click(await page().findByRole("button", { name: "Reset" }));
    await expect(store).toHaveTextContent('"filterLike": {}');
  },
};

/** A sortable header sorts on click — ascending, descending, then not at all — and the order reaches the store as `orderBy`. */
export const HeaderSort: Story = {
  play: async ({ canvas, userEvent }) => {
    const header = canvas.getByRole("columnheader", { name: /Name/ });
    const store = canvas.getByTestId("story-store");
    await userEvent.click(within(header).getByText("Name"));
    await expect(store).toHaveTextContent('"orderBy": { "name": "ASC" }');
    await userEvent.click(within(header).getByText("Name"));
    await expect(store).toHaveTextContent('"orderBy": { "name": "DESC" }');
    await userEvent.click(within(header).getByText("Name"));
    await expect(store).toHaveTextContent('"orderBy": {}');
    // A column the server does not sort by is not clickable into an order.
    await userEvent.click(within(canvas.getByRole("columnheader", { name: /Team/ })).getByText("Team"));
    await expect(store).toHaveTextContent('"orderBy": {}');
  },
};

/**
 * The FILTER ROW: each column's filter under its title, always in view — a
 * search field for text (Enter applies it), a list of values otherwise —
 * writing the same choice the header dropdowns write, and never sorting the
 * column it sits in.
 */
export const FilterRow: Story = {
  render: () => (
    <WidgetStory
      key="filter-row"
      definition={antdInfiniteTable}
      seed={{ demo: { rows, total: 3 } }}
      viewModel={{
        inputs: {
          rows: "demo.rows",
          total: "demo.total",
          filterIn: "demo.filterIn",
          filterLike: "demo.filterLike",
          orderBy: "demo.orderBy",
        },
        on: reactions,
        columns: headerColumns,
        height: 240,
        filterRow: true,
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const store = canvas.getByTestId("story-store");
    const search = canvas.getByRole("searchbox", { name: "Filter Name" });
    // One control per column that has a filter; a column without one has none.
    await expect(canvas.getAllByRole("searchbox")).toHaveLength(1);
    await expect(canvas.getAllByRole("combobox")).toHaveLength(1);
    // regression: a click and Enter inside the control are its own — the sortable column is not sorted.
    await userEvent.click(search);
    await userEvent.type(search, "smo{Enter}");
    await expect(store).toHaveTextContent('"filterLike": { "name": "smo" }');
    await expect(store).not.toHaveTextContent("orderBy");
    await userEvent.click(canvas.getByRole("combobox", { name: "Filter Status" }));
    await userEvent.click(await page().findByTitle("Failed"));
    await expect(store).toHaveTextContent('"filterIn": { "status": [ "Failed" ] }');
    // The text stays: every change carries the whole choice.
    await expect(store).toHaveTextContent('"filterLike": { "name": "smo" }');
    await expect(store).not.toHaveTextContent("orderBy");
    // Emptied and left: the text filter is gone, the values stay.
    await userEvent.clear(search);
    await userEvent.tab();
    await expect(store).toHaveTextContent('"filterLike": {}');
    await expect(store).toHaveTextContent('"filterIn": { "status": [ "Failed" ] }');
  },
};

/**
 * MORE: the server has 10 rows, 3 are held, and the end of the list is in
 * view from the start — so `more` is emitted at once with the offset of the
 * next row, and only once for these rows.
 */
export const AsksForMore: Story = {
  render: () => (
    <WidgetStory
      key="more"
      definition={antdInfiniteTable}
      seed={{ demo: { rows, total: 10 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total" },
        on: { more: [{ set: "demo.asked", from: "offset" }] },
        columns: headerColumns,
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"asked": 3');
    await expect(canvas.getByTestId("infinite-table-status")).toHaveTextContent("3 of 10");
  },
};

/** Two hundred rows a loader might have appended by now. */
const manyRows = Array.from({ length: 200 }, (_, index) => ({
  id: String(index + 1),
  name: `Run ${index + 1}`,
  owner: { team: index % 2 === 0 ? "Core" : "Web" },
  status: index % 3 === 0 ? "Failed" : "Success",
}));

/**
 * The WINDOW: of two hundred rows held, only those around the visible part
 * of the box render — twice the box's height — and the window follows the
 * scroll: at the end the last row is on screen and the first is not; back
 * at the top it is the other way round. The status line counts what is
 * held, not what is rendered.
 */
export const Window: Story = {
  render: () => (
    <WidgetStory
      key="window"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows, total: 200 } }}
      viewModel={{ inputs: { rows: "demo.rows", total: "demo.total" }, columns: headerColumns, height: 240 }}
      showStore={false}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    const rendered = () => canvas.getAllByTestId("table-row").length;
    await expect(canvas.getByTestId("infinite-table-status")).toHaveTextContent("200 of 200");
    await expect(canvas.getByText("Run 1")).toBeVisible();
    expect(rendered()).toBeLessThan(60);
    expect(canvas.queryByText("Run 200")).toBeNull();
    box.scrollTop = box.scrollHeight;
    await expect(canvas.findByText("Run 200")).resolves.toBeVisible();
    expect(canvas.queryByText("Run 1")).toBeNull();
    expect(rendered()).toBeLessThan(60);
    box.scrollTop = 0;
    await expect(canvas.findByText("Run 1")).resolves.toBeVisible();
    expect(canvas.queryByText("Run 200")).toBeNull();
    // The box is what HOLDS the keyboard focus (a row would leave the DOM with the window), a region named by the
    // status line. The keys themselves (End, Home) scroll only under a real keyboard: infinite-table.feature.
    box.focus();
    await expect(canvas.getByRole("region", { name: "200 of 200" })).toHaveFocus();
  },
};

/**
 * WINDOWED: two thousand rows on the server, the hundred from row 500 held.
 * The scrollbar spans the whole list; scrolled to where the slice is, its
 * rows render; scrolled out of it, `window` asks for the slice around the
 * rows in view — and `more` never goes out. With the position port bound
 * the list says where it stands, and goes where it is told.
 */
export const Windowed: Story = {
  render: () => (
    <WidgetStory
      key="windowed"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows.slice(0, 100), total: 2000, offset: 500, position: 520 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total", offset: "demo.offset", position: "demo.position" },
        on: {
          window: [{ set: "demo.wanted", from: "offset" }],
          more: [{ set: "demo.asked", from: "offset" }],
          "position-changed": [
            { set: "demo.position", from: "position" },
            { set: "demo.visible", from: "visible" },
          ],
        },
        columns: headerColumns,
        height: 240,
        windowed: true,
      }}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    const store = canvas.getByTestId("story-store");
    await expect(canvas.getByTestId("infinite-table-status")).toHaveTextContent("2000 rows");
    // Told to stand at row 520 of the list: the 21st of the slice, "Run 21", is the first in view.
    await expect(canvas.findByText("Run 21")).resolves.toBeVisible();
    expect(canvas.getAllByTestId("table-row").length).toBeLessThan(60);
    await expect(store).not.toHaveTextContent("wanted");
    // Scrolled to the top of the list: nothing of the slice is there — the slice around the first rows is asked for.
    box.scrollTop = 0;
    await waitFor(() => expect(store).toHaveTextContent('"wanted": 0'));
    await waitFor(() => expect(store).toHaveTextContent('"position": 0'));
    await expect(store).not.toHaveTextContent("asked");
  },
};

/** Nothing more to ask for: as many rows held as the server has — `more` never goes out. */
export const Complete: Story = {
  render: () => (
    <WidgetStory
      key="complete"
      definition={antdInfiniteTable}
      seed={{ demo: { rows, total: 3 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total" },
        on: { more: [{ set: "demo.asked", from: "offset" }] },
        columns: headerColumns,
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("infinite-table-status")).toHaveTextContent("3 of 3");
    await expect(canvas.getByTestId("story-store")).not.toHaveTextContent("asked");
  },
};
