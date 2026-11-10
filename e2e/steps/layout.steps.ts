/** Page layout: the engine and view in use, cells and their placement, the edit session (drag, resize, save, cancel). */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { dragBetween, dragOnto, gridItem, settledBox } from "../support/grid";
import { cell, live } from "../support/page";

const { When, Then } = createBdd();

Then("the page layout uses the {string} engine", async ({ page }, engine: string) => {
  await expect(page.getByTestId("page")).toHaveAttribute("data-engine", engine);
});

Then("the page uses the {string} view", async ({ page }, view: string) => {
  await expect(page.getByTestId("page")).toHaveAttribute("data-view", view);
});

/* ---- flex rows (doc/flex-rows-design.md): rows of a flexbox each, Tailwind's flex class names on rows and cells ---- */

/** Outside any layout a container holds: the page's OWN rows and items (a card on flex rows has rows of its own). */
const OWN = 'and not(ancestor::*[@data-testid="layout"])';
const ownRows = (page: Page) => live(page).locator(`xpath=.//*[@data-testid="row" ${OWN}]`);
const ownItems = (page: Page, row: number) =>
  ownRows(page)
    .nth(row - 1)
    .locator(`xpath=.//*[@data-testid="flex-item" ${OWN}]`);
const flexItem = (page: Page, id: string) => live(page).locator(`[data-testid="flex-item"][data-cell="${id}"]`);

Then("the page has {int} row(s)", async ({ page }, count: number) => {
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(ownRows(page)).toHaveCount(count);
});

Then("row {int} has {int} cells", async ({ page }, row: number, count: number) => {
  await expect(ownItems(page, row)).toHaveCount(count);
});

/** The cells of one of the page's rows, in order: "custom-2, custom-1". */
Then("row {int} holds the cells {string}", async ({ page }, row: number, ids: string) => {
  const items = ownItems(page, row);
  await expect(items).toHaveCount(ids.split(", ").length);
  for (const [index, id] of ids.split(", ").entries()) {
    await expect(items.nth(index)).toHaveAttribute("data-cell", id);
  }
});

Then("the cell {string} has the flex classes {string}", async ({ page }, id: string, classes: string) => {
  await expect(flexItem(page, id)).toHaveAttribute("data-classes", classes);
});

Then("row {int} has the flex classes {string}", async ({ page }, row: number, classes: string) => {
  await expect(ownRows(page).nth(row - 1)).toHaveAttribute("data-classes", classes);
});

/** Edit mode: the field in the cell's handle; Enter commits one change. */
When("I set the flex classes of the cell {string} to {string}", async ({ page }, id: string, classes: string) => {
  const field = flexItem(page, id).getByTestId("flex-cell-classes").first();
  await field.fill(classes);
  await field.press("Enter");
});

When("I set the flex classes of row {int} to {string}", async ({ page }, row: number, classes: string) => {
  const field = page.locator(`[data-testid="flex-row-bar"][data-row="${row - 1}"]`).getByTestId("flex-row-classes");
  await field.fill(classes);
  await field.press("Enter");
});

Then("the flex classes field of the cell {string} is marked invalid", async ({ page }, id: string) => {
  await expect(flexItem(page, id).getByTestId("flex-cell-classes").first()).toHaveAttribute("aria-invalid", "true");
});

/** Edit mode: the arrows in the cell's handle — left / right within its row, up / down into the row above / below. */
When("I move the cell {string} {word}", async ({ page }, id: string, direction: string) => {
  await page.locator(`[data-testid="flex-move"][data-cell="${id}"][data-direction="${direction}"]`).click();
});

/** The named cells share a band, whatever engine placed them and however they align in it: left to right in the order given. */
Then("the cells {string} sit side by side", async ({ page }, ids: string) => {
  const boxes = [];
  for (const id of ids.split(", ")) boxes.push(await settledBox(cell(page, id)));
  for (const [index, box] of boxes.entries()) {
    const previous = boxes[index - 1];
    if (!previous) continue;
    expect(box.y).toBeLessThan(previous.y + previous.height);
    expect(previous.y).toBeLessThan(box.y + box.height);
    expect(box.x).toBeGreaterThanOrEqual(previous.x + previous.width - 1);
  }
});

