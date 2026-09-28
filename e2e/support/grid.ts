/** Grid layouts: items by cell, and the pointer work a drag or a resize takes. */
import { expect, type Locator, type Page } from "@playwright/test";

export const gridItem = (page: Page, cell: string) => page.locator(`[data-testid="grid-item"][data-cell="${cell}"]`);

type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

const sameBox = (a: Box | null, b: Box | null): boolean =>
  a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/**
 * Bounding box once it has stopped changing: react-grid-layout animates
 * position/size for 200ms, and measuring mid-transition grabs thin air.
 * Settled = the same box on two readings 120ms apart.
 */
export async function settledBox(locator: Locator): Promise<Box> {
  let previous = await locator.boundingBox();
  let settled: Box | null = null;
  await expect
    .poll(
      async () => {
        const current = await locator.boundingBox();
        settled = sameBox(previous, current) ? current : null;
        previous = current;
        return settled !== null;
      },
      { intervals: [120], timeout: 3_000, message: "the element never settled" },
    )
    .toBe(true);
  return settled as unknown as Box;
}

/**
 * Grab `from` at its centre and drop so that its TOP-LEFT lands on the
 * top-left of `to` (the grab offset is preserved), whatever their sizes.
 */
export async function dragBetween(page: Page, from: Locator, to: Locator) {
  // Bounding boxes are viewport-relative and the palette sits above the
  // grid: bring the grid on screen or the pointer lands outside the window.
  await page.getByTestId("page").scrollIntoViewIfNeeded();
  await from.scrollIntoViewIfNeeded();
  const a = await settledBox(from);
  const b = await settledBox(to);
  const grabX = a.width / 2;
  const grabY = a.height / 2;
  await page.mouse.move(a.x + grabX, a.y + grabY);
  await page.mouse.down();
  await page.mouse.move(b.x + grabX, b.y + grabY, { steps: 12 });
  await page.mouse.up();
}
