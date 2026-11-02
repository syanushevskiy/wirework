/** The widget builder and editor: the palette, the form (ports, settings, reactions, action parameters), Add, the edit target and its locks. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import {
  conditionFieldId,
  paramFieldId,
  portFieldId,
  reactionFieldId,
  settingFieldId,
} from "@wirework/antd-builder/ids";
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
  // Move on, as a user does: the catalog closes when the card loses the
  // focus, and it must close NOW — a click on the form below while it is
  // closing (between mouse down and up) lands where the control no longer is.
  await card.blur();
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

/**
 * An event has a LIST of reactions, run in order. "The reaction" is the
 * first row; "reaction 2" the next one (`reactionFieldId` counts from 0). A
 * controlled widget's event writes its port back BY DEFAULT — shown above
 * the rows, never a row itself — so its first row is what follows.
 */

async function setReactionPath(page: Page, event: string, path: string, from: string | undefined, index = 0) {
  await page.getByTestId(reactionFieldId(event, "set", index)).fill(path);
  if (from === undefined) return;
  const fromControl = page.getByTestId(reactionFieldId(event, "from", index));
  if (await isSelect(fromControl)) {
    // Object payloads offer their fields; "" means the whole payload.
    await chooseOption(page, reactionFieldId(event, "from", index), from === "" ? "whole payload" : from);
  } else {
    await fromControl.fill(from);
  }
}

async function setReactionCall(page: Page, event: string, action: string, index = 0) {
  await chooseOption(page, reactionFieldId(event, "kind", index), "call action");
  await chooseOption(page, reactionFieldId(event, "call", index), action, "prefix");
}

/** Only the path: the payload field stays whatever the builder defaulted it to. */
When("I set the reaction for {string} to set {string}", async ({ page }, event: string, path: string) => {
  await setReactionPath(page, event, path, undefined);
});

When(
  "I set the reaction for {string} to set {string} from {string}",
  async ({ page }, event: string, path: string, from: string) => {
    await setReactionPath(page, event, path, from);
  },
);

When("I set the reaction for {string} to call {string}", async ({ page }, event: string, action: string) => {
  await setReactionCall(page, event, action);
});

/** Another row under the event — the first one for an event that writes back by default. */
When("I add a reaction for {string}", async ({ page }, event: string) => {
  await page.getByTestId(reactionFieldId(event, "add")).click();
});

When(
  "I set reaction {int} for {string} to set {string} from {string}",
  async ({ page }, ordinal: number, event: string, path: string, from: string) => {
    await setReactionPath(page, event, path, from, ordinal - 1);
  },
);

When(
  "I set reaction {int} for {string} to call {string}",
  async ({ page }, ordinal: number, event: string, action: string) => {
    await setReactionCall(page, event, action, ordinal - 1);
  },
);

When("I remove reaction {int} for {string}", async ({ page }, ordinal: number, event: string) => {
  await page.getByTestId(reactionFieldId(event, "remove", ordinal - 1)).click();
});

Then("the reaction for {string} takes {string} from the payload", async ({ page }, event: string, from: string) => {
  await expect(page.getByTestId(reactionFieldId(event, "from"))).toHaveText(from);
});

/** What the event does before any row: the write-back its contract declares, following the port's path. */
Then(
  "the event {string} writes {string} back to {string} by default",
  async ({ page }, event: string, from: string, path: string) => {
    const fallback = page.getByTestId(reactionFieldId(event, "default"));
    await expect(fallback).toHaveAttribute("data-path", path);
    await expect(fallback).toContainText(from);
  },
);

