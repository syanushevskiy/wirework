import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

/* ---------------------------- navigation ---------------------------- */

Given("I open the {string} page", async ({ page }, name: string) => {
  await page.goto("/");
  await page.getByTestId(`nav-${name}`).click();
});

When("I disable the user overlay", async ({ page }) => {
  await page.getByTestId("toggle-user-overlay").uncheck();
});

/* ------------------------------ builder ------------------------------ */

/**
 * The LIVE page only: the builder palette renders real widget instances as
 * previews, so widget test ids must be looked up inside the page view.
 */
const live = (page: Page) => page.getByTestId("page");

/* ------------------------- antd form controls ------------------------- */

/**
 * The open antd dropdown (a Select or an AutoComplete popup). Excludes one
 * that is animating out: closing and opening overlap, and both are briefly
 * "not hidden".
 */
const dropdown = (page: Page) =>
  page.locator(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden):not(.ant-slide-up-leave):not(.ant-slide-up-leave-active)",
  );

/**
 * An option in the open dropdown. antd puts the label in `title`, so an
 * exact match is a title match; `prefix` covers labels that carry a
 * trailing description ("reset-counter — Set demo.counter back to 0").
 */
const option = (page: Page, label: string, match: "exact" | "prefix" = "exact") =>
  dropdown(page).locator(
    match === "exact"
      ? `.ant-select-item-option[title="${label}"]`
      : `.ant-select-item-option[title^="${label}"]`,
  );

/** Open an antd Select by its test id and pick one option. */
async function chooseOption(page: Page, testId: string, label: string, match: "exact" | "prefix" = "exact") {
  await page.getByTestId(testId).click();
  await option(page, label, match).click();
}

/** antd Select roots carry the class; a plain field is an `input` element. */
const isSelect = (control: ReturnType<Page["locator"]>) =>
  control.evaluate((element) => element.classList.contains("ant-select"));

const paletteSearch = (page: Page) => page.getByTestId("widget-search").locator("input");

/**
 * The widget catalog is a picker: the cards exist only while the search is
 * focused or holds a query. Focus it, then dismiss the suggestion popup —
 * it would cover the cards underneath.
 */
async function openPalette(page: Page) {
  if (await page.getByTestId("widget-palette").getAttribute("data-state") === "open") return;
  await paletteSearch(page).click();
  await paletteSearch(page).press("Escape");
  await expect(page.getByTestId("widget-palette")).toHaveAttribute("data-state", "open");
}

When("I open the widget palette", async ({ page }) => {
  await openPalette(page);
});

When("I choose the {string} widget", async ({ page }, widget: string) => {
  await openPalette(page);
  // The palette: one card (a button with a live preview) per widget.
  const card = page.locator(`[data-testid="widget-card"][data-widget="${widget}"]`);
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
});

When("I search the palette for {string}", async ({ page }, query: string) => {
  const search = paletteSearch(page);
  await search.click();
  await search.fill(query);
  await search.press("Escape");
});

When("I pick the widget suggestion {string}", async ({ page }, widget: string) => {
  const search = paletteSearch(page);
  await search.click();
  await search.fill(widget.slice(0, 6));
  await option(page, widget).click();
});

Then("the widget catalog is hidden", async ({ page }) => {
  await expect(page.getByTestId("widget-palette")).toHaveAttribute("data-state", "closed");
  await expect(page.locator('[data-testid="widget-card"]')).toHaveCount(0);
});

Then("the palette reports no matches", async ({ page }) => {
  await expect(page.getByTestId("widget-palette-empty")).toBeVisible();
});

Then("the palette shows {int} widget previews", async ({ page }, count: number) => {
  await expect(page.locator('[data-testid="widget-card"] [data-testid="widget-preview"]')).toHaveCount(count);
});

Then("the preview of {string} reads {string}", async ({ page }, widget: string, text: string) => {
  await expect(page.locator(`[data-testid="widget-preview"][data-widget="${widget}"]`)).toContainText(text);
});

