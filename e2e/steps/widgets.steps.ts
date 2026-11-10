/** The widgets on the live page, by what each contract exposes. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { confirmButton, dropdown, option } from "../support/antd";
import { cell, live } from "../support/page";

const { When, Then } = createBdd();

/* ------------------------------ binding ------------------------------ */

Then("the echo widget at {string} shows {string}", async ({ page }, path: string, value: string) => {
  const echo = live(page).locator(`[data-testid="antd-echo"][data-path="${path}"]`).getByTestId("antd-echo-value");
  await expect(echo).toHaveText(value);
});

When("I click the counter {int} time(s)", async ({ page }, times: number) => {
  const counter = live(page).getByTestId("antd-counter");
  for (let i = 0; i < times; i += 1) {
    await counter.click();
  }
});

When("I click the counter in cell {string} {int} time(s)", async ({ page }, id: string, times: number) => {
  const counter = cell(page, id).getByTestId("antd-counter");
  for (let i = 0; i < times; i += 1) {
    await counter.click();
  }
});

Then("the counter shows {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("antd-counter")).toContainText(text);
});

/** The button's variant (primary, secondary, dashed, danger): how much it stands out. */
Then("the button {string} has the variant {string}", async ({ page }, label: string, variant: string) => {
  await expect(live(page).getByRole("button", { name: label, exact: true })).toHaveAttribute("data-variant", variant);
});

When("I click the button {string}", async ({ page }, label: string) => {
  await live(page).getByRole("button", { name: label, exact: true }).click();
});

/* ---------------------------- basic widgets ---------------------------- */

When("I choose {string} in the select", async ({ page }, label: string) => {
  await live(page).getByTestId("antd-select").getByRole("combobox").click();
  await option(page, label).click();
});

Then("the select holds {string}", async ({ page }, value: string) => {
  await expect(live(page).getByTestId("antd-select")).toHaveAttribute("data-value", value);
});

Then("the tag reads {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("antd-tag")).toHaveText(text);
});

When("I tick the checkbox", async ({ page }) => {
  await live(page).getByTestId("antd-checkbox").getByRole("checkbox").check();
});

When("I untick the checkbox", async ({ page }) => {
  await live(page).getByTestId("antd-checkbox").getByRole("checkbox").uncheck();
});

Then("the checkbox is checked", async ({ page }) => {
  await expect(live(page).getByTestId("antd-checkbox")).toHaveAttribute("data-checked", "true");
});

Then("the checkbox is unchecked", async ({ page }) => {
  await expect(live(page).getByTestId("antd-checkbox")).toHaveAttribute("data-checked", "false");
});

Then("the progress shows {int} percent", async ({ page }, percent: number) => {
  await expect(live(page).getByTestId("antd-progress")).toHaveAttribute("data-percent", String(percent));
});

Then("the alert reads {string} as a {string}", async ({ page }, text: string, tone: string) => {
  const alert = live(page).getByRole("alert");
  await expect(alert).toHaveAttribute("data-tone", tone);
  await expect(alert).toContainText(text);
});

Then("the label reads {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("antd-label").first()).toHaveText(text);
});

Then("the label tone is {string}", async ({ page }, tone: string) => {
  await expect(live(page).getByTestId("antd-label").first()).toHaveAttribute("data-tone", tone);
});

Then("the status badge reads {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("status-badge")).toHaveText(text);
});

/* ----------------------- more widgets (WW-26) ----------------------- */

When("I flip the switch", async ({ page }) => {
  await live(page).getByRole("switch").click();
});

Then("the switch is {word}", async ({ page }, word: string) => {
  await expect(live(page).getByTestId("antd-switch")).toHaveAttribute("data-checked", String(onOff(word)));
});

When("I pick {string} in the radio group", async ({ page }, label: string) => {
  await live(page).getByRole("radiogroup").getByRole("radio", { name: label }).check();
});

Then("the radio group holds {string}", async ({ page }, value: string) => {
  await expect(live(page).getByTestId("antd-radio-group")).toHaveAttribute("data-value", value);
});

