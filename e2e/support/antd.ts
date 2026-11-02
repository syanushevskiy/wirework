/**
 * The ONE place the suite knows antd's DOM. A Select's options open in a
 * popup with no accessible click target (its role=option items are a hidden
 * list for screen readers), so picking one goes by the popup's title
 * attributes. Everything else in the suite uses roles and test ids.
 */
import type { Locator, Page } from "@playwright/test";

/**
 * The open antd dropdown (a Select or an AutoComplete popup). Excludes one
 * that is animating out: closing and opening overlap, and both are briefly
 * "not hidden".
 */
export const dropdown = (page: Page) =>
  page.locator(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden):not(.ant-slide-up-leave):not(.ant-slide-up-leave-active)",
  );

/**
 * An option in the open dropdown. antd puts the label in `title`, so an
 * exact match is a title match; `prefix` covers labels that carry a
 * trailing description ("reset-counter — Set demo.counter back to 0").
 */
export const option = (page: Page, label: string, match: "exact" | "prefix" = "exact") =>
  dropdown(page).locator(
    match === "exact" ? `.ant-select-item-option[title="${label}"]` : `.ant-select-item-option[title^="${label}"]`,
  );

/**
 * Open an antd Select by its test id and pick one option. The control is
 * brought to the MIDDLE of the viewport first: a Select at the bottom edge
 * opens its popup upwards and partly outside the viewport, Playwright then
 * scrolls the page to reach the option, antd re-aligns the popup on the
 * scroll, and the two chase each other until the click times out.
 */
export async function chooseOption(page: Page, testId: string, label: string, match: "exact" | "prefix" = "exact") {
  const control = page.getByTestId(testId);
  await control.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await control.click();
  await option(page, label, match).click();
}

/** A form control that is a dropdown (its box is a combobox); a plain field is the input itself. */
export const isSelect = async (control: Locator): Promise<boolean> => (await control.getByRole("combobox").count()) > 0;

/**
 * The open filter dropdown of a table column header (antd's own list of
 * values with OK and Reset, or the widget's search box). Like a Select's
 * popup it lives outside the table; one that is animating out is excluded.
 */
export const headerFilterDropdown = (page: Page) =>
  page.locator(".ant-table-filter-dropdown").locator("visible=true").last();

/** One value of the open filter dropdown's list: antd renders each as a menu item holding a checkbox and the text. */
export const headerFilterValue = (page: Page, text: string) =>
  headerFilterDropdown(page).getByRole("menuitem", { name: text });

/** A button of the open Popconfirm (a question asked before a destructive click); it lives outside the trigger. */
export const confirmButton = (page: Page, label: string) =>
  page.locator(".ant-popconfirm:not(.ant-popover-hidden)").getByRole("button", { name: label });

/** Close an open Select's popup without choosing. */
export const closeDropdown = async (page: Page) => {
  await page.keyboard.press("Escape");
  await dropdown(page).waitFor({ state: "hidden" });
};
