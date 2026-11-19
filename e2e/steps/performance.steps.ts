/**
 * Performance of the infinite table over a LONG server list
 * (performance.feature): the fake servers are told to hold thousands of
 * runs, a real mouse wheel scrolls the list, and the page's own frames are
 * measured while it does — the time between two animation frames is how
 * long the main thread kept the browser from painting.
 *
 * What is asserted are BOUNDS, generous ones: the suite runs on a
 * development server (React's development build, StrictMode rendering
 * twice) beside other workers, so a number here is several times what a
 * production build shows. They catch a list that renders every row it
 * holds or a store that grows with the list — an order of magnitude, not a
 * regression of ten percent. The measured numbers are attached to the
 * scenario and printed, for a person to compare.
 */
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import type { Console } from "../support/console";
import { infiniteTable, scrollBox } from "../support/table";

const { Given, When, Then } = createBdd();

/** What a measurement found, times in milliseconds. */
interface Measured {
  frames: number;
  seconds: number;
  median: number;
  p95: number;
  worst: number;
  /** Tasks of 50 ms and more (the browser's own "long task"), and their time together. */
  longTasks: number;
  longTaskMs: number;
  /** The JavaScript heap in megabytes, where the browser says it. */
  heapMb: number | undefined;
}

type Metered = Window & { wireworkMeter?: { stop: () => Measured } };

const measured = new WeakMap<Page, Measured>();

/** Before opening a page: both fake servers hold that many runs (`window.wireworkListSize`, demo/install.ts). */
Given("the fake servers hold {int} runs", async ({ page }, size: number) => {
  await page.addInitScript((asked) => {
    (window as Console).wireworkListSize = asked;
  }, size);
});

When("I start measuring the page's frames", async ({ page }) => {
  await page.evaluate(() => {
    const gaps: number[] = [];
    const tasks: number[] = [];
    const started = performance.now();
    let last = started;
    let running = true;
    const tick = (now: number) => {
      if (!running) return;
      gaps.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const observer =
      typeof PerformanceObserver === "undefined"
        ? undefined
        : new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) tasks.push(entry.duration);
          });
    observer?.observe({ entryTypes: ["longtask"] });
    (window as Metered).wireworkMeter = {
      stop: () => {
        running = false;
        observer?.disconnect();
        const sorted = [...gaps].sort((a, b) => a - b);
        const at = (share: number) =>
          Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0);
        const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
        return {
          frames: gaps.length,
          seconds: Math.round((performance.now() - started) / 100) / 10,
          median: at(0.5),
          p95: at(0.95),
          worst: Math.round(sorted[sorted.length - 1] ?? 0),
          longTasks: tasks.length,
          longTaskMs: Math.round(tasks.reduce((sum, task) => sum + task, 0)),
          heapMb: heap === undefined ? undefined : Math.round(heap / 1_048_576),
        };
      },
    };
  });
});

When("I stop measuring the page's frames, calling it {string}", async ({ page, $testInfo }, name: string) => {
  const result = await page.evaluate(() => {
    const meter = (window as Metered).wireworkMeter;
    if (meter === undefined) throw new Error("nothing is being measured");
    return meter.stop();
  });
  measured.set(page, result);
  await $testInfo.attach(`${name}.json`, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  console.log(`[performance] ${name}: ${JSON.stringify(result)}`);
});

/**
 * A real wheel over the list, one notch (120 px, about three rows) a frame:
 * the pace is the page's own — a frame that takes long makes the next notch
 * wait, as a hand on a wheel would not, so the scroll is never easier than
 * a person's.
 */
When("I turn the mouse wheel {int} times over the infinite table", async ({ page }, notches: number) => {
  // The pointer over the box, brought into view first and checked to be what is under it there: a wheel over a
  // box below the window's edge — or under something else — turns nothing.
  await scrollBox(page).hover();
  for (let notch = 0; notch < notches; notch += 1) {
    await page.mouse.wheel(0, 120);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  }
});

const found = (page: Page): Measured => {
  const result = measured.get(page);
  if (result === undefined) throw new Error("nothing was measured: start and stop measuring first");
  return result;
};

Then("no frame took longer than {int} ms", ({ page }, budget: number) => {
  expect(found(page).worst, "the longest time between two frames, ms").toBeLessThanOrEqual(budget);
});

Then("95 percent of the frames took no longer than {int} ms", ({ page }, budget: number) => {
  expect(found(page).p95, "the 95th percentile of the time between two frames, ms").toBeLessThanOrEqual(budget);
});

/** The STORE stays small: a windowed list lets its farthest rows go. */
Then("the list holds at most {int} rows", async ({ page }, most: number) => {
  await expect.poll(async () => Number(await infiniteTable(page).getAttribute("data-held"))).toBeLessThanOrEqual(most);
});

/** The DOM stays small, however many rows are held. */
Then("the infinite table renders at most {int} rows", async ({ page }, most: number) => {
  const rendered = await infiniteTable(page).getByTestId("table-row").count();
  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThanOrEqual(most);
});

/** The wheel really moved the list: the first row in view is past that row of the whole list. */
Then("the infinite table has scrolled past row {int}", async ({ page }, row: number) => {
  const first = await scrollBox(page).evaluate((box) => {
    const rendered = box.querySelector<HTMLElement>('[data-testid="table-row"]');
    return rendered === null ? 0 : Math.floor(box.scrollTop / rendered.offsetHeight) + 1;
  });
  expect(first).toBeGreaterThan(row);
});
