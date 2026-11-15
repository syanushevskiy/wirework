/** The table the server describes, and its companions: the pagination and the filter bar — and the infinite table with its header filters. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { closeDropdown, headerFilterDropdown, headerFilterTrigger, option } from "../support/antd";
import { settledBox } from "../support/grid";
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

/** Scrolls so that the list's row <n> (from 1, in the WHOLE list) is the first in view — by the height of a rendered row. */
When("I scroll the infinite table to row {int}", async ({ page }, row: number) => {
  await infiniteTable(page)
    .getByTestId("infinite-table-scroll")
    .evaluate((box, first) => {
      const rendered = box.querySelector<HTMLElement>('[data-testid="table-row"]');
      if (rendered === null) throw new Error("the list renders no row to measure");
      box.scrollTop = first * rendered.offsetHeight;
    }, row - 1);
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

/** The open list of values of a column's header: a Select of several values over Reset and Done. */
const headerValues = (page: Page) => page.getByTestId("header-values").locator("visible=true").last();

/** The values on offer, in order: "Queued, Running, Success, Failed". */
Then("the header filter offers {string}", async ({ page }, values: string) => {
  await expect(headerValues(page)).toHaveAttribute("data-options", values);
});

/** A pick filters AT ONCE (picking a chosen value again unpicks it); the list of options is closed afterwards. */
When("I tick {string} in the header filter", async ({ page }, value: string) => {
  await headerValues(page).getByRole("combobox").click();
  await option(page, value).click();
  await closeDropdown(page);
});

/** What the open header filter holds: "Failed, Queued" ("" = nothing). */
Then("the header filter holds {string}", async ({ page }, values: string) => {
  await expect(headerValues(page)).toHaveAttribute("data-values", values.split(", ").join(","));
});

/** Done only closes the box: every pick was applied when it was made. */
When("I apply the header filter", async ({ page }) => {
  await headerValues(page).getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("header-values").locator("visible=true")).toHaveCount(0);
});

/** Reset filters by nothing, at once; the box stays open until Done. */
When("I reset the header filter", async ({ page }) => {
  await headerValues(page).getByRole("button", { name: "Reset" }).click();
  await headerValues(page).getByRole("button", { name: "Done" }).click();
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

/** The period a date column's header opens: a start and an end date. */
const headerPeriod = (page: Page, title: string) => page.getByRole("group", { name: `Period of ${title}` });

Then("the {string} column is filtered by a period", async ({ page }, title: string) => {
  await headerFilterTrigger(columnHeader(page, title)).click();
  await expect(headerPeriod(page, title).getByRole("textbox")).toHaveCount(2);
  await page.keyboard.press("Escape");
});

/** The dates are TYPED, each confirmed with Enter — never clicked in a calendar; "" leaves an end open. */
When(
  "I filter the {string} column from {string} to {string}",
  async ({ page }, title: string, from: string, to: string) => {
    await headerFilterTrigger(columnHeader(page, title)).click();
    const period = headerPeriod(page, title);
    const fields = period.getByRole("textbox");
    for (const [index, date] of [from, to].entries()) {
      if (date === "") continue;
      await fields.nth(index).fill(date);
      await fields.nth(index).press("Enter");
    }
    await expect(period).toHaveAttribute("data-from", from);
    await expect(period).toHaveAttribute("data-to", to);
    await period.getByRole("button", { name: "Filter" }).click();
  },
);

When("I clear the period of the {string} column", async ({ page }, title: string) => {
  await headerFilterTrigger(columnHeader(page, title)).click();
  await headerPeriod(page, title).getByRole("button", { name: "Reset" }).click();
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

/* ---- cell selection (doc/ADR/0007-row-window-and-header-filters.md "Cells are selected and copied"): a rectangle of cells, its menu ---- */

/** The table whose cells are selected: it says what is selected as "rowStart-columnStart/rowEnd-columnEnd", from 1. */
const selectingTable = (page: Page) => live(page).locator('[data-cell-selection="true"]').first();

/** A cell's padding corner — never the link or the button it may hold, which keep their press. */
const CORNER = { x: 3, y: 3 };

async function cornerOf(page: Page, key: string, property: string): Promise<{ x: number; y: number }> {
  const cell = tableCell(page, key, property);
  await cell.scrollIntoViewIfNeeded();
  const box = await settledBox(cell);
  return { x: box.x + CORNER.x, y: box.y + CORNER.y };
}

When("I select the cell {string} of the table row {string}", async ({ page }, property: string, key: string) => {
  await tableCell(page, key, property).click({ position: CORNER });
});

/** A real drag: pressed on the first cell, moved over the last, let go. */
When(
  "I select the cells from {string} of the table row {string} to {string} of the table row {string}",
  async ({ page }, property: string, key: string, toProperty: string, toKey: string) => {
    const from = await cornerOf(page, key, property);
    const to = await cornerOf(page, toKey, toProperty);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
  },
);

/** Shift+click: the selection reaches from the cell it started at. */
When(
  "I extend the selection to {string} of the table row {string}",
  async ({ page }, property: string, key: string) => {
    await tableCell(page, key, property).click({ position: CORNER, modifiers: ["Shift"] });
  },
);

/** The small square at the selection's bottom-right corner, dragged to another cell. */
When(
  "I drag the corner of the selection to {string} of the table row {string}",
  async ({ page }, property: string, key: string) => {
    const box = await settledBox(selectingTable(page).locator('td[data-handle="true"]'));
    const to = await cornerOf(page, key, property);
    await page.mouse.move(box.x + box.width - 3, box.y + box.height - 3);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
  },
);

Then("the table has the cells {string} selected", async ({ page }, cells: string) => {
  await expect(selectingTable(page)).toHaveAttribute("data-selected", cells);
});

Then("the table has no cells selected", async ({ page }) => {
  await expect(selectingTable(page)).toBeVisible();
  await expect(selectingTable(page)).not.toHaveAttribute("data-selected");
});

Then(
  "the cell {string} of the table row {string} carries the selection's corner",
  async ({ page }, property: string, key: string) => {
    await expect(tableCell(page, key, property)).toHaveAttribute("data-handle", "true");
  },
);

When("I open the cell menu on {string} of the table row {string}", async ({ page }, property: string, key: string) => {
  await tableCell(page, key, property).click({ button: "right", position: CORNER });
});

Then("the cell menu offers {string}", async ({ page }, labels: string) => {
  await expect(page.getByRole("menuitem")).toHaveText(labels.split(", "));
});

/**
 * What THIS page writes to the clipboard is kept on the page as well: the clipboard itself is the machine's, one for
 * every worker of the run, so a scenario reading it back could read what another scenario copied meanwhile.
 */
async function keepWhatIsCopied(page: Page): Promise<void> {
  await page.evaluate(() => {
    const kept = window as unknown as { wwCopied?: string; wwCopyKept?: boolean };
    if (kept.wwCopyKept === true) return;
    kept.wwCopyKept = true;
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (text: string) => {
      kept.wwCopied = text;
      return write(text);
    };
  });
}

const copiedOn = (page: Page) =>
  page.evaluate(() => (window as unknown as { wwCopied?: string }).wwCopied ?? "(nothing was copied)");

When("I choose {string} in the cell menu", async ({ page }, label: string) => {
  await keepWhatIsCopied(page);
  await page.getByRole("menuitem", { name: label, exact: true }).click();
});

When("I copy the selected cells with the keyboard", async ({ page }) => {
  await keepWhatIsCopied(page);
  await page.keyboard.press("ControlOrMeta+c");
});

Then("the table copied {string}", async ({ page }, text: string) => {
  await expect.poll(() => copiedOn(page)).toBe(text);
});

When("I let the selection go with Escape", async ({ page }) => {
  await page.keyboard.press("Escape");
});

/**
 * What was copied, a line per row, the cells separated by " | " here (a tab on the clipboard); `{origin}` stands
 * for the page's own origin, which a link cell's address begins with.
 */
Then("the table copied the cells:", async ({ page }, cells: string) => {
  const expected = cells
    .split("\n")
    .map((line) => line.trim().split(" | ").join("\t"))
    .join("\n")
    .replaceAll("{origin}", new URL(page.url()).origin);
  await expect.poll(() => copiedOn(page)).toBe(expected);
});

/** The file the last export saved, per page. */
const exported = new WeakMap<Page, { name: string; lines: string[] }>();

When("I choose {string} in the cell menu and keep the file", async ({ page }, label: string) => {
  const waiting = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: label, exact: true }).click();
  const download = await waiting;
  const chunks: Buffer[] = [];
  // Boundary cast: a Readable yields `any`; a download's stream yields bytes.
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  // The file begins with the mark a spreadsheet reads UTF-8 by: not a part of the first title.
  const whole = Buffer.concat(chunks).toString("utf8");
  const text = whole.charCodeAt(0) === 0xfeff ? whole.slice(1) : whole;
  exported.set(page, { name: download.suggestedFilename(), lines: text.split("\r\n") });
});

Then(
  "the exported file is {string} with {int} lines, the first {string}",
  async ({ page }, name: string, count: number, first: string) => {
    const file = exported.get(page);
    expect(file?.name).toBe(name);
    expect(file?.lines).toHaveLength(count);
    expect(file?.lines[0]).toBe(first);
  },
);

Then("line {int} of the exported file is {string}", async ({ page }, line: number, text: string) => {
  expect(exported.get(page)?.lines[line - 1]).toBe(text.replaceAll("{origin}", new URL(page.url()).origin));
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
  // The DATA columns: the header over a table's row actions (doc/ADR/0020-row-actions.md) is not one of them.
  const headers = tableWidget(page).getByRole("columnheader");
  await expect
    .poll(() =>
      headers.evaluateAll((cells) =>
        cells
          .filter((cell) => !cell.classList.contains("ww-table__actions"))
          .map((cell) => (cell.querySelector('[data-testid="table-column-title"]') ?? cell).textContent.trim()),
      ),
    )
    .toEqual(titles.split(", "));
});

/* ----------------------------- column menu ---------------------------- */

/** The list of columns the menu opens — a popover outside the page, found by its own name. */
const columnList = (page: Page) => page.getByTestId("table-column-list");
/** One column's line in it, by the column's title. */
const columnItem = (page: Page, title: string) =>
  columnList(page)
    .getByTestId("table-column-item")
    .filter({ has: page.getByRole("checkbox", { name: title, exact: true }) });
const columnReset = (page: Page) => page.getByTestId("table-column-reset");

/** The button above the table that opens the menu: a settings icon with the word "Columns". */
const columnMenuButton = (page: Page) => tableWidget(page).getByRole("button", { name: "Columns", exact: true });

When("I open the column menu of the table", async ({ page }) => {
  await expect(columnMenuButton(page)).toHaveText("Columns");
  await columnMenuButton(page).click();
  await expect(columnList(page)).toBeVisible();
});

Then("the table has no column menu", async ({ page }) => {
  await expect(columnMenuButton(page)).toHaveCount(0);
});

/** A required column: listed, shown, its checkbox locked, and tagged "Always". */
Then("the column {string} cannot be hidden", async ({ page }, title: string) => {
  await expect(columnItem(page, title)).toHaveAttribute("data-required", "true");
  await expect(columnItem(page, title).getByTestId("table-column-required")).toHaveText("Always");
  await expect(columnItem(page, title).getByRole("checkbox")).toBeChecked();
  await expect(columnItem(page, title).getByRole("checkbox")).toBeDisabled();
});

/** "Columns" above the list: every column at once — hiding leaves the required ones. */
When("I hide every column of the table", async ({ page }) => {
  await page.getByRole("checkbox", { name: "Columns", exact: true }).uncheck();
});

/** The three dots of a column's line: the pointer over them opens its actions (a menu outside the page). */
const chooseColumnAction = async (page: Page, title: string, action: string) => {
  await columnItem(page, title).scrollIntoViewIfNeeded();
  await columnItem(page, title)
    .getByRole("button", { name: `Actions of ${title}` })
    .hover();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
};

Then("the actions of the column {string} are {string}", async ({ page }, title: string, actions: string) => {
  await columnItem(page, title).scrollIntoViewIfNeeded();
  await columnItem(page, title)
    .getByRole("button", { name: `Actions of ${title}` })
    .hover();
  await expect(page.getByRole("menuitem")).toHaveText(actions.split(", "));
  // The pointer away again: the actions close, and the next line's are not mistaken for these.
  await columnReset(page).hover();
  await expect(page.getByRole("menuitem")).toHaveCount(0);
});

When(/^I pin the column "([^"]*)" to the (left|right)$/, async ({ page }, title: string, edge: string) => {
  await chooseColumnAction(page, title, `Pin ${edge}`);
  await expect(columnItem(page, title)).toHaveAttribute("data-pinned", edge);
});