Then("the cell {string} has no flex classes", async ({ page }, id: string) => {
  await expect(flexItem(page, id)).toBeVisible();
  await expect(flexItem(page, id)).not.toHaveAttribute("data-classes");
});

Then("the cell {string} sits below the cell {string}", async ({ page }, id: string, above: string) => {
  const upper = await settledBox(cell(page, above));
  const lower = await settledBox(cell(page, id));
  expect(lower.y).toBeGreaterThanOrEqual(upper.y + upper.height - 1);
});

Then("the cell {string} is wider than the cell {string}", async ({ page }, id: string, other: string) => {
  const wide = await settledBox(cell(page, id));
  const narrow = await settledBox(cell(page, other));
  expect(wide.width).toBeGreaterThan(narrow.width);
});

/** The window's width, its height kept: the panes follow it, and a flex row wraps the cells that no longer fit. */
When("the browser window is {int} pixels wide", async ({ page }, width: number) => {
  await page.setViewportSize({ width, height: page.viewportSize()?.height ?? 720 });
});

/** The layout inside a container names its engine: a card may run another engine than its page. */
Then("the container {string} runs on the {string} engine", async ({ page }, id: string, engine: string) => {
  await expect(cell(page, id).locator('[data-testid="layout"]').first()).toHaveAttribute("data-engine", engine);
});

Then("the page has {int} cell(s)", async ({ page }, count: number) => {
  // The page must exist: a count of 0 must never pass because nothing rendered.
  await expect(page.getByTestId("page")).toBeVisible();
  // The page's OWN cells: the ones inside a container's layout are the container's (doc/containers-design.md).
  await expect(
    page
      .getByTestId("page")
      .locator(
        'xpath=.//*[(@data-testid="cell" or @data-testid="cell-problem") and not(ancestor::*[@data-testid="layout"])]',
      ),
  ).toHaveCount(count);
});

Then("I see a widget {string}", async ({ page }, widget: string) => {
  await expect(page.locator(`[data-testid="cell"][data-widget="${widget}"]`).first()).toBeVisible();
});

/** One cell's text — for pages that hold several widgets of a kind. */
Then("the cell {string} reads {string}", async ({ page }, id: string, text: string) => {
  await expect(cell(page, id)).toHaveText(text);
});

/* ---- conditions (doc/conditions-design.md): a cell keeps its place; `data-when` says whether its widget shows ---- */

Then("the cell {string} is hidden", async ({ page }, id: string) => {
  await expect(cell(page, id)).toHaveAttribute("data-when", "false");
  await expect(cell(page, id)).toBeEmpty();
});

Then("the cell {string} is shown", async ({ page }, id: string) => {
  await expect(cell(page, id)).toHaveAttribute("data-when", "true");
  await expect(cell(page, id)).not.toBeEmpty();
});

/** Edit mode: the widget stays visible, dimmed, with the condition it would be hidden by. */
Then("the cell {string} says it is hidden now {string}", async ({ page }, id: string, condition: string) => {
  await expect(cell(page, id)).toHaveAttribute("data-when", "false");
  const note = cell(page, id).getByTestId("cell-hidden-note");
  await expect(note).toHaveText(`hidden now — shows ${condition}`);
  // The widget itself is still there, under the note.
  await expect(note.locator("xpath=following-sibling::*").first()).toBeVisible();
});

/* ---- containers (doc/containers-design.md): a layout inside a widget's cell ---- */