When(
  "I set the {string} port {string} to {string}",
  async ({ page }, section: string, port: string, path: string) => {
    if (section !== "input") throw new Error(`only input ports exist (got "${section}")`);
    // Input ports use the autocomplete: type the path, then take the
    // matching suggestion — or keep what was typed, since a path may name
    // state that does not exist yet.
    const field = page.getByTestId(`port-${section}-${port}`);
    await field.click();
    const query = field.locator("input");
    await query.fill(path);
    const exact = option(page, path);
    if ((await exact.count()) > 0) {
      await exact.click();
    } else {
      await query.blur();
    }
  },
);

When(
  "I open the {string} port {string} suggestions",
  async ({ page }, section: string, port: string) => {
    await page.getByTestId(`port-${section}-${port}`).click();
  },
);

Then("the path suggestions include {string}", async ({ page }, path: string) => {
  await expect(option(page, path)).toHaveCount(1);
});

Then(
  "the path suggestions do not include {string}",
  async ({ page }, path: string) => {
    await expect(dropdown(page)).toBeVisible();
    await expect(option(page, path)).toHaveCount(0);
  },
);

When("I add the widget", async ({ page }) => {
  await page.getByTestId("add-widget").click();
});

Then("the add widget button is disabled", async ({ page }) => {
  await expect(page.getByTestId("add-widget")).toBeDisabled();
});

Then("the add widget button is enabled", async ({ page }) => {
  await expect(page.getByTestId("add-widget")).toBeEnabled();
});

/* ------------------------------ layout ------------------------------ */

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

Then("I see a widget {string}", async ({ page }, widget: string) => {
  await expect(
    page.locator(`[data-testid="cell"][data-widget="${widget}"]`).first(),
  ).toBeVisible();
});

/* ------------------------------ binding ------------------------------ */

Then(
  "the echo widget at {string} shows {string}",
  async ({ page }, path: string, value: string) => {
    const echo = page
      .locator(`[data-testid="page"] [data-testid="antd-echo"][data-path="${path}"]`)
      .getByTestId("antd-echo-value");
    await expect(echo).toHaveText(value);
  },
);

When("I click the counter {int} times", async ({ page }, times: number) => {
  const counter = live(page).getByTestId("antd-counter");
  for (let i = 0; i < times; i += 1) {
    await counter.click();
  }
});

Then("the runs table has {int} rows", async ({ page }, count: number) => {
  await expect(live(page).getByTestId("runs-row")).toHaveCount(count);
});

Then(
  "the runs table row {string} shows {string} for {string}",
  async ({ page }, runId: string, value: string, property: string) => {
    const cell = page
      .locator(`[data-testid="page"] [data-testid="runs-row"][data-run-id="${runId}"]`)
      .locator(`td[data-property="${property}"]`);
    await expect(cell).toHaveText(value);
  },
);

Then("the runs table is not loading", async ({ page }) => {
  await expect(live(page).getByTestId("antd-runs-table")).toHaveAttribute("data-loading", "false");
});

When("I go to page {int} of the pagination", async ({ page }, number: number) => {
  // antd titles every page item with its number.
  await live(page).getByTestId("antd-pagination").locator(`li.ant-pagination-item[title="${number}"]`).click();
});

Then("the pagination shows page {int}", async ({ page }, number: number) => {
  await expect(live(page).getByTestId("antd-pagination")).toHaveAttribute("data-page", String(number));
});

/* ------------------------------ overlay ------------------------------ */

Then("the label reads {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("antd-label").first()).toHaveText(text);
});

Then("the status badge reads {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("status-badge")).toHaveText(text);
});

Then("the cell {string} has kind {string}", async ({ page }, cell: string, kind: string) => {
  await expect(page.locator(`[data-testid="cell"][data-cell="${cell}"]`)).toHaveAttribute("data-kind", kind);
});

Then("the label tone is {string}", async ({ page }, tone: string) => {
  await expect(live(page).getByTestId("antd-label").first()).toHaveAttribute("data-tone", tone);
});

/* --------------------------- state inspector --------------------------- */