When("I unpin the column {string}", async ({ page }, title: string) => {
  await chooseColumnAction(page, title, "Unpin");
  await expect(columnItem(page, title)).toHaveAttribute("data-pinned", "none");
});

/** As the TABLE has it: the column's header stands at that edge. */
Then(/^the column "([^"]*)" is pinned to the (left|right)$/, async ({ page }, title: string, edge: string) => {
  await expect(tableWidget(page).getByRole("columnheader", { name: title, exact: true })).toHaveAttribute(
    "data-pinned",
    edge,
  );
});

Then("the column {string} is not pinned", async ({ page }, title: string) => {
  await expect(tableWidget(page).getByRole("columnheader", { name: title, exact: true })).not.toHaveAttribute(
    "data-pinned",
  );
});

/** As the MENU shows it: which columns stand in the group pinned to that edge, in order. */
Then(/^the column menu shows "([^"]*)" pinned to the (left|right)$/, async ({ page }, titles: string, edge: string) => {
  await expect
    .poll(() => columnTitles(page, `[data-testid="table-column-item"][data-pinned="${edge}"]`))
    .toEqual(titles.split(", "));
});

/** The titles of some lines of the menu, in order — a line holds more than its title (a tag, its actions). */
const columnTitles = (page: Page, selector = '[data-testid="table-column-item"]') =>
  columnList(page)
    .locator(selector)
    .evaluateAll((items) => items.map((item) => item.getAttribute("data-title")));