/** The rating's stars are radios in a group; the n-th star is the score n. */
When("I rate {int} star(s)", async ({ page }, stars: number) => {
  await live(page)
    .getByTestId("antd-rate")
    .getByRole("radio")
    .nth(stars - 1)
    .click();
});

Then("the rating is {int}", async ({ page }, stars: number) => {
  await expect(live(page).getByTestId("antd-rate")).toHaveAttribute("data-value", String(stars));
});

/** The slider moves by its step on the arrow keys. */
When("I nudge the slider up {int} time(s)", async ({ page }, times: number) => {
  const handle = live(page).getByRole("slider");
  await handle.focus();
  for (let i = 0; i < times; i += 1) {
    await handle.press("ArrowRight");
  }
});

Then("the slider holds {int}", async ({ page }, value: number) => {
  await expect(live(page).getByTestId("antd-slider")).toHaveAttribute("data-value", String(value));
});

Then("the statistic reads {string} and {string}", async ({ page }, title: string, value: string) => {
  const statistic = live(page).getByTestId("antd-statistic");
  await expect(statistic).toContainText(title);
  await expect(statistic).toContainText(value);
});

Then("the divider reads {string}", async ({ page }, text: string) => {
  await expect(live(page).getByRole("separator")).toHaveText(text);
});

/* ----------------------- the dashboard set (WW-34) ----------------------- */

When("I enter the number {int} in {string}", async ({ page }, value: number, label: string) => {
  await live(page).getByRole("spinbutton", { name: label }).fill(String(value));
});

/** A date is TYPED in the shown format and picked with Enter — never clicked in a calendar, which moves with the month. */
When("I pick the date {string} in {string}", async ({ page }, date: string, label: string) => {
  const field = live(page).getByRole("textbox", { name: label });
  await field.fill(date);
  await field.press("Enter");
});

/** The range's two fields, typed in turn: antd moves to the second once the first is picked. */
When("I pick the dates {string} to {string} in {string}", async ({ page }, from: string, to: string, label: string) => {
  const fields = live(page).getByRole("group", { name: label }).getByRole("textbox");
  await fields.nth(0).fill(from);
  await fields.nth(0).press("Enter");
  await fields.nth(1).fill(to);
  await fields.nth(1).press("Enter");
});

Then("the {string} dates are {string} to {string}", async ({ page }, label: string, from: string, to: string) => {
  const range = live(page).getByRole("group", { name: label });
  await expect(range).toHaveAttribute("data-from", from);
  await expect(range).toHaveAttribute("data-to", to);
});

/** One field of a fact sheet, by the item's title; a custom cell's text includes its control ("REF…Copy"). */
Then("the field {string} of the descriptions reads {string}", async ({ page }, item: string, text: string) => {
  await expect(live(page).locator(`[data-testid="description-field"][data-item="${item}"]`)).toHaveText(text);
});

Then("the result says {string}", async ({ page }, text: string) => {
  await expect(live(page).getByTestId("antd-result")).toContainText(text);
});

Then("the current step is {string}", async ({ page }, key: string) => {
  await expect(live(page).getByTestId("antd-steps")).toHaveAttribute("data-current", key);
});

Then("the pipeline has failed", async ({ page }) => {
  await expect(live(page).getByTestId("antd-steps")).toHaveAttribute("data-status", "error");
});

Then("the timeline has {int} entr(y)(ies)", async ({ page }, count: number) => {
  await expect(live(page).getByTestId("antd-timeline")).toHaveAttribute("data-count", String(count));
});

/** A dialog opens OVER the page (a portal outside it): found by its role, told apart by its title. */
const dialog = (page: Page, title: string) => page.getByRole("dialog").filter({ hasText: title });

Then("the dialog {string} is open", async ({ page }, title: string) => {
  await expect(dialog(page, title)).toBeVisible();
});

Then("the dialog {string} is closed", async ({ page }, title: string) => {
  await expect(dialog(page, title)).toBeHidden();
});