async function editStateJson(page: Page, path: string, value: unknown): Promise<void> {
  const editor = page.getByTestId("state-editor");
  const state = JSON.parse(await editor.inputValue()) as Record<string, unknown>;
  const segments = path.split(".");
  let cursor: Record<string, unknown> = state;
  for (const segment of segments.slice(0, -1)) {
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]!] = value;
  await editor.fill(JSON.stringify(state, null, 2));
  await page.getByTestId("state-apply").click();
}

Then("the state JSON contains {string}", async ({ page }, fragment: string) => {
  await expect
    .poll(async () => page.getByTestId("state-editor").inputValue())
    .toContain(fragment);
});

Then("the state JSON does not contain {string}", async ({ page }, fragment: string) => {
  await expect
    .poll(async () => page.getByTestId("state-editor").inputValue())
    .not.toContain(fragment);
});

When(
  "I edit the state JSON setting {string} to {int}",
  async ({ page }, path: string, value: number) => {
    await editStateJson(page, path, value);
  },
);

When(
  "I edit the state JSON setting {string} to {string}",
  async ({ page }, path: string, value: string) => {
    await editStateJson(page, path, value);
  },
);

When("I replace the state JSON with {string}", async ({ page }, text: string) => {
  await page.getByTestId("state-editor").fill(text);
  await page.getByTestId("state-apply").click();
});

Then("the state error is shown", async ({ page }) => {
  await expect(page.getByTestId("state-error")).toBeVisible();
});

/* ------------------------------ failures ------------------------------ */

Then(
  "all {int} broken widget definitions were rejected",
  async ({ page }, count: number) => {
    const rejected = page
      .getByTestId("registration-report")
      .locator('li[data-rejected="true"]');
    await expect(rejected).toHaveCount(count);
  },
);

/* ------------------------------ events ------------------------------ */

function eventRows(page: Page, widget: string, event: string) {
  return page.locator(
    `[data-testid="event-log-row"][data-widget="${widget}"][data-event="${event}"]`,
  );
}

Then("the event log is empty", async ({ page }) => {
  await expect(page.getByTestId("event-log-row")).toHaveCount(0);
});

Then("the event log has {int} entries", async ({ page }, count: number) => {
  await expect(page.getByTestId("event-log-row")).toHaveCount(count);
});

Then(
  "the event log shows widget {string} event {string} with payload {string}",
  async ({ page }, widget: string, event: string, payload: string) => {
    // Newest first: the most recent emit of this event carries the payload.
    await expect(
      eventRows(page, widget, event).first().getByTestId("event-log-payload"),
    ).toHaveText(payload);
  },
);

Then(
  "the event log shows widget {string} event {string} from cell {string}",
  async ({ page }, widget: string, event: string, cell: string) => {
    await expect(eventRows(page, widget, event).first()).toHaveAttribute("data-cell", cell);
  },
);

When("I clear the event log", async ({ page }) => {
  await page.getByTestId("event-log-clear").click();
});

When("I click the runs table row {string}", async ({ page }, runId: string) => {
  await page.locator(`[data-testid="page"] [data-testid="runs-row"][data-run-id="${runId}"]`).click();
});

When(
  "I click the counter in cell {string} {int} times",
  async ({ page }, cell: string, times: number) => {
    const counter = page
      .locator(`[data-testid="cell"][data-cell="${cell}"]`)
      .getByTestId("antd-counter");
    for (let i = 0; i < times; i += 1) {
      await counter.click();
    }
  },
);

Then("the widget events list includes {string}", async ({ page }, name: string) => {
  await expect(
    page.locator(`[data-testid="widget-event"][data-event="${name}"]`),
  ).toBeVisible();
});

Then("the widget emits no events", async ({ page }) => {
  await expect(page.getByTestId("widget-events-empty")).toBeVisible();
  await expect(page.getByTestId("widget-event")).toHaveCount(0);
});

/* --------------------------- layout engines --------------------------- */

const gridItem = (page: Page, cell: string) =>
  page.locator(`[data-testid="grid-item"][data-cell="${cell}"]`);

type Box = NonNullable<Awaited<ReturnType<ReturnType<Page["locator"]>["boundingBox"]>>>;

/**
 * Bounding box once it has stopped changing: react-grid-layout animates
 * position/size for 200ms, and measuring mid-transition grabs thin air.
 */
