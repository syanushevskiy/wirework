/** The table the server describes, and its companions: the pagination and the filter bar — and the infinite table with its header filters. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { closeDropdown, headerFilterDropdown, headerFilterTrigger, headerFilterValue, option } from "../support/antd";
import { live } from "../support/page";
import { tableCell, tableRow } from "../support/table";

const { When, Then } = createBdd();

/* --------------------------- infinite table --------------------------- */

const infiniteTable = (page: Page) => live(page).getByTestId("antd-infinite-table");

/** A column header of the live page's table, by its title (the header holds its filter and sort triggers too). */
const columnHeader = (page: Page, title: string) =>
  live(page).getByRole("columnheader", { name: title, exact: false }).filter({ hasText: title });

Then("the first table row is {string}", async ({ page }, key: string) => {
  await expect(live(page).getByTestId("table-row").first()).toHaveAttribute("data-row-key", key);
});

/** "<held> of <total>": the line under the rows. */
Then("the infinite table shows {string}", async ({ page }, status: string) => {
  await expect(infiniteTable(page).getByTestId("infinite-table-status")).toHaveText(status);
});

When("I scroll the infinite table to its end", async ({ page }) => {
  await infiniteTable(page)
    .getByTestId("infinite-table-scroll")
    .evaluate((box) => {
      box.scrollTop = box.scrollHeight;
    });
});

When("I scroll the infinite table to its top", async ({ page }) => {
  await infiniteTable(page)
    .getByTestId("infinite-table-scroll")
    .evaluate((box) => {
      box.scrollTop = 0;
    });
});

/** The keyboard scrolls the box too: End, Home, PageDown, PageUp — the box is focusable. */
When("I press {string} in the infinite table", async ({ page }, key: string) => {
  await infiniteTable(page).getByTestId("infinite-table-scroll").press(key);
});

Then("the last table row is {string}", async ({ page }, key: string) => {
  await expect(live(page).getByTestId("table-row").last()).toHaveAttribute("data-row-key", key);
});

/** The rows the list HOLDS (`data-held`) — more than it renders once they outgrow its window. */
Then("the list holds {int} rows", async ({ page }, count: number) => {
  await expect(infiniteTable(page)).toHaveAttribute("data-held", String(count));
});

/** A virtual list: of the rows held only those around the visible part of the box are in the DOM. */
Then("the infinite table renders only a window of its rows", async ({ page }) => {
  const held = Number(await infiniteTable(page).getAttribute("data-held"));
  const rendered = infiniteTable(page).getByTestId("table-row");
  await expect.poll(() => rendered.count()).toBeLessThan(held);
  await expect.poll(() => rendered.count()).toBeGreaterThan(0);
});

/** A column whose header filters by a list of values shows a filter icon; one filtering by text a SEARCH icon. */
Then("the {string} column header has a {word} icon", async ({ page }, title: string, icon: string) => {
  await expect(headerFilterTrigger(columnHeader(page, title)).getByRole("img", { name: icon })).toBeVisible();
});

Then("the {string} column header has no filter", async ({ page }, title: string) => {
  await expect(columnHeader(page, title)).toBeVisible();
  await expect(headerFilterTrigger(columnHeader(page, title))).toHaveCount(0);
});

When("I open the header filter of the {string} column", async ({ page }, title: string) => {
  await headerFilterTrigger(columnHeader(page, title)).click();
  await expect(headerFilterDropdown(page)).toBeVisible();
});

/** The values on offer, in order: "Queued, Running, Success, Failed". */
Then("the header filter offers {string}", async ({ page }, values: string) => {
  await expect(headerFilterDropdown(page).getByRole("menuitem")).toHaveText(values.split(", "));
});

When("I tick {string} in the header filter", async ({ page }, value: string) => {
  await headerFilterValue(page, value).click();
});

When("I apply the header filter", async ({ page }) => {
  await headerFilterDropdown(page).getByRole("button", { name: "OK" }).click();
});

