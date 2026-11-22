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

/** A values filter lives in its column header: pick a value — at once the whole choice reaches the store under the request's own name. */
export const HeaderFilter: Story = {
  play: async ({ canvas, userEvent }) => {
    const header = canvas.getByRole("columnheader", { name: /Status/ });
    await expect(within(header).getByRole("img", { name: "filter" })).toBeVisible();
    await userEvent.click(within(header).getByRole("button"));
    const values = within(await page().findByRole("group", { name: "Values of Status" }));
    await userEvent.click(values.getByRole("combobox"));
    await userEvent.click(await page().findByTitle("Failed"));
    const store = canvas.getByTestId("story-store");
    await waitFor(() => expect(store).toHaveTextContent('"filterIn": { "status": [ "Failed" ] }'));
    await expect(store).toHaveTextContent('"filterLike": {}');
  },
};

/**
 * A text filter is a SEARCH icon in its column header: the text reaches the
 * store as `filterLike` AS IT IS TYPED, once typing pauses — no Search
 * button; Reset clears it, Done only closes the box.
 */
export const HeaderSearch: Story = {
  play: async ({ canvas, userEvent }) => {
    const header = canvas.getByRole("columnheader", { name: /Name/ });
    await expect(within(header).getByRole("img", { name: "search" })).toBeVisible();
    // A column without a filter has no trigger at all.
    await expect(within(canvas.getByRole("columnheader", { name: /Team/ })).queryByRole("button")).toBeNull();
    await userEvent.click(within(header).getByRole("button"));
    const box = await page().findByRole("textbox", { name: "Search Name" });
    const store = canvas.getByTestId("story-store");
    await userEvent.type(box, "smo");
    // Nothing is pressed: the pause searches, and the box stays open.
    await waitFor(() => expect(store).toHaveTextContent('"filterLike": { "name": "smo" }'));
    await expect(store).toHaveTextContent('"filterIn": {}');
    await expect(box).toBeVisible();
    await expect(page().queryByRole("button", { name: /Search/ })).toBeNull();
    // Enter searches at once.
    await userEvent.type(box, "k{Enter}");
    await expect(store).toHaveTextContent('"filterLike": { "name": "smok" }');
    await userEvent.click(page().getByRole("button", { name: "Reset" }));
    await expect(store).toHaveTextContent('"filterLike": {}');
    await expect(box).toBeVisible();
    await userEvent.click(page().getByRole("button", { name: "Done" }));
    await waitFor(() => expect(box).not.toBeVisible());
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
 * `toolbarAlign: "left"`: the filters and the tools stand straight after the
 * title instead of at the bar's right edge (the default — the other stories).
 */
export const ToolbarAtTheLeft: Story = {
  render: () => (
    <WidgetStory
      key="toolbar-left"
      definition={antdInfiniteTable}
      seed={{ demo: { rows, total: 3 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total", filterLike: "demo.filterLike" },
        on: reactions,
        columns: headerColumns,
        height: 240,
        title: "Runs",
        filters: [{ id: "branch", label: "Branch", kind: "text" }],
        toolbar: [{ name: "reset-filters" }],
        toolbarAlign: "left",
      }}
    />
  ),
  play: async ({ canvas }) => {
    const bar = canvas.getByTestId("table-bar");
    await expect(bar).toHaveAttribute("data-align", "left");
    const edges = (element: HTMLElement) => element.getBoundingClientRect();
    const title = edges(canvas.getByTestId("table-title"));
    const filters = edges(canvas.getByTestId("table-filters"));
    const tools = edges(canvas.getByTestId("table-toolbar"));
    // The title, the filters and the tools follow one another by the bar's gap; the room is left at the right.
    await expect(title.left).toBeCloseTo(edges(bar).left, 0);
    await expect(filters.left - title.right).toBeCloseTo(16, 0);
    await expect(tools.left - filters.right).toBeCloseTo(16, 0);
    await expect(edges(bar).right - tools.right).toBeGreaterThan(100);
  },
};

/**
 * The BAR above the table: a TITLE at its left, and the table's own FILTERS
 * before the tools — always in view, by a property that need not be a
 * column's filter (Team) or a column at all (Branch). They are one choice
 * with the headers: the same ports, the same `filter-changed`.
 */
export const TitleAndFilters: Story = {
  render: () => (
    <WidgetStory
      key="title-and-filters"
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
        title: "Runs",
        filters: [
          { id: "owner.team", label: "Team", options: [{ value: "Core" }, { value: "Web" }] },
          { id: "branch", label: "Branch", kind: "text" },
          // A period needs the filterBetween port, which this table does not bind: it is not offered.
          { id: "started", label: "Started", kind: "dates" },
        ],
        toolbar: [{ name: "reset-filters" }],
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const store = canvas.getByTestId("story-store");
    await expect(canvas.getByRole("heading", { name: "Runs" })).toBeVisible();
    const filters = within(canvas.getByRole("group", { name: "Table filters" }));
    await expect(canvas.getAllByTestId("table-bar-filter")).toHaveLength(2);
    await userEvent.click(filters.getByRole("combobox", { name: "Filter Team" }));
    await userEvent.click(await page().findByTitle("Core"));
    await expect(store).toHaveTextContent('"filterIn": { "owner.team": [ "Core" ] }');
    const branch = filters.getByRole("searchbox", { name: "Filter Branch" });
    await userEvent.type(branch, "main{Enter}");
    await expect(store).toHaveTextContent('"filterLike": { "branch": "main" }');
    // The values stay: every change carries the whole choice.
    await expect(store).toHaveTextContent('"filterIn": { "owner.team": [ "Core" ] }');
    // The toolbar's reset is theirs too.
    await userEvent.click(canvas.getByRole("button", { name: "Reset Filters" }));
    await expect(store).toHaveTextContent('"filterIn": {}');
    await expect(store).toHaveTextContent('"filterLike": {}');
    await waitFor(() => expect(branch).toHaveValue(""));
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

/**
 * HEIGHT (`heightMode`, doc/ADR/0021-table-height.md) — `fixed`: the box is
 * exactly `height`, whatever it holds; three rows leave it blank under them.
 * (By default — `max` — it would be as tall as the three rows.)
 */
export const FixedHeight: Story = {
  render: () => (
    <WidgetStory
      key="fixed-height"
      definition={antdInfiniteTable}
      seed={{ demo: { rows, total: 3 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total" },
        columns: headerColumns,
        height: 300,
        heightMode: "fixed",
      }}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    await expect(canvas.getByTestId("antd-infinite-table")).toHaveAttribute("data-height-mode", "fixed");
    await waitFor(() => expect(box.offsetHeight).toBe(300));
    await expect(canvas.getAllByTestId("table-row")).toHaveLength(3);
  },
};

/**
 * HEIGHT — `fill`: the box takes the room from where it starts down to the
 * bottom of the window, less `bottomGap`; never less than `height`. Two
 * hundred rows are held: the taller the window, the more of them render.
 */
export const FillsTheWindow: Story = {
  render: () => (
    <WidgetStory
      key="fills-the-window"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows, total: 200 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total" },
        columns: headerColumns,
        height: 100,
        heightMode: "fill",
        bottomGap: 40,
      }}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    // Where the window ends, less the gap — or the least height where the window is too short for that.
    const expected = () => Math.max(100, Math.floor(window.innerHeight - box.getBoundingClientRect().top - 40));
    await waitFor(() => expect(box.offsetHeight).toBe(expected()));
    await waitFor(() => expect(box.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight));
    await expect(canvas.getAllByTestId("table-row").length).toBeLessThan(200);
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
 * The line that COUNTS the rows stays at the bottom of the box, whatever is
 * scrolled: how many rows there are is in view at the top of a long list,
 * in its middle and at its end — and the list still asks for more only when
 * its END comes into view, not because the line is.
 */
export const StatusStaysInView: Story = {
  render: () => (
    <WidgetStory
      key="status-in-view"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows, total: 2000 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total" },
        on: { more: [{ set: "demo.asked", from: "offset" }] },
        columns: headerColumns,
        // A column pinned at the rows' start: the line lies over it too.
        rowActions: [{ name: "favorite" }],
        height: 240,
        heightMode: "fixed",
      }}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    const status = canvas.getByTestId("infinite-table-status");
    const store = canvas.getByTestId("story-store");
    const inView = () => {
      const around = box.getBoundingClientRect();
      const line = status.getBoundingClientRect();
      // In the box, and on top along its whole width — the pinned column at its left edge included.
      const onTop = [line.left + 4, line.left + line.width / 2, line.right - 4].every((x) =>
        status.contains(document.elementFromPoint(x, line.top + line.height / 2)),
      );
      return line.top >= around.top && line.bottom <= around.bottom + 1 && line.height > 0 && onTop;
    };
    await expect(canvas.findByText("Run 1")).resolves.toBeVisible();
    await expect(status).toHaveTextContent("200 of 2000");
    await waitFor(() => expect(inView()).toBe(true));
    // At the top the end is far below: nothing was asked for.
    await expect(store).not.toHaveTextContent("asked");
    box.scrollTop = box.scrollHeight / 2;
    await waitFor(() => expect(inView()).toBe(true));
    await expect(store).not.toHaveTextContent("asked");
    box.scrollTop = box.scrollHeight;
    await waitFor(() => expect(store).toHaveTextContent('"asked": 200'));
    await expect(inView()).toBe(true);
  },
};

/**
 * WINDOWED: two thousand rows on the server, the hundred from row 500 held.
 * The scrollbar spans the whole list; scrolled to where the slice is, its
 * rows render; scrolled past three quarters of it, `window` asks for the
 * batch after it ahead of time; scrolled out of it, for the slice around the
 * rows in view — and `more` never goes out. With the position port bound
 * the list says where it stands, and goes where it is told.
 */
export const Windowed: Story = {
  render: () => (
    <WidgetStory
      key="windowed"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows.slice(0, 100), total: 2000, offset: 500, position: 540 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total", offset: "demo.offset", position: "demo.position" },
        on: {
          window: [{ set: "demo.wanted" }],
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
    // Told to stand at row 540 of the list: the 41st of the slice, "Run 41", is the first in view.
    await expect(canvas.findByText("Run 41")).resolves.toBeVisible();
    expect(canvas.getAllByTestId("table-row").length).toBeLessThan(60);
    // In the middle of the rows held: nothing is asked for — not even for the rows the list passed on its way here.
    await expect(store).not.toHaveTextContent("wanted");
    // Scrolled on to row 580, past three quarters of the slice: the batch AFTER it is asked for ahead of time —
    // the rows in view are still the ones held.
    const rowHeight = (canvas.getAllByTestId("table-row")[0] as HTMLElement).offsetHeight;
    box.scrollTop = 580 * rowHeight;
    await waitFor(() => expect(store).toHaveTextContent('"wanted": { "offset": 600, "edge": "after" }'));
    await expect(canvas.findByText("Run 81")).resolves.toBeVisible();
    // Scrolled to the top of the list: nothing of the slice is there — the slice around the first rows is asked for.
    box.scrollTop = 0;
    await waitFor(() => expect(store).toHaveTextContent('"wanted": { "offset": 0, "edge": "around" }'));
    await waitFor(() => expect(store).toHaveTextContent('"position": 0'));
    await expect(store).not.toHaveTextContent("asked");
  },
};

/**
 * THE END NOT KNOWN (`hasMore`): two hundred rows are known and held, and
 * the list goes on past them. The line says so instead of a count; scrolled
 * to the end of the rows known, the windowed list asks for the batch after
 * them — where a counted list of two hundred would ask for nothing —, and
 * once the end is found it is the list it always was.
 */
export const EndUnknown: Story = {
  render: () => (
    <WidgetStory
      key="end-unknown"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows.slice(0, 200), total: 200, offset: 0, hasMore: true } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total", offset: "demo.offset", hasMore: "demo.hasMore" },
        on: { window: [{ set: "demo.wanted" }] },
        columns: headerColumns,
        height: 240,
        windowed: true,
      }}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    const store = canvas.getByTestId("story-store");
    await expect(canvas.getByTestId("infinite-table-status")).toHaveTextContent("200+ rows");
    await expect(canvas.getByTestId("antd-infinite-table")).toHaveAttribute("data-open", "true");
    await expect(canvas.findByText("Run 1")).resolves.toBeVisible();
    await expect(store).not.toHaveTextContent("wanted");
    box.scrollTop = box.scrollHeight;
    await waitFor(() => expect(store).toHaveTextContent('"wanted": { "offset": 200, "edge": "after" }'));
  },
};

/**
 * FETCH AHEAD (`fetchAhead`, in rows): the page says when the next rows are
 * asked for. Two hundred of four hundred rows are held and the mark is
 * fifty: at row 100 nothing is asked — the end is a hundred rows away —, at
 * row 150 `more` goes out, long before the end of the list is in view.
 */
export const FetchAhead: Story = {
  render: () => (
    <WidgetStory
      key="fetch-ahead"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows, total: 400 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total" },
        on: { more: [{ set: "demo.asked", from: "offset" }] },
        columns: headerColumns,
        height: 240,
        fetchAhead: 50,
      }}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    const store = canvas.getByTestId("story-store");
    await expect(canvas.findByText("Run 1")).resolves.toBeVisible();
    const rowHeight = (canvas.getAllByTestId("table-row")[0] as HTMLElement).offsetHeight;
    box.scrollTop = 100 * rowHeight;
    await expect(canvas.findByText("Run 101")).resolves.toBeVisible();
    // The observer speaks a frame after the scroll and the hook asks in the render after that: two frames on, a
    // list that asked too early would have said so.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await expect(store).not.toHaveTextContent("asked");
    box.scrollTop = 150 * rowHeight;
    await waitFor(() => expect(store).toHaveTextContent('"asked": 200'));
    // The end of the list itself is still far under the box.
    expect(canvas.queryByText("Run 200")).toBeNull();
  },
};

