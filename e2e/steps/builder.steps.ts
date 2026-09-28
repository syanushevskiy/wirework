/** The widget builder and editor: the palette, the form (ports, settings, reactions, action parameters), Add, the edit target and its locks. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { paramFieldId, portFieldId, reactionFieldId, settingFieldId } from "@wirework/antd-builder/ids";
import { chooseOption, dropdown, isSelect, option } from "../support/antd";
import { cell, live } from "../support/page";

const { When, Then } = createBdd();

/* ------------------------------ palette ------------------------------ */

const paletteSearch = (page: Page) => page.getByTestId("widget-search").getByRole("combobox");

const widgetCard = (page: Page, widget: string) => page.locator(`[data-testid="widget-card"][data-widget="${widget}"]`);

/**
 * The widget catalog is a picker: the cards exist only while the search is
 * focused or holds a query. Focus it, then dismiss the suggestion popup —
 * it would cover the cards underneath.
 */
async function openPalette(page: Page) {
  if ((await page.getByTestId("widget-palette").getAttribute("data-state")) === "open") return;
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
  const card = widgetCard(page, widget);
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

/** The whole list with one click — nothing typed into the search. */
When("I show the widget list", async ({ page }) => {
  await page.getByTestId("widget-browse").click();
  await expect(page.getByTestId("widget-palette")).toHaveAttribute("data-state", "open");
});

When("I hide the widget list", async ({ page }) => {
  await page.getByTestId("widget-browse").click();
  await expect(page.getByTestId("widget-palette")).toHaveAttribute("data-state", "closed");
});

/** A card of the list that is already showing: the search box is never touched. */
When("I pick the widget card {string}", async ({ page }, widget: string) => {
  const card = widgetCard(page, widget);
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
});

Then("the widget search is empty", async ({ page }) => {
  await expect(paletteSearch(page)).toHaveValue("");
});

Then("the widget search holds {string}", async ({ page }, query: string) => {
  await expect(paletteSearch(page)).toHaveValue(query);
});

Then("the widget list button reads {string}", async ({ page }, label: string) => {
  await expect(page.getByTestId("widget-browse")).toHaveText(label);
});

Then("the widget catalog is hidden", async ({ page }) => {
  await expect(page.getByTestId("widget-palette")).toHaveAttribute("data-state", "closed");
  await expect(page.getByTestId("widget-card")).toHaveCount(0);
});

Then("the palette reports no matches", async ({ page }) => {
  await expect(page.getByTestId("widget-palette-empty")).toBeVisible();
});

const previews = (page: Page) => page.getByTestId("widget-card").getByTestId("widget-preview");

Then("the palette shows {int} widget preview(s)", async ({ page }, count: number) => {
  await expect(previews(page)).toHaveCount(count);
});

/**
 * Compares against what the app says it registered, so adding a widget
 * does not break unrelated scenarios (team-tiger review, Katya and Sasha).
 */
Then("the palette shows a preview of every registered widget", async ({ page }) => {
  const registered = Number(await page.getByTestId("widget-palette").getAttribute("data-registered"));
  expect(registered).toBeGreaterThan(0);
  await expect(previews(page)).toHaveCount(registered);
});

Then("the preview of {string} reads {string}", async ({ page }, widget: string, text: string) => {
  await expect(page.locator(`[data-testid="widget-preview"][data-widget="${widget}"]`)).toContainText(text);
});

/* ------------------------------- ports ------------------------------- */

/** The id of a port's field — only input ports exist, and a scenario naming another kind is wrong. */
function portField(section: string, port: string): string {
  if (section !== "input") throw new Error(`only input ports exist (got "${section}")`);
  return portFieldId(port);
}

/** The port field's text box (an autocomplete: the test id is on its wrapper). */
const portInput = (page: Page, section: string, port: string) =>
  page.getByTestId(portField(section, port)).getByRole("combobox");

When("I set the {string} port {string} to {string}", async ({ page }, section: string, port: string, path: string) => {
  // Input ports use the autocomplete: type the path, then take the
  // matching suggestion — or keep what was typed, since a path may name
  // state that does not exist yet.
  const query = portInput(page, section, port);
  await query.click();
  await query.fill(path);
  const exact = option(page, path);
  if ((await exact.count()) > 0) {
    await exact.click();
  } else {
    await query.blur();
  }
});

/** What an input port's field holds — a suggested path before anybody typed. */
Then("the {string} port {string} holds {string}", async ({ page }, section: string, port: string, path: string) => {
  await expect(portInput(page, section, port)).toHaveValue(path);
});

/** The field still shows the builder's own proposal, and says so. */
Then("the {string} port {string} is marked as suggested", async ({ page }, section: string, port: string) => {
  await expect(page.getByTestId(`${portField(section, port)}-suggested`)).toBeVisible();
});

Then("the {string} port {string} is not marked as suggested", async ({ page }, section: string, port: string) => {
  await expect(page.getByTestId(`${portField(section, port)}-suggested`)).toHaveCount(0);
});

When("I clear the {string} port {string}", async ({ page }, section: string, port: string) => {
  const query = portInput(page, section, port);
  await query.fill("");
  await query.blur();
});

When("I open the {string} port {string} suggestions", async ({ page }, section: string, port: string) => {
  await portInput(page, section, port).click();
});

Then("the path suggestions include {string}", async ({ page }, path: string) => {
  await expect(option(page, path)).toHaveCount(1);
});

Then("the path suggestions do not include {string}", async ({ page }, path: string) => {
  await expect(dropdown(page)).toBeVisible();
  await expect(option(page, path)).toHaveCount(0);
});

/* -------------------------------- add -------------------------------- */

When("I add the widget", async ({ page }) => {
  await page.getByTestId("add-widget").click();
});

Then("the add widget button is disabled", async ({ page }) => {
  await expect(page.getByTestId("add-widget")).toBeDisabled();
});

Then("the add widget button is enabled", async ({ page }) => {
  await expect(page.getByTestId("add-widget")).toBeEnabled();
});

Then("adding widgets waits for the page edit to end", async ({ page }) => {
  await expect(page.getByTestId("add-widget")).toBeDisabled();
  await expect(page.getByTestId("add-widget-locked")).toContainText("page edit");
});

Then("adding widgets waits for the user overlay to be turned off", async ({ page }) => {
  await expect(page.getByTestId("add-widget")).toBeDisabled();
  await expect(page.getByTestId("add-widget-locked")).toContainText("turn the user overlay off");
});

/* ------------------------------ settings ------------------------------ */

When("I set the setting {string} to {string}", async ({ page }, name: string, value: string) => {
  const control = page.getByTestId(settingFieldId(name));
  if (await isSelect(control)) {
    // Enum settings are selects.
    await chooseOption(page, settingFieldId(name), value);
  } else {
    await control.fill(value);
  }
});

Then("the builder shows a setting {string}", async ({ page }, name: string) => {
  await expect(page.getByTestId(settingFieldId(name))).toBeVisible();
});

/* ----------------------------- reactions ----------------------------- */

/** Only the path: the payload field stays whatever the builder defaulted it to. */
When("I set the reaction for {string} to set {string}", async ({ page }, event: string, path: string) => {
  await page.getByTestId(reactionFieldId(event, "set")).fill(path);
});

When(
  "I set the reaction for {string} to set {string} from {string}",
  async ({ page }, event: string, path: string, from: string) => {
    await page.getByTestId(reactionFieldId(event, "set")).fill(path);
    const fromControl = page.getByTestId(reactionFieldId(event, "from"));
    if (await isSelect(fromControl)) {
      // Object payloads offer their fields; "" means the whole payload.
      await chooseOption(page, reactionFieldId(event, "from"), from === "" ? "whole payload" : from);
    } else {
      await fromControl.fill(from);
    }
  },
);

When("I set the reaction for {string} to call {string}", async ({ page }, event: string, action: string) => {
  await chooseOption(page, reactionFieldId(event, "kind"), "call action");
  await chooseOption(page, reactionFieldId(event, "call"), action, "prefix");
});

Then("the reaction for {string} takes {string} from the payload", async ({ page }, event: string, from: string) => {
  await expect(page.getByTestId(reactionFieldId(event, "from"))).toHaveText(from);
});

Then("the reaction for {string} keeps {int} more reaction(s)", async ({ page }, event: string, count: number) => {
  await expect(page.getByTestId(reactionFieldId(event, "kept"))).toContainText(`then ${count} more reaction`);
});

Then("the widget events list includes {string}", async ({ page }, name: string) => {
  await expect(page.locator(`[data-testid="widget-event"][data-event="${name}"]`)).toBeVisible();
});

Then("the widget emits no events", async ({ page }) => {
  await expect(page.getByTestId("widget-events-empty")).toBeVisible();
  await expect(page.getByTestId("widget-event")).toHaveCount(0);
});

/* -------------------------- action parameters -------------------------- */

/** One declared parameter of the action an event's reaction calls (text, number or JSON). */
When(
  "I set the action parameter {string} for {string} to {string}",
  async ({ page }, param: string, event: string, value: string) => {
    await page.getByTestId(paramFieldId(event, param)).fill(value);
  },
);

/**
 * A yes/no parameter is a checkbox with THREE answers: every click moves it
 * on — not set (the action decides) -> yes -> no -> not set.
 */
When("I click the action parameter {string} for {string}", async ({ page }, param: string, event: string) => {
  await page.getByTestId(paramFieldId(event, param)).click();
});

/** "unset", "yes" or "no". */
Then(
  "the action parameter {string} for {string} is {string}",
  async ({ page }, param: string, event: string, state: string) => {
    await expect(page.getByTestId(paramFieldId(event, param))).toHaveAttribute("data-state", state);
  },
);

Then("the action parameters for {string} include {string}", async ({ page }, event: string, params: string) => {
  for (const param of params.split(", ")) {
    await expect(page.getByTestId(paramFieldId(event, param))).toBeVisible();
  }
});

Then("the reaction for {string} asks for no action parameters", async ({ page }, event: string) => {
  await expect(page.getByTestId(reactionFieldId(event, "params"))).toHaveCount(0);
});

Then(
  "the action parameter {string} for {string} holds {string}",
  async ({ page }, param: string, event: string, value: string) => {
    await expect(page.getByTestId(paramFieldId(event, param))).toHaveValue(value);
  },
);

/* --------------------------- editing / target --------------------------- */

Then("the edit target is {string}", async ({ page }, target: string) => {
  await expect(page.getByTestId("edit-target")).toHaveText(`edits → ${target}`);
});

When("I edit the cell {string}", async ({ page }, id: string) => {
  // The Edit action lives in the cell's edit-mode chrome, placed by the engine.
  await page.locator(`[data-testid="cell-edit"][data-cell="${id}"]`).click();
  await expect(page.getByTestId("widget-editor")).toHaveAttribute("data-cell", id);
});

Then("the cell {string} has no edit chrome", async ({ page }, id: string) => {
  // A mistyped cell id has no chrome either: the cell must exist.
  await expect(cell(page, id)).toBeVisible();
  await expect(page.locator(`[data-testid="cell-edit"][data-cell="${id}"]`)).toHaveCount(0);
});

Then("the widget editor keeps inputs and reactions read-only", async ({ page }) => {
  await expect(page.getByTestId("bindings-locked")).toBeVisible();
  await expect(
    page.locator('[data-testid^="reaction-"][data-testid$="-kind"]').first().getByRole("combobox"),
  ).toBeDisabled();
});

When("I save the widget", async ({ page }) => {
  await page.getByTestId("widget-save").click();
  await expect(page.getByTestId("widget-editor")).toHaveCount(0);
});

When("I remove the cell {string}", async ({ page }, id: string) => {
  await page.locator(`[data-testid="cell-remove"][data-cell="${id}"]`).click();
});

Then("the widget editor is closed", async ({ page }) => {
  await expect(page.getByTestId("widget-editor")).toHaveCount(0);
});

/* --------------------------- layout engines --------------------------- */

When("I select the {string} layout engine", async ({ page }, engine: string) => {
  await chooseOption(page, "engine-select", engine);
  await expect(page.getByTestId("page")).toHaveAttribute("data-engine", engine);
});

Then("the engine is locked as {string}", async ({ page }, engine: string) => {
  await expect(page.getByTestId("engine-select")).toHaveCount(0);
  await expect(page.getByTestId("engine")).toHaveText(engine);
});

Then("no widget has crashed", async ({ page }) => {
  // A page that never rendered has no crashed widgets either.
  await expect(live(page).getByTestId("cell").first()).toBeVisible();
  await expect(live(page).getByTestId("widget-error")).toHaveCount(0);
});
