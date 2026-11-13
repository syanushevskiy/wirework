/**
 * The ONE place the suite knows antd's DOM. A Select's options open in a
 * popup with no accessible click target (its role=option items are a hidden
 * list for screen readers), so picking one goes by the popup's title
 * attributes. Everything else in the suite uses roles and test ids.
 */
import { expect, type Locator, type Page } from "@playwright/test";

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

/** The option antd has highlighted in the open dropdown — where Enter would land. */
const activeOption = (page: Page) => dropdown(page).locator(".ant-select-item-option-active");

/**
 * Open an antd Select by its test id and pick one option — with the
 * KEYBOARD, as a person who cannot reach the mouse would: Down until the
 * highlighted option is the one wanted, then Enter. A mouse click on the
 * option is what a Select near the bottom of a long page cannot take: its
 * popup opens partly outside the viewport, Playwright scrolls the page to
 * reach the option, antd re-aligns and re-creates the popup on the scroll,
 * and the two chase each other until the click times out. The keyboard
 * needs no scrolling and antd keeps the highlighted option rendered.
 */
export async function chooseOption(page: Page, testId: string, label: string, match: "exact" | "prefix" = "exact") {
  const control = page.getByTestId(testId);
  await control.click();
  await expect(dropdown(page)).toBeVisible();
  const wanted = (title: string | null): boolean =>
    title !== null && (match === "exact" ? title === label : title.startsWith(label));
  // One step per option at most, then one more to see that nothing matched.
  const options = await dropdown(page).locator(".ant-select-item-option").count();
  for (let step = 0; step <= options; step += 1) {
    if (wanted(await activeOption(page).getAttribute("title"))) {
      await control.press("Enter");
      await expect(dropdown(page)).toHaveCount(0);
      return;
    }
    await control.press("ArrowDown");
  }
  throw new Error(`no option "${label}" in the dropdown of "${testId}"`);
}

/** A form control that is a dropdown (its box is a combobox); a plain field is the input itself. */
export const isSelect = async (control: Locator): Promise<boolean> => (await control.getByRole("combobox").count()) > 0;

/**
 * The open filter dropdown of a table column header (the widget's list of
 * values, its search box or its period). Like a Select's
 * popup it lives outside the table; one that is animating out is excluded.
 */
export const headerFilterDropdown = (page: Page) =>
  page.locator(".ant-table-filter-dropdown").locator("visible=true").last();

/**
 * The trigger of a column header's filter dropdown (the filter or search
 * icon) — by antd's class, because a header with a filter ROW holds other
 * buttons and icons too (the field's clear, its search icon).
 */
export const headerFilterTrigger = (header: Locator) => header.locator(".ant-table-filter-trigger");

/** A button of the open Popconfirm (a question asked before a destructive click); it lives outside the trigger. */
export const confirmButton = (page: Page, label: string) =>
  page.locator(".ant-popconfirm:not(.ant-popover-hidden)").getByRole("button", { name: label });

/** Close an open Select's popup without choosing. */
export const closeDropdown = async (page: Page) => {
  await page.keyboard.press("Escape");
  await dropdown(page).waitFor({ state: "hidden" });
};
