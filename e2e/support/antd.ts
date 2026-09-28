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

/** Open an antd Select by its test id and pick one option. */
export async function chooseOption(page: Page, testId: string, label: string, match: "exact" | "prefix" = "exact") {
  await page.getByTestId(testId).click();
  await option(page, label, match).click();
}

/** A form control that is a dropdown (its box is a combobox); a plain field is the input itself. */
export const isSelect = async (control: Locator): Promise<boolean> => (await control.getByRole("combobox").count()) > 0;