Then("the column menu lists {string}", async ({ page }, titles: string) => {
  await expect.poll(() => columnTitles(page)).toEqual(titles.split(", "));
});

/** The captions over the menu's sections, in order: PINNED LEFT and PINNED RIGHT only while a column is pinned there. */
Then("the column menu has the sections {string}", async ({ page }, captions: string) => {
  await expect(columnList(page).getByTestId("table-column-section")).toHaveText(captions.split(", "));
});

When("I hide the column {string}", async ({ page }, title: string) => {
  await columnItem(page, title).getByRole("checkbox").uncheck();
  await expect(columnItem(page, title)).toHaveAttribute("data-shown", "false");
});

When("I show the column {string}", async ({ page }, title: string) => {
  await columnItem(page, title).getByRole("checkbox").check();
  await expect(columnItem(page, title)).toHaveAttribute("data-shown", "true");
});

/** A real drag: the line is grabbed and let go over the upper or lower part of another — before or after it. */
When(
  /^I drag the column "([^"]*)" (above|below) the column "([^"]*)"$/,
  async ({ page }, title: string, side: "above" | "below", target: string) => {
    // The whole list in view: the pointer cannot reach a line above the window's edge.
    await columnList(page).scrollIntoViewIfNeeded();
    await columnItem(page, target).scrollIntoViewIfNeeded();
    const from = await settledBox(columnItem(page, title));
    const to = await settledBox(columnItem(page, target));
    const x = to.x + to.width / 2;
    const y = to.y + to.height * (side === "above" ? 0.25 : 0.75);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    // Past the browser's drag threshold first, then to the place: a drag starts only once the pointer has moved.
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 6, { steps: 3 });
    await page.mouse.move(x, y, { steps: 12 });
    await page.mouse.up();
  },
);