async function settledBox(page: Page, locator: ReturnType<Page["locator"]>): Promise<Box> {
  let previous = await locator.boundingBox();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(120);
    const current = await locator.boundingBox();
    if (
      previous &&
      current &&
      previous.x === current.x &&
      previous.y === current.y &&
      previous.width === current.width &&
      previous.height === current.height
    ) {
      return current;
    }
    previous = current;
  }
  throw new Error("element never settled");
}

/**
 * Grab `from` at its centre and drop so that its TOP-LEFT lands on the
 * top-left of `to` (the grab offset is preserved), whatever their sizes.
 */
async function dragBetween(page: Page, from: ReturnType<Page["locator"]>, to: ReturnType<Page["locator"]>) {
  // Bounding boxes are viewport-relative and the palette sits above the
  // grid: bring the grid on screen or the pointer lands outside the window.
  await page.getByTestId("page").scrollIntoViewIfNeeded();
  await from.scrollIntoViewIfNeeded();
  const a = await settledBox(page, from);
  const b = await settledBox(page, to);
  const grabX = a.width / 2;
  const grabY = a.height / 2;
  await page.mouse.move(a.x + grabX, a.y + grabY);
  await page.mouse.down();
  await page.mouse.move(b.x + grabX, b.y + grabY, { steps: 12 });
  await page.mouse.up();
}

Then("the page has {int} cells", async ({ page }, count: number) => {
  // The page must exist: a count of 0 must never pass because nothing rendered.
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(
    page.getByTestId("page").locator('[data-testid="cell"], [data-testid="cell-problem"]'),
  ).toHaveCount(count);
});

Then(
  "the cell {string} is placed at x {int} y {int} w {int} h {int}",
  async ({ page }, cell: string, x: number, y: number, w: number, h: number) => {
    const item = gridItem(page, cell);
    await expect(item).toHaveAttribute("data-x", String(x));
    await expect(item).toHaveAttribute("data-y", String(y));
    await expect(item).toHaveAttribute("data-w", String(w));
    await expect(item).toHaveAttribute("data-h", String(h));
  },
);

When("I select the {string} layout engine", async ({ page }, engine: string) => {
  await chooseOption(page, "engine-select", engine);
  await expect(page.getByTestId("page")).toHaveAttribute("data-engine", engine);
});

Then("the engine is locked as {string}", async ({ page }, engine: string) => {
  await expect(page.getByTestId("engine-select")).toHaveCount(0);
  await expect(page.getByTestId("engine")).toHaveText(engine);
});

When("I select the tab {string}", async ({ page }, name: string) => {
  await page.locator(".flexlayout__tab_button", { hasText: name }).click();
});

