/**
 * Roles (doc/roles-design.md): "Sign in as" another of the demo's people,
 * what the fake servers were asked for, and editing FOR a role in the
 * builder — the role choice in the toolbar and a cell's template chosen for
 * the role.
 */
import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { samplePeople, type DemoRole } from "@wirework/view-data-models-examples";
import { chooseOption } from "../support/antd";
import { requests } from "../support/console";
import { editStateJson } from "../support/state";

const { Given, When, Then } = createBdd();

/* ------------------------------ sign in ------------------------------ */

/**
 * The host's "Sign in as": the session request goes out again for the
 * person picked (`qa`, `admin`, `wirework-admin` — shown by name) and, once
 * it has answered, the page is opened again as them: a NEW visit, which the
 * step waits for, so what follows sees the new person's page.
 */
When("I sign in as {string}", async ({ page }, person: string) => {
  const signIn = page.locator(".pg-sign-in");
  const before = await signIn.getAttribute("data-visit");
  const who = samplePeople[person as DemoRole]; // The boundary: the scenario names one of the demo's people.
  if (who === undefined)
    throw new Error(`Unknown person "${person}" (people: ${Object.keys(samplePeople).join(", ")})`);
  await chooseOption(page, "sign-in-as", who.name, "prefix");
  await expect(signIn).not.toHaveAttribute("data-visit", before ?? "");
  await expect(page.getByTestId("sign-in-as")).toContainText(who.name);
  await expect(page.getByTestId("page")).toBeVisible();
});

/* ---------------------------- fake servers ---------------------------- */

/** A URL the fake servers were asked for since the application started — the FACT a role's wiring leaves behind. */
Then("the server was asked for {string}", async ({ page }, url: string) => {
  await expect
    .poll(async () => (await requests(page)).asked, { message: `the server was never asked for ${url}` })
    .toContain(url);
});

Then("the server was not asked for {string}", async ({ page }, url: string) => {
  expect((await requests(page)).asked).not.toContain(url);
});

/** The shared runs table made to ask for the admin's view — what a page builder could configure; the session still decides. */
Given("the shared runs table is made to ask for the admin's view", async ({ page }) => {
  await editStateJson(page, "viewModels.widgets.runs.table.default.on.load.0.with.url", "/api/v1/view/runs/all");
});

/* ------------------------------ the builder ------------------------------ */

/** The toolbar's role choice: edits go to the role's configuration, and the page shows as the role sees it. */
When("I edit for the role {string}", async ({ page }, role: string) => {
  await chooseOption(page, "edit-role", role);
  await expect(page.getByTestId("edit-target")).toHaveText(`edits → role: ${role}`);
});

When("I edit for everyone", async ({ page }) => {
  await chooseOption(page, "edit-role", "everyone");
  await expect(page.getByTestId("edit-target")).toHaveText("edits → everyone");
});

/** Adding changes the shared page: locked while a role is edited for, and the lock says what to do. */
Then("adding widgets waits for the edits to be for everyone", async ({ page }) => {
  await expect(page.getByTestId("add-widget")).toBeDisabled();
  await expect(page.getByTestId("add-widget-locked")).toContainText("edit for everyone");
});

/** In the widget editor of a role's cell: the widget's templates on offer, one chosen as the role's view for the cell. */
When("I choose the template {string} for the cell", async ({ page }, name: string) => {
  await chooseOption(page, "cell-template", name);
  await expect(page.getByTestId("cell-template")).toContainText(name);
});