/**
 * FETCH AHEAD, WINDOWED: batches of two hundred and the mark at a hundred —
 * "fetch 200 and start fetching when you scroll to 100". At row 60 nothing
 * is asked; at row 95 the rows rendered reach past row 100 and `window`
 * asks for the batch after, where three quarters would wait for row 150.
 */
export const FetchAheadWindowed: Story = {
  render: () => (
    <WidgetStory
      key="fetch-ahead-windowed"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows, total: 2000, offset: 0 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total", offset: "demo.offset" },
        on: { window: [{ set: "demo.wanted" }] },
        columns: headerColumns,
        height: 240,
        windowed: true,
        fetchAhead: 100,
      }}
    />
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByTestId("infinite-table-scroll");
    const store = canvas.getByTestId("story-store");
    await expect(canvas.findByText("Run 1")).resolves.toBeVisible();
    const rowHeight = (canvas.getAllByTestId("table-row")[0] as HTMLElement).offsetHeight;
    box.scrollTop = 60 * rowHeight;
    await expect(canvas.findByText("Run 61")).resolves.toBeVisible();
    await expect(store).not.toHaveTextContent("wanted");
    box.scrollTop = 95 * rowHeight;
    await waitFor(() => expect(store).toHaveTextContent('"wanted": { "offset": 200, "edge": "after" }'));
  },
};

