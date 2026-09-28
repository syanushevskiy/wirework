/** Page layout: the engine and view in use, cells and their placement, the edit session (drag, resize, save, cancel). */
import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { dragBetween, gridItem, settledBox } from "../support/grid";
import { cell } from "../support/page";

const { When, Then } = createBdd();

Then("the page layout uses the {string} engine", async ({ page }, engine: string) => {
  await expect(page.getByTestId("page")).toHaveAttribute("data-engine", engine);
});

Then("the page uses the {string} view", async ({ page }, view: string) => {
  await expect(page.getByTestId("page")).toHaveAttribute("data-view", view);
});

Then("the page has {int} rows", async ({ page }, count: number) => {
  await expect(page.getByTestId("row")).toHaveCount(count);
});

Then("row {int} has {int} cells", async ({ page }, row: number, count: number) => {
  const cells = page
    .getByTestId("row")
    .nth(row - 1)
    .locator('[data-testid="cell"], [data-testid="cell-problem"]');
  await expect(cells).toHaveCount(count);
});

Then("the page has {int} cell(s)", async ({ page }, count: number) => {
  // The page must exist: a count of 0 must never pass because nothing rendered.
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByTestId("page").locator('[data-testid="cell"], [data-testid="cell-problem"]')).toHaveCount(
    count,
  );
});

Then("I see a widget {string}", async ({ page }, widget: string) => {
  await expect(page.locator(`[data-testid="cell"][data-widget="${widget}"]`).first()).toBeVisible();
});

/** One cell's text — for pages that hold several widgets of a kind. */
Then("the cell {string} reads {string}", async ({ page }, id: string, text: string) => {
  await expect(cell(page, id)).toHaveText(text);
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
