/** The event log: every emit, newest first, with its widget, event, payload and cell. */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

function eventRows(page: Page, widget: string, event: string) {
  return page.locator(`[data-testid="event-log-row"][data-widget="${widget}"][data-event="${event}"]`);
}

/** The log's rows render only while its panel is open: a count on a closed panel is always 0. */
async function openEventLog(page: Page) {
  await expect(page.getByTestId("panel-events")).toHaveAttribute("data-state", "open");
}

Then("the event log is empty", async ({ page }) => {
  await openEventLog(page);
  await expect(page.getByTestId("event-log-row")).toHaveCount(0);
});

Then("the event log has {int} entry/entries", async ({ page }, count: number) => {
  await openEventLog(page);
  await expect(page.getByTestId("event-log-row")).toHaveCount(count);
});

Then(
  "the event log shows widget {string} event {string} with payload {string}",
  async ({ page }, widget: string, event: string, payload: string) => {
    // Newest first: the most recent emit of this event carries the payload.
    await expect(eventRows(page, widget, event).first().getByTestId("event-log-payload")).toHaveText(payload);
  },
);

Then(
  "the event log shows widget {string} event {string} with {string} in its payload",
  async ({ page }, widget: string, event: string, fragment: string) => {
    // Newest first, like the exact-payload step; for payloads too long to spell out.
    await expect(eventRows(page, widget, event).first().getByTestId("event-log-payload")).toContainText(fragment);
  },
);

Then(
  "the event log shows widget {string} event {string} from cell {string}",
  async ({ page }, widget: string, event: string, id: string) => {
    await expect(eventRows(page, widget, event).first()).toHaveAttribute("data-cell", id);
  },
);

When("I clear the event log", async ({ page }) => {
  await page.getByTestId("event-log-clear").click();
});
