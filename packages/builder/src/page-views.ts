/**
 * Page VIEWS as pure functions (doc/page-views-design.md): a view is a page
 * template as the user sees it, and its KIND is where it lives — a base
 * template (`viewModels.pages.<page>.<name>`, prebuilt) or one of the
 * user's own (`userViewModels.pages.<page>.templates.<name>`, mine). Nothing
 * here is stored: the list is derived from the two trees, the file is the
 * template with its page and name around it.
 */
import { isPlainObject, type PageViewModel } from "@wirework/schema";
import { errorText, resolveTemplate, type LayoutEngineRegistry } from "@wirework/engine";
import type { ViewProblem } from "./locks";
import type { EditableTrees } from "./use-commit";

export type PageViewKind = "base" | "user";

export interface PageViewChoice {
  name: string;
  kind: PageViewKind;
}

/**
 * Every view of a page, prebuilt ones first, in the trees' order. A user
 * template with a base template's name shadows it (`pageTemplates`: same
 * name, user wins), so it is listed once, as the user's.
 */
export function pageViews({ viewModels, userViewModels }: EditableTrees, page: string): PageViewChoice[] {
  const own = Object.keys(userViewModels.pages?.[page]?.templates ?? {});
  return [
    ...Object.keys(viewModels.pages?.[page] ?? {})
      .filter((name) => !own.includes(name))
      .map((name): PageViewChoice => ({ name, kind: "base" })),
    ...own.map((name): PageViewChoice => ({ name, kind: "user" })),
  ];
}

/** `base` when free, else the first free `base-2`, `base-3`, … */
export function freeTemplateName(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * The first thing wrong with a name for a view, or undefined. No dots: the
 * cell schema forbids them in template names for the same reason (editors
 * join names into paths). `taken` is every view of the page, both kinds.
 */
export function templateNameProblem(name: string, taken: readonly string[]): ViewProblem | undefined {
  if (name.trim() === "") return { kind: "empty-name" };
  if (name.includes(".")) return { kind: "dotted-name" };
  return taken.includes(name) ? { kind: "name-taken", name } : undefined;
}

/* ------------------------------- the file ------------------------------- */

export const PAGE_VIEW_FILE_KIND = "wirework-page-view";
export const PAGE_VIEW_FILE_VERSION = 1;

/** A view as it travels between users: the template with its page and name around it. */
export interface PageViewFile {
  kind: typeof PAGE_VIEW_FILE_KIND;
  version: typeof PAGE_VIEW_FILE_VERSION;
  page: string;
  name: string;
  template: PageViewModel;
}

export const pageViewFile = (page: string, name: string, template: PageViewModel): PageViewFile => ({
  kind: PAGE_VIEW_FILE_KIND,
  version: PAGE_VIEW_FILE_VERSION,
  page,
  name,
  template,
});

export const exportPageView = (file: PageViewFile): string => JSON.stringify(file, null, 2);

/** The raw text as JSON, or why not. */
function parseJson(text: string): { value: unknown } | { problem: ViewProblem } {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { problem: { kind: "not-a-view", detail: errorText(error) } };
  }
}

/**
 * Read a view file back: the shape, then the template by the registered
 * engine (`resolveTemplate`: no template, an unknown engine or a template
 * it refuses). The page and the name are checked by the caller, who knows
 * which page is open and which names are taken. The template kept is the
 * one the engine validated.
 */
export function parsePageViewFile(
  text: string,
  layoutEngines: LayoutEngineRegistry,
): { file: PageViewFile } | { problem: ViewProblem } {
  const parsed = parseJson(text);
  if ("problem" in parsed) return parsed;
  const value = parsed.value;
  if (!isPlainObject(value) || value["kind"] !== PAGE_VIEW_FILE_KIND) {
    return { problem: { kind: "not-a-view", detail: `expected a "${PAGE_VIEW_FILE_KIND}" file` } };
  }
  if (value["version"] !== PAGE_VIEW_FILE_VERSION) {
    return { problem: { kind: "not-a-view", detail: `expected version ${PAGE_VIEW_FILE_VERSION}` } };
  }
  const { page, name } = value;
  if (typeof page !== "string" || page === "") return { problem: { kind: "not-a-view", detail: "no page" } };
  if (typeof name !== "string") return { problem: { kind: "not-a-view", detail: "no name" } };
  const resolution = resolveTemplate(layoutEngines, value["template"]);
  if (resolution.problem !== undefined) return { problem: { kind: "invalid-template", detail: resolution.problem } };
  return { file: pageViewFile(page, name, resolution.template) };
}
