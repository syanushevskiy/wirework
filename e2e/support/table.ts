/** The table on the live page, by what the `table` contract exposes: row keys and cell properties. */
import type { Page } from "@playwright/test";
import { live } from "./page";

/** A table row on the live page, found by its row key (the rowKey property's value). */
export const tableRow = (page: Page, key: string) =>
  live(page).locator(`[data-testid="table-row"][data-row-key="${key}"]`);

/** A cell of a row on the live page, by its column's property. */
export const tableCell = (page: Page, key: string, property: string) =>
  tableRow(page, key).locator(`td[data-property="${property}"]`);