/** antd's Reset only unticks the list; OK applies it. */
When("I reset the header filter", async ({ page }) => {
  await headerFilterDropdown(page).getByRole("button", { name: "Reset" }).click();
  await headerFilterDropdown(page).getByRole("button", { name: "OK" }).click();
});

/** The search icon of a text column opens a box; Enter searches. */
When("I search the {string} column for {string}", async ({ page }, title: string, text: string) => {
  await headerFilterTrigger(columnHeader(page, title)).click();
  const box = headerFilterDropdown(page).getByRole("textbox", { name: `Search ${title}` });
  await box.fill(text);
  await box.press("Enter");
});

When("I clear the search of the {string} column", async ({ page }, title: string) => {
  await headerFilterTrigger(columnHeader(page, title)).click();
  await headerFilterDropdown(page).getByRole("button", { name: "Reset" }).click();
});

/** A click on the header's title sorts: ascending, then descending, then not at all. */
When("I click the {string} column header", async ({ page }, title: string) => {
  await columnHeader(page, title).getByText(title, { exact: true }).click();
});

/* ------------------------------- table ------------------------------- */

Then("the table has {int} row(s)", async ({ page }, count: number) => {
  await expect(live(page).getByTestId("table-row")).toHaveCount(count);
});

Then(
  "the table row {string} shows {string} for {string}",
  async ({ page }, key: string, value: string, property: string) => {
    await expect(tableCell(page, key, property)).toHaveText(value);
  },
);

When("I click the table row {string}", async ({ page }, key: string) => {
  // The row's corner is cell padding — never a link a cell may hold.
  await tableRow(page, key).click({ position: { x: 2, y: 2 } });
});

When("I click the link {string} in the table row {string}", async ({ page }, text: string, key: string) => {
  await tableRow(page, key).getByRole("link", { name: text, exact: true }).click();
});

Then(
  "the table row {string} links {string} to {string}",
  async ({ page }, key: string, property: string, href: string) => {
    await expect(tableCell(page, key, property).getByRole("link")).toHaveAttribute("href", href);
  },
);

/** A tag cell: its text, and its tone (success is green, danger red, info blue, default grey). */
Then(
  "the table row {string} shows a {string} tag {string} for {string}",
  async ({ page }, key: string, tone: string, text: string, property: string) => {
    const tag = tableCell(page, key, property).locator("[data-tone]");
    await expect(tag).toHaveText(text);
    await expect(tag).toHaveAttribute("data-tone", tone);
  },
);

/** The playground's own cell renderer ("run-status"): the state as a tag, the message behind it. */
Then(
  "the table row {string} shows the host's status {string} with the message {string}",
  async ({ page }, key: string, text: string, message: string) => {
    const status = tableRow(page, key).getByTestId("run-status");
    await expect(status).toHaveText(text);
    await expect(status).toHaveAttribute("data-message", message);
  },
);

/** The playground's "copy" renderer: the value next to a button that puts it on the clipboard (permission granted in the config). */
When("I click Copy in the table row {string}", async ({ page }, key: string) => {
  await tableRow(page, key).getByTestId("copy-cell").getByRole("button").click();
});

Then("the Copy button in the table row {string} reads {string}", async ({ page }, key: string, text: string) => {
  await expect(tableRow(page, key).getByTestId("copy-cell").getByRole("button")).toHaveText(text);
});

Then("the clipboard holds {string}", async ({ page }, text: string) => {
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(text);
});

Then(
  "the table row {string} shows {string} for {string} as plain text, no renderer having that name",
  async ({ page }, key: string, text: string, property: string) => {
    await expect(tableCell(page, key, property).locator('[data-cell-problem="unknown-renderer"]')).toHaveText(text);
  },
);

Then("the table is not loading", async ({ page }) => {
  await expect(live(page).getByTestId("antd-table")).toHaveAttribute("data-loading", "false");
});

Then("the table is loading", async ({ page }) => {
  await expect(live(page).getByTestId("antd-table")).toHaveAttribute("data-loading", "true");
});

