/** The widgets on the live page, by what each contract exposes. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { dropdown, option } from "../support/antd";
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