/**
 * ROW ACTIONS, as the table has them (doc/ADR/0020-row-actions.md): the
 * star stands before the first column of every rendered row of the virtual
 * list — the blank rows around the window span it too — and pressing it
 * emits `row-action`.
 */
export const RowActions: Story = {
  render: () => (
    <WidgetStory
      key="row-actions"
      definition={antdInfiniteTable}
      seed={{ demo: { rows: manyRows, total: 200 } }}
      viewModel={{
        inputs: { rows: "demo.rows", total: "demo.total" },
        on: { "row-action": [{ set: "demo.acted" }] },
        columns: headerColumns,
        height: 240,
        rowActions: [{ name: "favorite" }],
      }}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvas.findByText("Run 1")).resolves.toBeVisible();
    const rendered = canvas.getAllByTestId("table-row");
    await expect(rendered.length).toBeLessThan(60);
    // Every rendered row has its star, in its first cell.
    await expect(canvas.getAllByTestId("table-row-action")).toHaveLength(rendered.length);
    await expect(rendered[0]?.querySelector("td")).toHaveAttribute("data-cell", "actions");
    // The blank space under the window spans the actions' column as well.
    const columns = rendered[0]?.querySelectorAll("td").length ?? 0;
    const spacer = canvasElement.querySelector<HTMLTableCellElement>(".ww-infinite-table__spacer > td");
    await expect(spacer?.colSpan).toBe(columns);
    await userEvent.click(within(rendered[0] as HTMLElement).getByRole("button", { name: "Favorite" }));
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"name": "favorite"');
  },
};