/** Whichever table kind the page shows: the table, or the infinite table. */
const tableWidget = (page: Page) =>
  live(page).locator('[data-testid="antd-table"], [data-testid="antd-infinite-table"]');

Then("the table has a column {string}", async ({ page }, title: string) => {
  await expect(tableWidget(page).getByRole("columnheader", { name: title })).toBeVisible();
});

Then("the table has the columns {string}", async ({ page }, titles: string) => {
  // A header with a filter under its title holds more than the title: the title has a name of its own there.
  const headers = tableWidget(page).getByRole("columnheader");
  await expect
    .poll(() =>
      headers.evaluateAll((cells) =>
        cells.map((cell) => (cell.querySelector('[data-testid="table-column-title"]') ?? cell).textContent.trim()),
      ),
    )
    .toEqual(titles.split(", "));
});

/* ----------------------------- filter row ----------------------------- */

/** The filters of the table's filter row — the ones to SEE (a sticky header keeps a hidden copy it measures widths by). */
const rowFilters = (page: Page) => tableWidget(page).getByTestId("table-filter").locator("visible=true");

/** The filter a column shows under its title, found by the column's title. */
const rowFilter = (page: Page, title: string) => rowFilters(page).and(page.locator(`[data-column="${title}"]`));

/** Which columns have a filter in the table, in order: "Name, Inbound, Status". */
Then("the table has filters under the columns {string}", async ({ page }, titles: string) => {
  const filters = rowFilters(page);
  await expect(filters).toHaveCount(titles.split(", ").length);
  for (const [index, title] of titles.split(", ").entries()) {
    await expect(filters.nth(index)).toHaveAttribute("data-column", title);
  }
});

/** A text filter is a search field (with a search icon), a values filter a list to pick from. */
Then("the {string} filter of the table is a search field", async ({ page }, title: string) => {
  await expect(rowFilter(page, title).getByRole("searchbox", { name: `Filter ${title}` })).toBeVisible();
  await expect(rowFilter(page, title).getByRole("img", { name: "search" })).toBeVisible();
});

Then("the {string} filter of the table is a list of values", async ({ page }, title: string) => {
  await expect(rowFilter(page, title).getByRole("combobox", { name: `Filter ${title}` })).toBeVisible();
});

/** Typing alone filters nothing: Enter applies the text. An empty text takes the filter away. */
When("I type {string} into the {string} filter of the table", async ({ page }, text: string, title: string) => {
  const field = rowFilter(page, title).getByRole("searchbox");
  await field.fill(text);
  await field.press("Enter");
});

When("I click into the {string} filter of the table", async ({ page }, title: string) => {
  await rowFilter(page, title).getByRole("searchbox").click();
});

/** Picking a chosen value again unpicks it; the list is closed afterwards. */
When("I pick {string} in the {string} filter of the table", async ({ page }, value: string, title: string) => {
  await rowFilter(page, title).getByRole("combobox").click();
  await option(page, value).click();
  await closeDropdown(page);
});

/** What the filter is APPLYING: the text, or the values ("Failed, Queued"; "" = nothing). */
Then("the {string} filter of the table holds {string}", async ({ page }, title: string, values: string) => {
  await expect(rowFilter(page, title)).toHaveAttribute("data-values", values.split(", ").join(","));
});

/* ------------------- windowed list and list position ------------------- */

const listPosition = (page: Page) => live(page).getByTestId("antd-list-position");

/** A windowed list holds a SLICE of the whole list: these rows of it are in the store (rows count from 1). */
Then("the list holds the rows {int} to {int}", async ({ page }, from: number, to: number) => {
  await expect(infiniteTable(page)).toHaveAttribute("data-offset", String(from - 1));
  await expect(infiniteTable(page)).toHaveAttribute("data-held", String(to - from + 1));
});

