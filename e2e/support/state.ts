/**
 * The state inspector: the way a scenario puts data into the store, as a
 * person would. On a demo page the panel is four editors
 * (apps/playground/src/state-sections.ts) — the page's own data, the page's
 * own views (its part of `viewModels` / `userViewModels`, nothing of another
 * page's), the global settings (`app.settings`, shown as the settings object
 * itself) and the global session (the rest of `app`, shown as that object);
 * the builder has one. A path picks its editor.
 */
import { expect, type Locator, type Page } from "@playwright/test";

const APP = "app";
const SETTINGS = "app.settings";
const CONFIG_ROOTS = new Set(["viewModels", "userViewModels"]);

/** Which editor a path belongs to, and the path INSIDE that editor's JSON. */
function sectionOf(path: string): { key: string; path: string } {
  if (path === SETTINGS || path.startsWith(`${SETTINGS}.`))
    return { key: "settings", path: path.slice(SETTINGS.length + 1) };
  if (path === APP || path.startsWith(`${APP}.`)) return { key: "session", path: path.slice(APP.length + 1) };
  return { key: CONFIG_ROOTS.has(path.split(".")[0] ?? "") ? "views" : "page", path };
}

/**
 * The editor of a section — or the only one, where the panel has a single
 * editor (the builder): there the whole tree is one JSON, so a path is
 * taken whole.
 */
async function editorOf(page: Page, key: string): Promise<{ editor: Locator; whole: boolean }> {
  const editors = page.getByTestId("state-editor");
  return (await editors.count()) === 1
    ? { editor: editors.first(), whole: true }
    : { editor: editors.and(page.locator(`[data-section="${key}"]`)), whole: false };
}

/** The editor that holds the page's views — for an edit meant to touch `viewModels`. */
export const configurationEditor = async (page: Page): Promise<Locator> => (await editorOf(page, "views")).editor;

/** Every editor's text, as one: what "the state JSON contains" reads. */
export async function stateJson(page: Page): Promise<string> {
  const editors = await page.getByTestId("state-editor").all();
  return (await Promise.all(editors.map((editor) => editor.inputValue()))).join("\n");
}

/** Apply the draft of the editor's section and wait until it is live again (or not, for an edit that must be refused). */
export async function applyEditor(page: Page, editor: Locator, accepted = true): Promise<void> {
  const key = (await editor.getAttribute("data-section")) ?? "";
  await page
    .getByTestId("state-apply")
    .and(page.locator(`[data-section="${key}"]`))
    .click();
  if (accepted) {
    await expect(page.getByTestId("state-mode").and(page.locator(`[data-section="${key}"]`))).toHaveText("live");
  }
}

/**
 * Set one path in its editor's JSON (creating missing parents) and apply
 * it. `accepted: false` is for an edit the inspector must REFUSE: it stays a
 * draft, so there is no "live" to wait for.
 */
export async function editStateJson(page: Page, path: string, value: unknown, accepted = true): Promise<void> {
  const section = sectionOf(path);
  const { editor, whole } = await editorOf(page, section.key);
  const inside = whole ? path : section.path;
  // The inspector prints a busy store a few times a second: edit what the store holds, not a text it is behind.
  await expect(editor).not.toHaveAttribute("data-behind", "true");
  const state = JSON.parse(await editor.inputValue()) as Record<string, unknown>;
  if (inside === "") {
    await editor.fill(JSON.stringify(value, null, 2));
  } else {
    const segments = inside.split(".");
    let cursor: Record<string, unknown> = state;
    for (const segment of segments.slice(0, -1)) {
      cursor[segment] ??= {};
      cursor = cursor[segment] as Record<string, unknown>;
    }
    const [last = inside] = segments.slice(-1);
    cursor[last] = value;
    await editor.fill(JSON.stringify(state, null, 2));
  }
  await applyEditor(page, editor, accepted);
}
