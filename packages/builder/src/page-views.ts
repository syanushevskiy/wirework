/**
 * Page VIEWS as pure functions (doc/ADR/0006-page-views.md): a view is a page
 * template as the user sees it, and its KIND is where it lives — a base
 * template (`viewModels.pages.<page>.<name>`, prebuilt), one of a ROLE's
 * (`viewModels.roles.<role>.pages.<page>.templates.<name>`, the role's —
 * prebuilt for that role, doc/ADR/0012-roles.md) or one of the user's own
 * (`userViewModels.pages.<page>.templates.<name>`, mine). Nothing here is
 * stored: the list is derived from the trees, the file is the template with
 * its page and name around it.
 */
import { isPlainObject, type FormatStamp, type PageViewModel } from "@wirework/schema";
import {
  errorText,
  resolveTemplate,
  stampProblem,
  upgradeTrees,
  type LayoutEngineRegistry,
  type Migrations,
  type WidgetRegistry,
} from "@wirework/engine";
import type { ViewProblem } from "./locks";
import type { EditableTrees } from "./use-commit";

export type PageViewKind = PageViewChoice["kind"];

export type PageViewChoice =
  { name: string; kind: "base" } | { name: string; kind: "role"; role: string } | { name: string; kind: "user" };

/**
 * Every view of a page: the prebuilt ones, then each role's in the order
 * the roles are given, then the user's — the layers in the order they
 * apply. A later layer's template with an earlier one's name shadows it
 * (`pageTemplates`: same name, the later wins), so it is listed once, as
 * the later layer's.
 */
export function pageViews(
  { viewModels, userViewModels }: EditableTrees,
  page: string,
  roles: readonly string[] = [],
): PageViewChoice[] {
  const layers: { choice: (name: string) => PageViewChoice; names: string[] }[] = [
    { choice: (name) => ({ name, kind: "base" }), names: Object.keys(viewModels.pages?.[page] ?? {}) },
    ...roles.map((role) => ({
      choice: (name: string): PageViewChoice => ({ name, kind: "role", role }),
      names: Object.keys(viewModels.roles?.[role]?.pages?.[page]?.templates ?? {}),
    })),
    { choice: (name) => ({ name, kind: "user" }), names: Object.keys(userViewModels.pages?.[page]?.templates ?? {}) },
  ];
  return layers.flatMap(({ choice, names }, index) =>
    names.filter((name) => !layers.slice(index + 1).some((later) => later.names.includes(name))).map(choice),
  );
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
 * join names into paths). `taken` is every view of the page, every kind.
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
  /** The data format of the template (doc/ADR/0017-versioning-and-upgrades.md) — `version` is the envelope's. Absent = format 1. */
  versions?: FormatStamp;
  page: string;
  name: string;
  template: PageViewModel;
}

/** The file of a view; `versions` is the format the trees it is taken from are in (`migrations.current()`). */
export const pageViewFile = (
  page: string,
  name: string,
  template: PageViewModel,
  versions?: FormatStamp,
): PageViewFile => ({
  kind: PAGE_VIEW_FILE_KIND,
  version: PAGE_VIEW_FILE_VERSION,
  ...(versions === undefined || Object.keys(versions).length === 0 ? {} : { versions }),
  page,
  name,
  template,
});

/** What reads a view file of ANOTHER data format: the steps, and the widgets as registered now. */
export interface ViewFileDoor {
  migrations: Migrations;
  registry: WidgetRegistry;
}

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
 *
 * A file of an OLDER data format is brought forward first, through the same
 * door every stored tree goes through (`door`); one saved by a NEWER
 * version — or by one too old to read — is refused, with the reason.
 */
export function parsePageViewFile(
  text: string,
  layoutEngines: LayoutEngineRegistry,
  door?: ViewFileDoor,
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
  const unread = stampProblem(value["versions"], door?.migrations);
  if (unread !== undefined) return { problem: { kind: "not-a-view", detail: unread } };
  // The template as an overlay of one view: the shape the door reads.
  const template =
    door === undefined
      ? value["template"]
      : upgradeTrees(
          {
            userViewModels: {
              versions: value["versions"] as FormatStamp | undefined,
              pages: { [page]: { templates: { [name]: value["template"] as PageViewModel } } },
            },
          },
          door,
        ).userViewModels?.pages?.[page]?.templates?.[name];
  const resolution = resolveTemplate(layoutEngines, template);
  if (resolution.problem !== undefined) return { problem: { kind: "invalid-template", detail: resolution.problem } };
  return { file: pageViewFile(page, name, resolution.template, door?.migrations.current()) };
}