Then("there are at least {int} pending changes", async ({ page }, count: number) => {
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

When(
  "I drag the cell {string} onto the cell {string}",
  async ({ page }, from: string, to: string) => {
    await dragBetween(
      page,
      gridItem(page, from).getByTestId("grid-handle"),
      gridItem(page, to).getByTestId("grid-handle"),
    );
  },
);

When(
  "I widen the cell {string} by {int} columns",
  async ({ page }, cell: string, columns: number) => {
    const item = gridItem(page, cell);
    await item.scrollIntoViewIfNeeded();
    const box = await settledBox(page, item);
    const w = Number(await item.getAttribute("data-w"));
    if (!w) throw new Error(`grid item ${cell} has no data-w`);
    // One column + gutter in px: item width = w*col + (w-1)*margin, margin 10.
    const unit = (box.width + 10) / w;
    const hb = await settledBox(page, item.locator(".react-resizable-handle"));
    const startX = hb.x + hb.width / 2;
    const startY = hb.y + hb.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Land well past the rounding boundary of the target column.
    await page.mouse.move(startX + (columns + 0.4) * unit, startY, { steps: 12 });
    await page.mouse.up();
  },
);

/* ----------------------------- reactions ----------------------------- */

When(
  "I set the reaction for {string} to set {string} from {string}",
  async ({ page }, event: string, path: string, from: string) => {
    await page.getByTestId(`reaction-${event}-set`).fill(path);
    const fromControl = page.getByTestId(`reaction-${event}-from`);
    if (await isSelect(fromControl)) {
      // Object payloads offer their fields; "" means the whole payload.
      await chooseOption(page, `reaction-${event}-from`, from === "" ? "whole payload" : from);
    } else {
      await fromControl.fill(from);
    }
  },
);

When(
  "I set the reaction for {string} to call {string}",
  async ({ page }, event: string, action: string) => {
    await chooseOption(page, `reaction-${event}-kind`, "call action");
    await chooseOption(page, `reaction-${event}-call`, action, "prefix");
  },
);

When("I click the button {string}", async ({ page }, label: string) => {
  await live(page).getByTestId("antd-button").filter({ hasText: label }).click();
});

Then(
  "the reaction for {string} takes {string} from the payload",
  async ({ page }, event: string, from: string) => {
    await expect(page.getByTestId(`reaction-${event}-from`)).toHaveText(from);
  },
);

Then("the counter shows {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("antd-counter")).toContainText(text);
});

Then("no widget has crashed", async ({ page }) => {
  await expect(live(page).getByTestId("widget-error")).toHaveCount(0);
});

/* ------------------------------- panels ------------------------------- */

When("I expand the {string} panel", async ({ page }, name: string) => {
  await page.getByTestId(`panel-${name}-toggle`).click();
  await expect(page.getByTestId(`panel-${name}`)).toHaveAttribute("data-state", "open");
});

Then("the {string} panel is collapsed", async ({ page }, name: string) => {
  await expect(page.getByTestId(`panel-${name}`)).toHaveAttribute("data-state", "closed");
});

/* ------------------------------ settings ------------------------------ */

When("I set the setting {string} to {string}", async ({ page }, name: string, value: string) => {
  const control = page.getByTestId(`setting-${name}`);
  if (await isSelect(control)) {
    // Enum settings are selects.
    await chooseOption(page, `setting-${name}`, value);
  } else {
    await control.fill(value);
  }
});

When("I type {string} into the input", async ({ page }, text: string) => {
  await live(page).getByTestId("antd-input").fill(text);
});

Then("the input is invalid with {string}", async ({ page }, message: string) => {
  await expect(live(page).getByTestId("antd-input")).toHaveAttribute("data-valid", "false");
  await expect(live(page).getByTestId("antd-input-message")).toHaveText(message);
});

Then("the input is valid", async ({ page }) => {
  await expect(live(page).getByTestId("antd-input")).toHaveAttribute("data-valid", "true");
  await expect(live(page).getByTestId("antd-input-message")).toHaveCount(0);
});

Then("the builder shows a setting {string}", async ({ page }, name: string) => {
  await expect(page.getByTestId(`setting-${name}`)).toBeVisible();
});

/* --------------------------- editing / target --------------------------- */

Then("the edit target is {string}", async ({ page }, target: string) => {
  await expect(page.getByTestId("edit-target")).toHaveText(`edits → ${target}`);
});

When("I edit the cell {string}", async ({ page }, cell: string) => {
  // The Edit action lives in the cell's edit-mode chrome, placed by the engine.
  await page.locator(`[data-testid="cell-edit"][data-cell="${cell}"]`).click();
  await expect(page.getByTestId("widget-editor")).toHaveAttribute("data-cell", cell);
});

Then("the cell {string} has no edit chrome", async ({ page }, cell: string) => {
  await expect(page.locator(`[data-testid="cell-edit"][data-cell="${cell}"]`)).toHaveCount(0);
});

When("I save the widget", async ({ page }) => {
  await page.getByTestId("widget-save").click();
  await expect(page.getByTestId("widget-editor")).toHaveCount(0);
});

When("I remove the cell {string}", async ({ page }, cell: string) => {
  await page.locator(`[data-testid="cell-remove"][data-cell="${cell}"]`).click();
});

Then("the widget editor is closed", async ({ page }) => {
  await expect(page.getByTestId("widget-editor")).toHaveCount(0);
});

Then("the boot validation status is {string}", async ({ page }, text: string) => {
  await expect(page.getByTestId("validation-status")).toHaveText(text);
});
