/** Page layout: the engine and view in use, cells and their placement, the edit session (drag, resize, save, cancel). */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { dragBetween, gridItem, settledBox } from "../support/grid";
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
