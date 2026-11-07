/**
 * Page views: the list of a page's prebuilt and own views, choosing one, Save as, Rename, Delete, Share and Import —
 * and Export page, the whole shared page as a file (doc/pages-as-code-design.md).
 */
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

const literally = (fragment: string) => new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

Then("the shared view JSON contains {string}", async ({ page }, fragment: string) => {
  await expect(page.getByTestId("view-json")).toHaveValue(literally(fragment));
});

/** A view is the page's layout alone: what a container holds is the page's configuration, not the view's. */
Then("the shared view JSON does not contain {string}", async ({ page }, fragment: string) => {
  await expect(page.getByTestId("view-json")).not.toHaveValue(literally(fragment));
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

/* ------------------------------- export ------------------------------- */

When("I export the page", async ({ page }) => {
  await page.getByTestId("page-export-open").click();
  await expect(page.getByTestId("page-export-panel")).toBeVisible();
});

Then("the exported page JSON contains {string}", async ({ page }, fragment: string) => {
  await expect(page.getByTestId("page-export-json")).toHaveValue(literally(fragment));
});

/** The user's own views never travel with the page: the file is the SHARED page. */
Then("the exported page JSON does not contain {string}", async ({ page }, fragment: string) => {
  await expect(page.getByTestId("page-export-json")).not.toHaveValue(literally(fragment));
});

/**
 * The download: the browser's, caught as an event. The step keeps the file
 * for the assertion that follows, on the page object (one scenario is one
 * page).
 */
const downloaded = new WeakMap<Page, { name: string; text: string }>();

When("I download the exported page", async ({ page }) => {
  const waiting = page.waitForEvent("download");
  await page.getByTestId("page-export-download").click();
  const download = await waiting;
  const chunks: Buffer[] = [];
  // Boundary cast: a Readable yields `any`; a download's stream yields bytes.
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  downloaded.set(page, { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString("utf8") });
});

Then(
  "the downloaded file is {string} and holds the page {string}",
  async ({ page }, fileName: string, pageName: string) => {
    const file = downloaded.get(page);
    expect(file?.name).toBe(fileName);
    expect(JSON.parse(file?.text ?? "")).toMatchObject({ kind: "wirework-page", version: 1, page: pageName });
  },
);

When("I close the export panel", async ({ page }) => {
  await page.getByTestId("page-export-close").click();
});

Then("the export panel is closed", async ({ page }) => {
  await expect(page.getByTestId("page-export-panel")).toHaveCount(0);
});

/** Locked, and saying why on hover (the title on the button's wrapper, as the toolbar's locks do). */
Then("the page cannot be exported", async ({ page }) => {
  await expect(page.getByTestId("page-export-open")).toBeDisabled();
  await expect(page.getByTestId("page-export-open").locator("xpath=..")).toHaveAttribute("title", /permissions/);
});