When("I reset the columns of the table", async ({ page }) => {
  await columnReset(page).click();
  await expect(columnReset(page)).toBeDisabled();
});

Then("the columns of the table cannot be reset", async ({ page }) => {
  await expect(columnReset(page)).toBeDisabled();
});

Then("the columns of the table can be reset", async ({ page }) => {
  await expect(columnReset(page)).toBeEnabled();
});

/* ---------------------------- sideways scroll --------------------------- */

/** Whether anything inside the table scrolls sideways: a box that shows less than it holds — whichever box the library made. */
const scrollsSideways = (page: Page) =>
  tableWidget(page).evaluate((root) =>
    [...root.querySelectorAll("*")].some(
      (box) => ["auto", "scroll"].includes(getComputedStyle(box).overflowX) && box.scrollWidth > box.clientWidth + 1,
    ),
  );

/** The least width the table's columns need, as the widget says it (the sum of their widths). */
Then("the table needs {int} pixels for its columns", async ({ page }, width: number) => {
  await expect(tableWidget(page)).toHaveAttribute("data-min-width", String(width));
});

Then("the table scrolls sideways", async ({ page }) => {
  await expect.poll(() => scrollsSideways(page)).toBe(true);
});

Then("the table fills its box without a sideways scroll", async ({ page }) => {
  await expect.poll(() => scrollsSideways(page)).toBe(false);
});

/* ------------------------------- toolbar ------------------------------ */

/** The row of tools above the table; its standard items are buttons named by what they do. */
const toolbar = (page: Page) => tableWidget(page).getByRole("toolbar", { name: "Table tools" });
const resetFilters = (page: Page) => toolbar(page).getByRole("button", { name: "Reset Filters" });

