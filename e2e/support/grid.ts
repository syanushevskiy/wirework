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

/**
 * Grab `from` at its centre and release with the POINTER over the centre
 * of `to` — for a drop the slot under the pointer decides (css-grid), where
 * a wide handle's preserved offset would carry the pointer past the slot.
 */
export async function dragOnto(page: Page, from: Locator, to: Locator) {
  await dragToPart(page, from, to, 0.5, 0.5);
}

/**
 * Grab `from` at its centre and release with the pointer over a PART of
 * `to`, given as fractions of its width and height — where the part of the
 * target under the pointer decides (flex rows: a cell's left or right
 * quarter puts the dragged one beside it, its middle swaps the two).
 */
export async function dragToPart(page: Page, from: Locator, to: Locator, across: number, down: number) {
  await page.getByTestId("page").scrollIntoViewIfNeeded();
  await from.scrollIntoViewIfNeeded();
  const a = await settledBox(from);
  const b = await settledBox(to);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * across, b.y + b.height * down, { steps: 12 });
  await page.mouse.up();
}