When("I click the button {string} in the dialog", async ({ page }, label: string) => {
  await page.getByRole("dialog").getByRole("button", { name: label, exact: true }).click();
});

When("I type {string} into the field {string} in the dialog", async ({ page }, text: string, label: string) => {
  await page.getByRole("dialog").getByRole("textbox", { name: label }).fill(text);
});

When("I close the dialog", async ({ page }) => {
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
});

/** A button with a question before its click (`confirm`): antd's Popconfirm, OK or Cancel. */
When("I confirm", async ({ page }) => {
  await confirmButton(page, "OK").click();
});

When("I cancel", async ({ page }) => {
  await confirmButton(page, "Cancel").click();
});

/* ------------------------------- input ------------------------------- */

When("I type {string} into the input", async ({ page }, text: string) => {
  await live(page).getByTestId("antd-input").fill(text);
});

const inputField = (page: Page) => live(page).getByTestId("antd-input-field");

Then("the input is invalid with {string}", async ({ page }, message: string) => {
  await expect(inputField(page).getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  await expect(inputField(page).getByRole("alert")).toHaveText(message);
});

Then("the input is valid", async ({ page }) => {
  await expect(inputField(page).getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
  await expect(inputField(page).getByRole("alert")).toHaveCount(0);
});

/* ---------------------------- multi-select ---------------------------- */

/** A multi-select on the live page, found by its visible label. */
const multiSelect = (page: Page, label: string) =>
  live(page).locator(`[data-testid="antd-multi-select"][data-label="${label}"]`);

/** Picking a chosen option again unpicks it; the dropdown is closed afterwards. */
async function toggleInMultiSelect(page: Page, label: string, optionLabel: string) {
  await multiSelect(page, label).getByRole("combobox").click();
  await option(page, optionLabel).click();
  await page.keyboard.press("Escape");
  await expect(dropdown(page)).toHaveCount(0);
}

When("I pick {string} in the {string} multi-select", async ({ page }, optionLabel: string, label: string) => {
  await toggleInMultiSelect(page, label, optionLabel);
});

When("I unpick {string} in the {string} multi-select", async ({ page }, optionLabel: string, label: string) => {
  await toggleInMultiSelect(page, label, optionLabel);
});

/** Values as a plain list: "billing, search" ("" = nothing chosen). */
Then("the {string} multi-select holds {string}", async ({ page }, label: string, values: string) => {
  await expect(multiSelect(page, label)).toHaveAttribute("data-values", values.split(", ").join(","));
});

/** Option labels as shown: "Billing smoke, Billing regression" ("" = nothing on offer). */
Then("the {string} multi-select offers {string}", async ({ page }, label: string, options: string) => {
  await expect(multiSelect(page, label)).toHaveAttribute("data-options", options);
});

/* ------------------------------ refresher ------------------------------ */

const refresher = (page: Page) => live(page).getByTestId("antd-refresher");

/** "on" / "off" in a step; anything else is a typo in the scenario, not "off". */
function onOff(word: string): boolean {
  if (word !== "on" && word !== "off") throw new Error(`expected "on" or "off", got "${word}"`);
  return word === "on";
}

When("I click Refresh", async ({ page }) => {
  await refresher(page).getByTestId("antd-refresher-refresh").click();
});

When("I turn auto-refresh {word}", async ({ page }, word: string) => {
  await refresher(page).getByTestId("antd-refresher-toggle").setChecked(onOff(word));
});

When("I set the refresh interval to {int} second(s)", async ({ page }, seconds: number) => {
  await refresher(page).getByTestId("antd-refresher-interval").fill(String(seconds));
});

Then("auto-refresh is {word}", async ({ page }, word: string) => {
  await expect(refresher(page)).toHaveAttribute("data-enabled", String(onOff(word)));
});

Then("the refresh interval is {int} second(s)", async ({ page }, seconds: number) => {
  await expect(refresher(page)).toHaveAttribute("data-interval", String(seconds));
});