/** After a jump the slice is made around the rows in view: it holds this row of the list, wherever it begins. */
Then("the list holds a slice around row {int}", async ({ page }, row: number) => {
  await expect
    .poll(async () => {
      const offset = Number(await infiniteTable(page).getAttribute("data-offset"));
      const held = Number(await infiniteTable(page).getAttribute("data-held"));
      return offset < row && row <= offset + held;
    })
    .toBe(true);
});

/** Where the list stands, as the widget under it says: its first row in view (from 1) of how many. */
Then("the list stands at row {int} of {int}", async ({ page }, row: number, total: number) => {
  await expect(listPosition(page)).toHaveAttribute("data-position", String(row - 1));
  await expect(listPosition(page)).toHaveAttribute("data-total", String(total));
});

/** How far into the list its rows in view are — a jump along a scale lands within a percent of where it aimed. */
Then("the list stands at about {int} percent", async ({ page }, percent: number) => {
  await expect
    .poll(async () => Math.abs(Number(await listPosition(page).getAttribute("data-percent")) - percent))
    .toBeLessThanOrEqual(1);
});

/** The row the position widget names is one the list shows: its key counted on from the first row's. */
Then("the row the list stands at is shown, counting from {string}", async ({ page }, firstKey: string) => {
  await expect
    .poll(async () => {
      const position = Number(await listPosition(page).getAttribute("data-position"));
      return live(page)
        .locator(`[data-testid="table-row"][data-row-key="${Number(firstKey) + position}"]`)
        .count();
    })
    .toBe(1);
});

/** A click on the scale at that share of its length: the handle jumps there, as a drag let go there would. */
When("I move the list position to {int} percent", async ({ page }, percent: number) => {
  const scale = listPosition(page).getByRole("slider");
  const rail = listPosition(page).locator(".ww-list-position__scale");
  const box = await rail.boundingBox();
  if (box === null) throw new Error("the list position has no scale");
  await rail.click({ position: { x: (box.width * percent) / 100, y: box.height / 2 } });
  await expect(scale).toBeVisible();
});

/* ----------------------------- pagination ----------------------------- */

const pagination = (page: Page) => live(page).getByTestId("antd-pagination");

When("I go to page {int} of the pagination", async ({ page }, number: number) => {
  // Every page item carries its number as its title.
  await pagination(page).getByTitle(String(number), { exact: true }).click();
});

Then("the pagination shows page {int}", async ({ page }, number: number) => {
  await expect(pagination(page)).toHaveAttribute("data-page", String(number));
});

Then("the pagination counts {int} rows", async ({ page }, total: number) => {
  await expect(pagination(page)).toHaveAttribute("data-total", String(total));
});

/* ------------------------------ filter bar ------------------------------ */

/** One filter of the filter bar, found by its visible label. */
const barFilter = (page: Page, label: string) =>
  live(page).locator(`[data-testid="filter-bar-filter"][data-label="${label}"]`);

/** Picking a chosen option again unpicks it; the dropdown is closed afterwards. */
When("I pick {string} in the {string} filter", async ({ page }, optionLabel: string, label: string) => {
  await barFilter(page, label).getByRole("combobox").click();
  await option(page, optionLabel).click();
  await page.keyboard.press("Escape");
});

/** Filter labels in order: "Suite, Status" ("" = no filters). */
Then("the filter bar offers the filters {string}", async ({ page }, labels: string) => {
  const filters = live(page).getByTestId("filter-bar-filter");
  await expect(filters).toHaveCount(labels === "" ? 0 : labels.split(", ").length);
  for (const [index, label] of (labels === "" ? [] : labels.split(", ")).entries()) {
    await expect(filters.nth(index)).toHaveAttribute("data-label", label);
  }
});

Then("the {string} filter offers {string}", async ({ page }, label: string, options: string) => {
  await expect(barFilter(page, label)).toHaveAttribute("data-options", options);
});

Then("the {string} filter holds {string}", async ({ page }, label: string, values: string) => {
  await expect(barFilter(page, label)).toHaveAttribute("data-values", values.split(", ").join(","));
});
