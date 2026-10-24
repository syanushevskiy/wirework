/** Page views: the list of a page's prebuilt and own views, choosing one, Save as, Rename, Delete, Share and Import. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { chooseOption, closeDropdown, confirmButton, dropdown, option } from "../support/antd";

const { When, Then } = createBdd();

/* ------------------------------- the list ------------------------------- */

When("I choose the view {string}", async ({ page }, name: string) => {
  await chooseOption(page, "page-view-select", name);
  await expect(page.getByTestId("page")).toHaveAttribute("data-view", name);
});

/** The list's entry for a view carries its kind beside the name: "prebuilt" or "mine". */
Then("the view list offers {string} as {string}", async ({ page }, name: string, kind: string) => {
  await page.getByTestId("page-view-select").click();
  await expect(dropdown(page)).toBeVisible();
  await expect(option(page, name)).toContainText(kind);
  await closeDropdown(page);
});

Then("the view list does not offer {string}", async ({ page }, name: string) => {
  await page.getByTestId("page-view-select").click();
  await expect(dropdown(page)).toBeVisible();
  await expect(option(page, name)).toHaveCount(0);
  await closeDropdown(page);
});

/** The page shows the view, and the list says what kind it is. */
Then("the page uses the {string} view, which is {string}", async ({ page }, name: string, kind: string) => {
  await expect(page.getByTestId("page")).toHaveAttribute("data-view", name);
  await expect(page.getByTestId("page-view-kind")).toHaveText(kind);
});

Then("no view can be chosen", async ({ page }) => {
  await expect(page.getByTestId("page-view-select")).toHaveClass(/disabled/);
});

Then("views cannot be saved", async ({ page }) => {
  await expect(page.getByTestId("view-save-as")).toBeDisabled();
  await expect(page.getByTestId("view-import")).toBeDisabled();
});

/* ------------------------------- the panel ------------------------------- */

/** Type the name and press the panel's button; a refusal leaves the panel open (see "the view panel says"). */
async function nameAndApply(page: Page, name: string) {
  await page.getByTestId("view-name").fill(name);
  await page.getByTestId("view-apply").click();
}

When("I save the view as {string}", async ({ page }, name: string) => {
  await page.getByTestId("view-save-as").click();
  await expect(page.getByTestId("page-view-panel")).toHaveAttribute("data-panel", "save-as");
  await nameAndApply(page, name);
});

When("I rename the view to {string}", async ({ page }, name: string) => {
  await page.getByTestId("view-rename").click();
  await expect(page.getByTestId("page-view-panel")).toHaveAttribute("data-panel", "rename");
  await nameAndApply(page, name);
});

When("I delete the view", async ({ page }) => {
  await page.getByTestId("view-delete").click();
  await confirmButton(page, "Delete view").click();
});

When("I share the view", async ({ page }) => {
  await page.getByTestId("view-share").click();
  await expect(page.getByTestId("page-view-panel")).toHaveAttribute("data-panel", "share");
});

Then("the shared view JSON contains {string}", async ({ page }, fragment: string) => {
  await expect(page.getByTestId("view-json")).toHaveValue(new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

/** Paste a view file (the step's doc string) and import it under the file's own name. */
When("I import the view:", async ({ page }, json: string) => {
  await page.getByTestId("view-import").click();
  await expect(page.getByTestId("page-view-panel")).toHaveAttribute("data-panel", "import");
  await page.getByTestId("view-json").fill(json);
  await page.getByTestId("view-apply").click();
});

/** The same, under a name of my own. */
When("I import the view as {string}:", async ({ page }, name: string, json: string) => {
  await page.getByTestId("view-import").click();
  await expect(page.getByTestId("page-view-panel")).toHaveAttribute("data-panel", "import");
  await page.getByTestId("view-json").fill(json);
  await nameAndApply(page, name);
});

Then("the view panel says {string}", async ({ page }, text: string) => {
  await expect(page.getByTestId("view-problem")).toContainText(text);
});

Then("the view panel is closed", async ({ page }) => {
  await expect(page.getByTestId("page-view-panel")).toHaveCount(0);
});