/** The cells of the layout inside a container, in order: "input-name, select-page-size". */
Then("the container {string} holds the cells {string}", async ({ page }, id: string, ids: string) => {
  const inner = cell(page, id).locator('[data-testid="layout"]').first().locator('[data-testid="cell"]');
  await expect(inner).toHaveCount(ids.split(", ").length);
  for (const [index, innerId] of ids.split(", ").entries()) {
    await expect(inner.nth(index)).toHaveAttribute("data-cell", innerId);
  }
});

Then("the container {string} is empty", async ({ page }, id: string) => {
  const layout = cell(page, id).locator('[data-testid="layout"]').first();
  await expect(layout).toBeVisible();
  await expect(layout.locator('[data-testid="cell"]')).toHaveCount(0);
});

/** Edit mode: a container's "Edit content" shows the layout inside it as the page, with a breadcrumb back. (The chrome sits in the engine's handle bar, beside the cell.) */
When("I edit the content of the cell {string}", async ({ page }, id: string) => {
  await page.locator(`[data-testid="cell-edit-layout"][data-cell="${id}"]`).click();
});

/** Edit mode, in a user's or a role's view: "Reset to original" on a container — its own layout inside goes. */
const resetButton = (page: Page, id: string) => page.locator(`[data-testid="cell-reset-layout"][data-cell="${id}"]`);

When("I reset the content of the cell {string} to the original", async ({ page }, id: string) => {
  await resetButton(page, id).click();
});

/** The button is always there; with nothing of the viewer's own inside the container it is disabled. */
Then("the content of the cell {string} can be reset to the original", async ({ page }, id: string) => {
  await expect(resetButton(page, id)).toBeEnabled();
});

Then("the content of the cell {string} is the original", async ({ page }, id: string) => {
  await expect(resetButton(page, id)).toBeDisabled();
});

/** A container with several layouts (tabs, panels) has one "Edit …" per layout, named by its path: "tabs.1.content". */
When("I edit the layout {string} of the cell {string}", async ({ page }, path: string, id: string) => {
  await page.locator(`[data-testid="cell-edit-layout"][data-cell="${id}"][data-layout="${path}"]`).click();
});

/** The tabs of a tabs widget, in order: "Runs, History". */
Then("the cell {string} has the tabs {string}", async ({ page }, id: string, labels: string) => {
  await expect(cell(page, id).getByRole("tab")).toHaveText(labels.split(", "));
});

Then("the breadcrumb reads {string}", async ({ page }, text: string) => {
  const crumbs = page.getByTestId("layout-crumbs").getByTestId("layout-crumb");
  await expect(crumbs).toHaveText(text.split(" › "));
});

Then("there is no breadcrumb", async ({ page }) => {
  await expect(page.getByTestId("layout-crumbs")).toHaveCount(0);
});

When("I follow the breadcrumb {string}", async ({ page }, label: string) => {
  await page.getByTestId("layout-crumbs").getByTestId("layout-crumb").filter({ hasText: label }).click();
});

/** Edit mode: "Wrap in a card" — a new card cell holding the cell. */
When("I wrap the cell {string} in a card", async ({ page }, id: string) => {
  await page.locator(`[data-testid="cell-wrap"][data-cell="${id}"]`).click();
});

Then("the cell {string} has kind {string}", async ({ page }, id: string, kind: string) => {
  await expect(page.locator(`[data-testid="cell"][data-cell="${id}"]`)).toHaveAttribute("data-kind", kind);
});

Then(
  "the cell {string} is placed at x {int} y {int} w {int} h {int}",
  async ({ page }, id: string, x: number, y: number, w: number, h: number) => {
    const item = gridItem(page, id);
    await expect(item).toHaveAttribute("data-x", String(x));
    await expect(item).toHaveAttribute("data-y", String(y));
    await expect(item).toHaveAttribute("data-w", String(w));
    await expect(item).toHaveAttribute("data-h", String(h));
  },
);

When("I select the tab {string}", async ({ page }, name: string) => {
  await page.locator(".flexlayout__tab_button", { hasText: name }).click();
});

/* ---------------------------- edit session ---------------------------- */

