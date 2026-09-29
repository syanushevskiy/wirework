/** The application around the pages: navigation, the console, the fake servers, the panels, the state inspector, boot validation. */
import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { live, PAGE_PATHS } from "../support/page";
import { editStateJson } from "../support/state";

const { Given, When, Then } = createBdd();

/* ---------------------------- navigation ---------------------------- */

/** A fresh load of the page's own address: the application starts over, nothing of another page ran. */
Given("I open the {string} page", async ({ page }, name: string) => {
  const path = PAGE_PATHS[name];
  if (path === undefined) throw new Error(`Unknown page "${name}" (pages: ${Object.keys(PAGE_PATHS).join(", ")})`);
  await page.goto(path);
  await expect(page.getByTestId("page")).toHaveAttribute("data-page", name);
});

/** A fresh load of an address that is not in the menu, e.g. "/demo/runs/123456". */
Given("I open the address {string}", async ({ page }, path: string) => {
  await page.goto(path);
});

/** No reload: the menu — the page's own data starts over, the application's global state stays. */
When("I switch to the {string} page", async ({ page }, name: string) => {
  await page.getByTestId(`nav-${name}`).click();
  await expect(page.getByTestId("page")).toHaveAttribute("data-page", name);
});

Then("the {string} page is shown", async ({ page }, name: string) => {
  await expect(page.getByTestId("page")).toHaveAttribute("data-page", name);
});

Then("the address is {string}", async ({ page }, path: string) => {
  await expect(page).toHaveURL((url) => url.pathname === path);
});

When("I go back in the browser", async ({ page }) => {
  await page.goBack();
});

/* ------------------------------ console ------------------------------ */

/** The browser console: `wirework.devtools(...)` — turning it on or off reloads the page. */
When("I run {string} in the console", async ({ page }, command: string) => {
  const reloads = /devtools\((true|false)\)/.test(command);
  const reloaded = reloads ? page.waitForEvent("load") : Promise.resolve();
  await page.evaluate(command);
  await reloaded;
  await expect(live(page)).toBeVisible();
});

Then("{string} in the console answers {string}", async ({ page }, command: string, answer: string) => {
  expect(await page.evaluate(command)).toBe(answer);
});

/* ---------------------------- fake servers ---------------------------- */

/** What the playground reports on the console as `wirework.requests()` (apps/playground/src/api/requests.ts). */
interface RequestCounts {
  pending: number;
  answered: number;
}

/** The playground's console API, as the steps below see it. */
type Console = Window & {
  wireworkHoldAnswers?: boolean;
  wirework?: { requests: () => RequestCounts; releaseAnswers: () => void };
};

/**
 * The fake servers keep every answer back until "the server has had time to
 * answer" — so a scenario can look at a page as it is BEFORE its data
 * arrives (a loading label, an empty table) without racing the answer.
 * Say it before opening the page.
 */
Given("the server is slow to answer", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Console).wireworkHoldAnswers = true;
  });
});

/**
 * Everything asked of the fake servers so far has been answered — a FACT the
 * application reports (`wirework.requests()`), not a sleep: for asserting
 * what arrived, and what must NOT have. Answers a scenario held are let
 * through first.
 */
When("the server has had time to answer", async ({ page }) => {
  await page.evaluate(() => (window as Console).wirework?.releaseAnswers());
  await expect
    .poll(
      () => page.evaluate((): RequestCounts => (window as Console).wirework?.requests() ?? { pending: 0, answered: 0 }),
      { message: "the fake servers still have a request in flight" },
    )
    .toMatchObject({ pending: 0 });
});

/* ---------------------------- user overlay ---------------------------- */

When("I disable the user overlay", async ({ page }) => {
  await page.getByTestId("toggle-user-overlay").uncheck();
});

When("I enable the user overlay", async ({ page }) => {
  await page.getByTestId("toggle-user-overlay").check();
});

/** Nothing to personalise yet: the toggle is there, but off and out of reach. */
Then("the user overlay is not available", async ({ page }) => {
  await expect(page.getByTestId("toggle-user-overlay")).toBeDisabled();
  await expect(page.getByTestId("toggle-user-overlay")).not.toBeChecked();
});

Then("the user overlay is available and off", async ({ page }) => {
  await expect(page.getByTestId("toggle-user-overlay")).toBeEnabled();
  await expect(page.getByTestId("toggle-user-overlay")).not.toBeChecked();
});

Then("the page can be edited", async ({ page }) => {
  await expect(page.getByTestId("page-edit")).toBeEnabled();
});

/** Global state at work: app.permissions.editPages is false. */
Then("the page cannot be edited", async ({ page }) => {
  await expect(page.getByTestId("page-edit")).toBeDisabled();
});

/* ------------------------------- panels ------------------------------- */

When("I expand the {string} panel", async ({ page }, name: string) => {
  await page.getByTestId(`panel-${name}-toggle`).click();
  await expect(page.getByTestId(`panel-${name}`)).toHaveAttribute("data-state", "open");
});

Then("the {string} panel is collapsed", async ({ page }, name: string) => {
  await expect(page.getByTestId(`panel-${name}`)).toHaveAttribute("data-state", "closed");
});

/* --------------------------- state inspector --------------------------- */

/**
 * Data for a scenario, put into the store the way a person would: through
 * the state inspector. A page starts without other pages' data (the builder
 * with none at all), so a scenario that needs rows says which — as JSON in
 * the step's doc string.
 */
Given("the store holds at {string}:", async ({ page }, path: string, json: string) => {
  await editStateJson(page, path, JSON.parse(json));
});

/** An edit the inspector is expected to refuse — follow it with "the state error is shown". */
When("I try to put into the store at {string}:", async ({ page }, path: string, json: string) => {
  await editStateJson(page, path, JSON.parse(json), false);
});

Then("the state JSON contains {string}", async ({ page }, fragment: string) => {
  await expect.poll(async () => page.getByTestId("state-editor").inputValue()).toContain(fragment);
});

Then("the state JSON does not contain {string}", async ({ page }, fragment: string) => {
  await expect.poll(async () => page.getByTestId("state-editor").inputValue()).not.toContain(fragment);
});

When("I edit the state JSON setting {string} to {int}", async ({ page }, path: string, value: number) => {
  await editStateJson(page, path, value);
});

When("I edit the state JSON setting {string} to {string}", async ({ page }, path: string, value: string) => {
  await editStateJson(page, path, value);
});

When("I replace the state JSON with {string}", async ({ page }, text: string) => {
  await page.getByTestId("state-editor").fill(text);
  await page.getByTestId("state-apply").click();
});

Then("the state error is shown", async ({ page }) => {
  await expect(page.getByTestId("state-error")).toBeVisible();
});

/* -------------------------- boot and validation -------------------------- */

Then("all {int} broken widget definitions were rejected", async ({ page }, count: number) => {
  const rejected = page.getByTestId("registration-report").locator('li[data-rejected="true"]');
  await expect(rejected).toHaveCount(count);
});

Then("the boot validation status is {string}", async ({ page }, text: string) => {
  await expect(page.getByTestId("validation-status")).toHaveText(text);
});

/** A line of the validation panel (expand it first). */
Then("the validation report mentions {string}", async ({ page }, text: string) => {
  await expect(page.getByTestId("validation-report")).toContainText(text);
});

/** Warnings shown above a page that renders, but not as designed. */
Then("the page warns {string}", async ({ page }, text: string) => {
  await expect(page.getByTestId("page-warnings")).toContainText(text);
});

Then("the page shows no warnings", async ({ page }) => {
  await expect(page.getByTestId("page-warnings")).toHaveCount(0);
});