/** The rows configured under the event (the default write-back is not one of them). */
Then("the event {string} has {int} more reaction(s)", async ({ page }, event: string, count: number) => {
  await expect(page.locator(`[data-testid="widget-reaction"][data-event="${event}"]`)).toHaveCount(count);
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

/* ----------------------------- conditions ----------------------------- */

/**
 * The "Show when" rows (doc/conditions-design.md): "the condition" is the
 * first row, "condition 2" the next (`conditionFieldId` counts from 0). A
 * check is picked by its PHRASE ("is greater than", "can be retried"), the
 * value typed as text — nothing for a check that takes none.
 */
/** Type a store path into a condition's combobox and leave it — its suggestions closed, so the next dropdown is the only one open. */
async function typePath(page: Page, testId: string, path: string) {
  const pathBox = page.getByTestId(testId).getByRole("combobox");
  await pathBox.click();
  await pathBox.fill(path);
  await pathBox.blur();
  await expect(dropdown(page)).toHaveCount(0);
}

async function setCondition(page: Page, index: number, path: string, phrase: string, value?: string) {
  await typePath(page, conditionFieldId("path", index), path);
  await chooseOption(page, conditionFieldId("is", index), phrase, "prefix");
  if (value === undefined) return;
  const control = page.getByTestId(conditionFieldId("to", index));
  if (await isSelect(control)) {
    await chooseOption(page, conditionFieldId("to", index), value);
  } else {
    await control.fill(value);
  }
}

When("I add a condition", async ({ page }) => {
  await page.getByTestId(conditionFieldId("add")).click();
});

When(
  "I set the condition to {string} {string} {string}",
  async ({ page }, path: string, phrase: string, value: string) => {
    await setCondition(page, 0, path, phrase, value);
  },
);

When("I set the condition to {string} {string}", async ({ page }, path: string, phrase: string) => {
  await setCondition(page, 0, path, phrase);
});

When(
  "I set condition {int} to {string} {string} {string}",
  async ({ page }, ordinal: number, path: string, phrase: string, value: string) => {
    await setCondition(page, ordinal - 1, path, phrase, value);
  },
);

When("I set condition {int} to {string} {string}", async ({ page }, ordinal: number, path: string, phrase: string) => {
  await setCondition(page, ordinal - 1, path, phrase);
});

/*
 * The CONSTRUCTOR (first row): a tree built step by step. A part is named
 * by its place — "0" the first test, "1" the second part, "1.0" the first
 * test inside the group at "1"; the root group is "the constructor".
 */
const groupAt = (at: string): string => `group-${at === "" || at === "the constructor" ? "root" : at}`;

When("I switch the condition to the constructor", async ({ page }) => {
  await chooseOption(page, conditionFieldId("is"), "constructor", "prefix");
});

/** A test of the constructor: its path, its check by phrase and its value (none for a check that takes none). */
async function setConstructorTest(page: Page, at: string, path: string, phrase: string, value?: string) {
  await typePath(page, conditionFieldId(`part-${at}-path`), path);
  await chooseOption(page, conditionFieldId(`part-${at}-is`), phrase, "prefix");
  if (value !== undefined) await page.getByTestId(conditionFieldId(`part-${at}-to`)).fill(value);
}

When(
  "I set constructor condition {string} to {string} {string} {string}",
  async ({ page }, at: string, path: string, phrase: string, value: string) => {
    await setConstructorTest(page, at, path, phrase, value);
  },
);

When(
  "I set constructor condition {string} to {string} {string}",
  async ({ page }, at: string, path: string, phrase: string) => {
    await setConstructorTest(page, at, path, phrase);
  },
);

/** "I add a condition to the constructor" or "… to constructor group "1"". */
When("I add a condition to {string}", async ({ page }, group: string) => {
  await page.getByTestId(conditionFieldId(`${groupAt(group.replace(/^constructor group /, ""))}-add-test`)).click();
});

When("I add a group to {string}", async ({ page }, group: string) => {
  await page.getByTestId(conditionFieldId(`${groupAt(group.replace(/^constructor group /, ""))}-add-group`)).click();
});

/** "and" / "or": how a group's parts join — the word between them is a button that switches it. */
When("I join {string} with {string}", async ({ page }, group: string, join: string) => {
  const joiner = page.getByTestId(conditionFieldId(`${groupAt(group.replace(/^constructor group /, ""))}-join`));
  if ((await joiner.innerText()).trim() !== join) await joiner.click();
  await expect(joiner).toHaveText(join);
});

When("I negate constructor condition {string}", async ({ page }, at: string) => {
  await chooseOption(page, conditionFieldId(`part-${at}-not`), "unless");
});

/** The "not" button before a group. */
When("I negate {string}", async ({ page }, group: string) => {
  const not = page.getByTestId(conditionFieldId(`${groupAt(group.replace(/^constructor group /, ""))}-not`));
  await not.click();
  await expect(not).toHaveAttribute("aria-pressed", "true");
});

When("I remove constructor condition {string}", async ({ page }, at: string) => {
  await page.getByTestId(conditionFieldId(`part-${at}-remove`)).click();
});

/** "unless": the widget shows while the check does NOT hold. */
When("I negate condition {int}", async ({ page }, ordinal: number) => {
  await chooseOption(page, conditionFieldId("not", ordinal - 1), "unless");
});

When("I remove condition {int}", async ({ page }, ordinal: number) => {
  await page.getByTestId(conditionFieldId("remove", ordinal - 1)).click();
});

/** The row read back as a sentence — what the form will save. */
Then("the condition reads {string}", async ({ page }, sentence: string) => {
  await expect(page.getByTestId(conditionFieldId("sentence"))).toHaveText(sentence);
});

Then("condition {int} reads {string}", async ({ page }, ordinal: number, sentence: string) => {
  await expect(page.getByTestId(conditionFieldId("sentence", ordinal - 1))).toHaveText(sentence);
});

/** Why the first row's value cannot be used. */
Then("the condition problem is {string}", async ({ page }, problem: string) => {
  await expect(page.getByTestId(conditionFieldId("problem"))).toHaveText(problem);
});

/** How a conditional widget appears when its condition turns true — one of the animations on offer. */
When("I set the appearance to {string}", async ({ page }, appearance: string) => {
  await chooseOption(page, conditionFieldId("appear"), appearance);
});

Then("the cell {string} appears with {string}", async ({ page }, id: string, appearance: string) => {
  await expect(cell(page, id)).toHaveAttribute("data-appear", appearance);
});

/** A cell whose template carries no condition: nothing says when, it simply shows. */
Then("the cell {string} always shows", async ({ page }, id: string) => {
  await expect(cell(page, id)).toBeVisible();
  await expect(cell(page, id)).not.toHaveAttribute("data-when", /.*/);
});

Then("the cell {string} shows the problem {string}", async ({ page }, id: string, text: string) => {
  await expect(live(page).locator(`[data-testid="cell-problem"][data-cell="${id}"]`)).toContainText(text);
});

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
  // No reaction can be added — the one control every event has, rows or not — and no condition either.
  await expect(page.locator('[data-testid^="reaction-"][data-testid$="-add"]').first()).toBeDisabled();
  const kinds = page.locator('[data-testid^="reaction-"][data-testid$="-kind"]');
  if ((await kinds.count()) > 0) await expect(kinds.first().getByRole("combobox")).toBeDisabled();
  await expect(page.getByTestId(conditionFieldId("add"))).toBeDisabled();
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