Then("there are at least {int} pending change(s)", async ({ page }, count: number) => {
  await expect
    .poll(async () => Number((await page.getByTestId("pending-changes").textContent())?.split(" ")[0]))
    .toBeGreaterThanOrEqual(count);
});

Then("the page mode is {string}", async ({ page }, mode: string) => {
  await expect(page.getByTestId("page-mode")).toHaveText(mode);
});

Then("there are no drag handles", async ({ page }) => {
  await expect(page.getByTestId("grid")).toBeVisible();
  await expect(page.getByTestId("grid-handle")).toHaveCount(0);
});

When("I edit the page", async ({ page }) => {
  await page.getByTestId("page-edit").click();
  await expect(page.getByTestId("page-mode")).toHaveText("editing");
});

When("I save the page", async ({ page }) => {
  await page.getByTestId("page-save").click();
  await expect(page.getByTestId("page-mode")).toHaveText("view");
});

When("I cancel the page edit", async ({ page }) => {
  await page.getByTestId("page-cancel").click();
  await expect(page.getByTestId("page-mode")).toHaveText("view");
});

/**
 * The host's save seam: every commit (a placed widget, a saved session) is
 * handed to the host's `save`, which this demo counts at `saved` in the
 * page's state — where a real host would write the pages.
 */
Then("the host has been asked to save the page {int} time(s)", async ({ page }, count: number) => {
  await expect.poll(async () => page.getByTestId("state-editor").inputValue()).toContain(`"saved": ${count}`);
});

When("I drag the cell {string} onto the cell {string}", async ({ page }, from: string, to: string) => {
  await dragBetween(
    page,
    gridItem(page, from).getByTestId("grid-handle"),
    gridItem(page, to).getByTestId("grid-handle"),
  );
});

When("I widen the cell {string} by {int} column(s)", async ({ page }, id: string, columns: number) => {
  const item = gridItem(page, id);
  await item.scrollIntoViewIfNeeded();
  const box = await settledBox(item);
  const w = Number(await item.getAttribute("data-w"));
  if (!w) throw new Error(`grid item ${id} has no data-w`);
  // One column + gutter in px: item width = w*col + (w-1)*margin, margin 10.
  const unit = (box.width + 10) / w;
  // react-grid-layout's own resize handle — the one class name the grid steps know.
  const hb = await settledBox(item.locator(".react-resizable-handle"));
  const startX = hb.x + hb.width / 2;
  const startY = hb.y + hb.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Land well past the rounding boundary of the target column.
  await page.mouse.move(startX + (columns + 0.4) * unit, startY, { steps: 12 });
  await page.mouse.up();
});

/* ---- css grid (doc/css-grid-design.md): a grid of slots, the picture drawn by drag or filled from the slot table ---- */

/** The page's OWN grid (a card on css-grid has one of its own); DOM rows and columns count from 0, scenarios from 1. */
const ownGrid = (page: Page) => live(page).locator(`xpath=.//*[@data-testid="css-grid" ${OWN}]`);
const gridCell = (page: Page, id: string) => live(page).locator(`[data-testid="css-grid-item"][data-cell="${id}"]`);
const ghost = (page: Page, row: number, column: number) =>
  ownGrid(page).locator(`[data-testid="css-grid-ghost"][data-row="${row - 1}"][data-column="${column - 1}"]`);
const slot = (page: Page, row: number, column: number) =>
  live(page).locator(`[data-testid="css-grid-slot"][data-row="${row - 1}"][data-column="${column - 1}"]`);
const track = (page: Page, testId: string, attribute: string, index: number) =>
  live(page).locator(`[data-testid="${testId}"][${attribute}="${index - 1}"]`);

Then("the grid has {int} row(s) and {int} column(s)", async ({ page }, rows: number, columns: number) => {
  await expect(ownGrid(page)).toHaveAttribute("data-rows", String(rows));
  await expect(ownGrid(page)).toHaveAttribute("data-columns", String(columns));
});