/** The tools in order, by the names they are registered under: "reset-filters, refresh" ("" = none). */
Then("the table toolbar offers {string}", async ({ page }, names: string) => {
  const items = toolbar(page).getByTestId("table-toolbar-item");
  await expect(items).toHaveCount(names === "" ? 0 : names.split(", ").length);
  for (const [index, name] of (names === "" ? [] : names.split(", ")).entries()) {
    await expect(items.nth(index)).toHaveAttribute("data-name", name);
  }
});

When("I reset the filters of the table", async ({ page }) => {
  await resetFilters(page).click();
  await expect(resetFilters(page)).toBeDisabled();
});

Then("the filters of the table can be reset", async ({ page }) => {
  await expect(resetFilters(page)).toBeEnabled();
});

Then("the filters of the table cannot be reset", async ({ page }) => {
  await expect(resetFilters(page)).toBeDisabled();
});

When("I reload the table", async ({ page }) => {
  await toolbar(page).getByRole("button", { name: "Reload" }).click();
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

/* ----------------------------- row actions ----------------------------- */

/** One action of a row (doc/ADR/0020-row-actions.md), by the name the page listed it under. */
const rowAction = (page: Page, key: string, name: string) =>
  tableRow(page, key).locator(`[data-testid="table-row-action"][data-name="${name}"]`);

/** A real pointer over the row — on its last cell, away from the actions at its start. */
When("I hover the table row {string}", async ({ page }, key: string) => {
  await tableRow(page, key).locator("td").last().hover();
});

/**
 * An action out of sight is still in the page (hidden by opacity, so the row
 * keeps its height and the keyboard reaches it): what shows is its style.
 */
Then("the table row {string} shows the action {string}", async ({ page }, key: string, name: string) => {
  await expect(rowAction(page, key, name)).toHaveCSS("opacity", "1");
});

Then("the table row {string} hides the action {string}", async ({ page }, key: string, name: string) => {
  await expect(rowAction(page, key, name)).toHaveCSS("opacity", "0");
});

When("I use the action {string} on the table row {string}", async ({ page }, name: string, key: string) => {
  await tableRow(page, key).locator("td").last().hover();
  await rowAction(page, key, name).getByRole("button").click();
});

Then("the table row {string} is a favorite", async ({ page }, key: string) => {
  await expect(rowAction(page, key, "favorite").getByRole("button")).toHaveAttribute("aria-pressed", "true");
});

Then("the table row {string} is not a favorite", async ({ page }, key: string) => {
  await expect(rowAction(page, key, "favorite").getByRole("button")).toHaveAttribute("aria-pressed", "false");
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

/** A list whose end is not known yet: its first row in view (from 1) of the rows known to be there so far. */
Then("the list stands at row {int} of at least {int}", async ({ page }, row: number, known: number) => {
  await expect(listPosition(page)).toHaveAttribute("data-position", String(row - 1));
  await expect(listPosition(page)).toHaveAttribute("data-total", String(known));
  await expect(listPosition(page)).toHaveAttribute("data-open", "true");
});

/** The list goes on past the rows it knows of (`data-open`): the table and the scale both say so, and no percent is shown. */
Then("the list's end is not known", async ({ page }) => {
  await expect(infiniteTable(page)).toHaveAttribute("data-open", "true");
  await expect(listPosition(page)).toHaveAttribute("data-open", "true");
  await expect(listPosition(page).getByTestId("list-position-percent")).toHaveCount(0);
});

Then("the list's end is known", async ({ page }) => {
  await expect(infiniteTable(page)).toHaveAttribute("data-open", "false");
  await expect(listPosition(page)).toHaveAttribute("data-open", "false");
  await expect(listPosition(page).getByTestId("list-position-percent")).toHaveCount(1);
});

/**
 * Scrolls to the end of the rows known, again and again, until the list's
 * end is found (`data-open` false): every arrival at the end asks for the
 * batch after it, and the batch that comes back empty is the end.
 */
When("I scroll the infinite table until the list's end is found", async ({ page }) => {
  const table = infiniteTable(page);
  await expect
    .poll(
      async () => {
        if ((await table.getAttribute("data-open")) === "false") return true;
        await table.getByTestId("infinite-table-scroll").evaluate((box) => {
          box.scrollTop = box.scrollHeight;
        });
        return false;
      },
      { timeout: 30_000, intervals: [150] },
    )
    .toBe(true);
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