/**
 * SIDEWAYS SCROLL, as the table has it: eight plain columns need 8 × 110 =
 * 880 px; in a box of 600 the list keeps that width and scrolls sideways —
 * its header with it —, and still scrolls down inside its own box.
 */
export const SidewaysScroll: Story = {
  render: () => (
    <div style={{ width: 600 }}>
      <WidgetStory
        key="sideways"
        definition={antdInfiniteTable}
        seed={{ demo: { rows: manyRows, total: 200 } }}
        viewModel={{
          inputs: { rows: "demo.rows", total: "demo.total" },
          columns: ["a", "b", "c", "d", "e", "f", "g", "h"].map((name) => ({
            title: `Column ${name}`,
            property: name,
          })),
          height: 240,
        }}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const widget = canvas.getByTestId("antd-infinite-table");
    await expect(widget).toHaveAttribute("data-min-width", "880");
    const sideways = () =>
      [...widget.querySelectorAll<HTMLElement>("*")].filter(
        (box) => ["auto", "scroll"].includes(getComputedStyle(box).overflowX) && box.scrollWidth > box.clientWidth + 1,
      );
    await waitFor(() => expect(sideways().length).toBeGreaterThan(0));
    // The rows still scroll down in the list's own box, and only a window of them renders.
    const box = canvas.getByTestId("infinite-table-scroll");
    await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
    await expect(canvas.getAllByTestId("table-row").length).toBeLessThan(60);
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