Then("the grid columns are sized {string}", async ({ page }, sizes: string) => {
  await expect(ownGrid(page)).toHaveAttribute("data-column-sizes", sizes);
});

Then("the grid rows are sized {string}", async ({ page }, sizes: string) => {
  await expect(ownGrid(page)).toHaveAttribute("data-row-sizes", sizes);
});

/** The rectangle of slots a cell fills, "rowStart-columnStart/rowEnd-columnEnd" counted from 1: "1-1/1-2". */
Then("the cell {string} fills the slots {string}", async ({ page }, id: string, span: string) => {
  await expect(gridCell(page, id)).toHaveAttribute("data-area", span);
});

Then("there are no slot selects", async ({ page }) => {
  await expect(ownGrid(page)).toBeVisible();
  await expect(page.getByTestId("css-grid-slot")).toHaveCount(0);
});

/** Drag by the handle bar's label (where a hand lands) until the pointer is over the slot; the trailing "+" slots grow the grid. */
When(
  "I drag the cell {string} to the slot row {int} column {int}",
  async ({ page }, id: string, row: number, column: number) => {
    await dragOnto(page, gridCell(page, id).getByTestId("css-grid-handle-label"), ghost(page, row, column));
  },
);

/** Drag the resize corner onto the slot that becomes the cell's bottom-right. */
When(
  "I resize the cell {string} to the slot row {int} column {int}",
  async ({ page }, id: string, row: number, column: number) => {
    await dragOnto(page, gridCell(page, id).getByTestId("css-grid-resize"), ghost(page, row, column));
  },
);

Then("the drop is refused because the slot holds {string}", async ({ page }, id: string) => {
  await expect(page.getByTestId("css-grid-refusal")).toContainText(`holds "${id}"`);
});

/** The slot table: "empty" or a cell id. */
When(
  "I put {string} into the slot row {int} column {int}",
  async ({ page }, id: string, row: number, column: number) => {
    await slot(page, row, column).selectOption(id === "empty" ? "" : id);
  },
);

Then(
  "the slot row {int} column {int} offers {string}",
  async ({ page }, row: number, column: number, options: string) => {
    await expect(slot(page, row, column).locator("option")).toHaveText(options.split(", "));
  },
);

Then("the slot row {int} column {int} is marked invalid", async ({ page }, row: number, column: number) => {
  await expect(slot(page, row, column)).toHaveAttribute("aria-invalid", "true");
});

Then("the row {int} is empty", async ({ page }, row: number) => {
  const selects = live(page).locator(`[data-testid="css-grid-slot"][data-row="${row - 1}"]`);
  await expect(selects.first()).toBeVisible();
  for (const select of await selects.all()) await expect(select).toHaveValue("");
});

When("I add a column", async ({ page }) => {
  await page.getByTestId("css-grid-add-column").click();
});

When("I add a row", async ({ page }) => {
  await page.getByTestId("css-grid-add-row").click();
});

When("I remove row {int}", async ({ page }, row: number) => {
  await track(page, "css-grid-remove-row", "data-row", row).click();
});

Then("the row {int} cannot be removed", async ({ page }, row: number) => {
  const button = track(page, "css-grid-remove-row", "data-row", row);
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("title", /no other slot/);
});

/** The typed track field: the unit first (it commits with the number shown), then the number, Enter commits. */
When("I set column {int} to {int} {string}", async ({ page }, column: number, size: number, unit: string) => {
  const field = track(page, "css-grid-column", "data-column", column);
  await field.getByTestId("css-grid-column-unit").selectOption(unit);
  await field.getByTestId("css-grid-column-number").fill(String(size));
  await field.getByTestId("css-grid-column-number").press("Enter");
});

/** A row sized by a keyword (auto, min-content, max-content). */
When("I set row {int} to {string}", async ({ page }, row: number, keyword: string) => {
  await track(page, "css-grid-row-size", "data-row", row).getByTestId("css-grid-row-size-unit").selectOption(keyword);
});
