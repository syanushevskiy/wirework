/** The state inspector: the way a scenario puts data into the store, as a person would. */
import { expect, type Page } from "@playwright/test";

/**
 * Set one path in the inspector's JSON (creating missing parents) and apply
 * it. `accepted: false` is for an edit the inspector must REFUSE: it stays a
 * draft, so there is no "live" to wait for.
 */
export async function editStateJson(page: Page, path: string, value: unknown, accepted = true): Promise<void> {
  const editor = page.getByTestId("state-editor");
  const state = JSON.parse(await editor.inputValue()) as Record<string, unknown>;
  const segments = path.split(".");
  let cursor: Record<string, unknown> = state;
  for (const segment of segments.slice(0, -1)) {
    cursor[segment] ??= {};
    cursor = cursor[segment] as Record<string, unknown>;
  }
  const [last = path] = segments.slice(-1);
  cursor[last] = value;
  await editor.fill(JSON.stringify(state, null, 2));
  await page.getByTestId("state-apply").click();
  if (accepted) await expect(page.getByTestId("state-mode")).toHaveText("live");
}
