/**
 * Pages as FILES (doc/pages-as-code-design.md): one page cut out of the
 * view-model trees as a `PageFile` — its prebuilt templates, its own
 * reactions, the widget templates its cells reference (the cells inside
 * containers and the roles' layouts included), what every role says about
 * it and its route — and files merged back into a tree.
 * Pure functions, no I/O: the builder's "Export page", a host's loader, a
 * CLI check and the tests all use the same three.
 */
import {
  PAGE_FILE_KIND,
  PAGE_FILE_VERSION,
  getPath,
  isPlainObject,
  pageFileSchema,
  setPath,
  type PageFile,
  type PageRoute,
  type ViewModels,
} from "@wirework/schema";
import type { LayoutEngineRegistry } from "./layout-engines";
import { errorText, issuesText } from "./messages";
import { cellsWithin } from "./nesting";
import type { WidgetRegistry } from "./registry";
import { updateRole } from "./trees";

export interface PageFileInput {
  viewModels: ViewModels;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
}

/** The file's name on disk: `<page>.page.json`. */
export const pageFileName = (page: string): string => `${page}.page.json`;

/**
 * One page as a file, or undefined when the tree has no such page. The
 * widgets are the template MAPS at the model paths the page's cells point
 * at (a user may pick any template of a model), each once, sorted by path
 * so the file reads the same whatever the layout's order; a dangling model
 * path contributes nothing — boot validation reports it, the file does not
 * invent it.
 */
export function pageFile(
  { viewModels, registry, layoutEngines }: PageFileInput,
  page: string,
  route?: PageRoute,
): PageFile | undefined {
  const templates = viewModels.pages[page];
  if (templates === undefined) return undefined;
  // What every role says about this page (doc/roles-design.md): its layouts travel with the page.
  const roles = Object.fromEntries(
    Object.entries(viewModels.roles ?? {}).flatMap(([role, entry]) => {
      const held = entry.pages?.[page];
      return held === undefined ? [] : [[role, held] as const];
    }),
  );
  const roleTemplates = Object.values(roles).flatMap((held) => Object.values(held.templates ?? {}));
  const models = [...Object.values(templates), ...roleTemplates]
    .flatMap((template) => cellsWithin(registry, layoutEngines, viewModels, template))
    .map((cell) => cell.model);
  const widgets = Object.fromEntries(
    [...new Set(models)].sort().flatMap((model) => {
      const held = getPath(viewModels, model);
      return isPlainObject(held) ? [[model, held] as const] : [];
    }),
  );
  const on = viewModels.on?.[page];
  return {
    kind: PAGE_FILE_KIND,
    version: PAGE_FILE_VERSION,
    page,
    ...(route === undefined ? {} : { route }),
    templates,
    ...(on === undefined ? {} : { on }),
    widgets,
    ...(Object.keys(roles).length === 0 ? {} : { roles }),
  };
}

/** The file as text: pretty-printed, so a change of one setting is a one-line diff. */
export const exportPageFile = (file: PageFile): string => JSON.stringify(file, null, 2);

/** A page file read back: the shape checked, or what is wrong with it in the schema's words. */
export function parsePageFile(text: string): { file: PageFile } | { problem: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { problem: `not JSON: ${errorText(error)}` };
  }
  const parsed = pageFileSchema.safeParse(value);
  return parsed.success ? { file: parsed.data } : { problem: `not a page file: ${issuesText(parsed.error)}` };
}

export interface MergedPages {
  viewModels: ViewModels;
  /** The routes the files carry, in the files' order. */
  routes: readonly (PageRoute & { page: string })[];
  /** What the files disagree on: a page twice, or a widget template two pages hold differently. */
  problems: readonly string[];
}

/**
 * Many page files as one tree — laid over `into` when given (an
 * application's own view models), each file's page, reactions and widget
 * templates replacing what was there. Two files that hold the same widget
 * template differently are a problem (and the later one wins): a template
 * two pages reference must be identical in both files.
 */
export function mergePageFiles(files: readonly PageFile[], into?: ViewModels): MergedPages {
  const problems: string[] = [];
  const pages = new Set<string>();
  const holders = new Map<string, string>();
  let viewModels: ViewModels = into ?? { pages: {}, widgets: {} };
  for (const file of files) {
    if (pages.has(file.page)) problems.push(`page "${file.page}" is in two files`);
    pages.add(file.page);
    viewModels = { ...viewModels, pages: { ...viewModels.pages, [file.page]: file.templates } };
    if (file.on !== undefined) viewModels = { ...viewModels, on: { ...viewModels.on, [file.page]: file.on } };
    // The file says what every role says about the page: a role's entry for it is replaced, or dropped when the file has none.
    for (const role of new Set([...Object.keys(viewModels.roles ?? {}), ...Object.keys(file.roles ?? {})])) {
      const held = file.roles?.[role];
      viewModels = updateRole(viewModels, role, ({ pages, ...entry }) => {
        const { [file.page]: _dropped, ...kept } = pages ?? {};
        return { ...entry, pages: held === undefined ? kept : { ...kept, [file.page]: held } };
      });
    }
    for (const [model, templates] of Object.entries(file.widgets)) {
      const holder = holders.get(model);
      if (holder !== undefined && JSON.stringify(getPath(viewModels, model)) !== JSON.stringify(templates))
        problems.push(`widget template "${model}" differs between pages "${holder}" and "${file.page}"`);
      holders.set(model, file.page);
      viewModels = setPath(viewModels, model, templates);
    }
  }
  const routes = files.flatMap((file) => (file.route === undefined ? [] : [{ page: file.page, ...file.route }]));
  return { viewModels, routes, problems };
}
