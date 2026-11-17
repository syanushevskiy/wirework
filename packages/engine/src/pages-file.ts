/**
 * Pages as FILES (doc/ADR/0011-pages-as-code.md): one page cut out of the
 * view-model trees as a `PageFile` — its prebuilt templates with the
 * containers' layouts NESTED inside their cells, its own reactions, the
 * other widgets' templates by model path, what every role says about it
 * and its route — and files merged back into a tree, the nested layouts
 * back at their model paths. Pure functions, no I/O: the builder's "Export
 * page", a host's loader, a CLI check and the tests all use the same few.
 */
import {
  PAGE_FILE_KIND,
  PAGE_FILE_VERSION,
  PAGE_FOLDER_FILES,
  cellBaseSchema,
  getPath,
  isPlainObject,
  pageFileSchema,
  pageInfoFileSchema,
  pageRolesSchema,
  pageViewModelFileSchema,
  pageWidgetsFileSchema,
  setPath,
  type PageFile,
  type PageFolder,
  type PageFolderPart,
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

type Cell = Record<string, unknown>;
/** The key a cell in a FILE carries its container's template map under. */
const NESTED = "templates";

/**
 * Every cell inside a value, wherever its engine keeps it — a cell is a
 * `CellBase` object, which is what every engine's `cells` returns — passed
 * to `map` in document order and the result put back in its place; what
 * the mapped cell holds (its nested templates among it) is walked too.
 */
function mapCells(value: unknown, map: (cell: Cell) => Cell): unknown {
  if (Array.isArray(value)) return value.map((item) => mapCells(item, map));
  if (!isPlainObject(value)) return value;
  const mapped = cellBaseSchema.safeParse(value).success ? map(value) : value;
  return Object.fromEntries(Object.entries(mapped).map(([key, held]) => [key, mapCells(held, map)]));
}

/**
 * One page as a file, or undefined when the tree has no such page. A cell
 * of a widget whose definition `contains` a layout carries the widget's
 * template map NESTED (`templates`), the first such cell in document order
 * only — the page's templates, then the roles' — so a reader sees a card
 * and what is inside it in one place; the other widgets are the template
 * MAPS at the model paths the page's cells point at (a user may pick any
 * template of a model), each once, sorted by path so the file reads the
 * same whatever the layout's order. A dangling model path contributes
 * nothing — boot validation reports it, the file does not invent it.
 */
export function pageFile(
  { viewModels, registry, layoutEngines }: PageFileInput,
  page: string,
  route?: PageRoute,
): PageFile | undefined {
  const templates = viewModels.pages[page];
  if (templates === undefined) return undefined;
  // What every role says about this page (doc/ADR/0012-roles.md): its layouts travel with the page.
  const roles = Object.fromEntries(
    Object.entries(viewModels.roles ?? {}).flatMap(([role, entry]) => {
      const held = entry.pages?.[page];
      return held === undefined ? [] : [[role, held] as const];
    }),
  );
  const roleTemplates = Object.values(roles).flatMap((held) => Object.values(held.templates ?? {}));
  const cells = [...Object.values(templates), ...roleTemplates].flatMap((template) =>
    cellsWithin(registry, layoutEngines, viewModels, template),
  );
  const containers = new Set(
    cells.filter((cell) => (registry.get(cell.widget)?.contains?.length ?? 0) > 0).map((cell) => cell.model),
  );
  const written = new Set<string>();
  const nest = (value: unknown) =>
    mapCells(value, (cell) => {
      const model = cell["model"];
      if (typeof model !== "string" || !containers.has(model) || written.has(model)) return cell;
      written.add(model);
      const held = getPath(viewModels, model);
      return isPlainObject(held) ? { ...cell, [NESTED]: held } : cell;
    });
  const nestedTemplates = nest(templates) as PageFile["templates"];
  const nestedRoles = Object.fromEntries(
    Object.entries(roles).map(([role, held]) => [
      role,
      held.templates === undefined ? held : { ...held, templates: nest(held.templates) as typeof held.templates },
    ]),
  );
  const widgets = Object.fromEntries(
    [...new Set(cells.map((cell) => cell.model))]
      .filter((model) => !containers.has(model))
      .sort()
      .flatMap((model) => {
        const held = getPath(viewModels, model);
        return isPlainObject(held) ? [[model, held] as const] : [];
      }),
  );
  const on = viewModels.on?.[page];
  return {
    kind: PAGE_FILE_KIND,
    version: PAGE_FILE_VERSION,
    // The data format of what the file carries is the tree's it was cut from (doc/ADR/0017-versioning-and-upgrades.md).
    ...(viewModels.versions === undefined ? {} : { versions: viewModels.versions }),
    page,
    ...(route === undefined ? {} : { route }),
    templates: nestedTemplates,
    ...(on === undefined ? {} : { on }),
    widgets,
    ...(Object.keys(nestedRoles).length === 0 ? {} : { roles: nestedRoles }),
  };
}

/**
 * Every model path a file WRITES when merged: the keys of `widgets` and the
 * models of the cells that carry a nested template map — the page's and the
 * roles'. What an import checks before it lets the file near a tree.
 */
export function pageFileModels(file: PageFile): readonly string[] {
  const models = new Set(Object.keys(file.widgets));
  mapCells([file.templates, Object.values(file.roles ?? {}).map((held) => held.templates)], (cell) => {
    if (isPlainObject(cell[NESTED]) && typeof cell["model"] === "string") models.add(cell["model"]);
    return cell;
  });
  return [...models];
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

/**
 * The page file as a FOLDER's files (`PAGE_FOLDER_FILES`): what the page
 * is; what it looks like and does (its templates, the containers nested in
 * them, and its reactions); what every role says about it (`{}` where no
 * role does — the file is always there); and the other widgets' templates.
 * Keys a page has not — a route, reactions — are left out of their part,
 * as the file leaves them out.
 */
export function pageFolder(file: PageFile): PageFolder {
  const { kind, version, versions, page, route, templates, on, roles = {}, widgets } = file;
  return {
    page: {
      kind,
      version,
      ...(versions === undefined ? {} : { versions }),
      page,
      ...(route === undefined ? {} : { route }),
    },
    viewModel: { templates, ...(on === undefined ? {} : { on }) },
    roles,
    widgets,
  };
}

/**
 * A folder's files read back as one page file — each part checked against
 * its schema and the problem named after its file — or what is wrong with
 * the first part that is. `page.json` must name the page the folder is
 * named after when a folder name is given; an empty or absent `roles.json`
 * is a page no role says anything about.
 */
export function pageFromFolder(
  parts: Partial<Record<PageFolderPart, unknown>>,
  folder?: string,
): { file: PageFile } | { problem: string } {
  const page = pageInfoFileSchema.safeParse(parts.page);
  if (!page.success) return { problem: `${PAGE_FOLDER_FILES.page}: ${issuesText(page.error)}` };
  if (folder !== undefined && page.data.page !== folder) {
    return { problem: `${PAGE_FOLDER_FILES.page}: names the page "${page.data.page}" in the folder "${folder}"` };
  }
  const viewModel = pageViewModelFileSchema.safeParse(parts.viewModel);
  if (!viewModel.success) return { problem: `${PAGE_FOLDER_FILES.viewModel}: ${issuesText(viewModel.error)}` };
  const roles = parts.roles === undefined ? undefined : pageRolesSchema.safeParse(parts.roles);
  if (roles !== undefined && !roles.success)
    return { problem: `${PAGE_FOLDER_FILES.roles}: ${issuesText(roles.error)}` };
  const widgets = pageWidgetsFileSchema.safeParse(parts.widgets);
  if (!widgets.success) return { problem: `${PAGE_FOLDER_FILES.widgets}: ${issuesText(widgets.error)}` };
  return {
    file: {
      ...page.data,
      ...viewModel.data,
      ...(roles === undefined || Object.keys(roles.data).length === 0 ? {} : { roles: roles.data }),
      widgets: widgets.data,
    },
  };
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
 * templates replacing what was there; a template map nested in a cell goes
 * back to the cell's model path, the cell plain again. Two files that hold
 * the same widget template differently are a problem (and the later one
 * wins): a template two pages reference must be identical in both files.
 *
 * The tree made carries the files' FORMAT STAMP
 * (doc/ADR/0017-versioning-and-upgrades.md), for `upgradeTrees` to read:
 * files of one data format merge into a tree of that format. Files — or a
 * tree to merge into — of DIFFERENT formats are a problem: bring each
 * forward on its own first (merge it alone, upgrade, then merge the trees).
 */
export function mergePageFiles(files: readonly PageFile[], into?: ViewModels): MergedPages {
  const problems: string[] = [];
  const stamps = new Set(
    [...(into === undefined ? [] : [into.versions]), ...files.map((file) => file.versions)].map((stamp) =>
      JSON.stringify(Object.entries(stamp ?? {}).sort()),
    ),
  );
  if (stamps.size > 1) problems.push("the pages are of different data formats: upgrade each before merging them");
  const versions = into?.versions ?? files[0]?.versions;
  const pages = new Set<string>();
  const holders = new Map<string, string>();
  let viewModels: ViewModels = into ?? { ...(versions === undefined ? {} : { versions }), pages: {}, widgets: {} };
  const place = (page: string, model: string, templates: unknown) => {
    const holder = holders.get(model);
    if (holder !== undefined && JSON.stringify(getPath(viewModels, model)) !== JSON.stringify(templates))
      problems.push(`widget template "${model}" differs between pages "${holder}" and "${page}"`);
    holders.set(model, page);
    viewModels = setPath(viewModels, model, templates);
  };
  for (const file of files) {
    if (pages.has(file.page)) problems.push(`page "${file.page}" is in two files`);
    pages.add(file.page);
    // The nested maps out of the cells and to their model paths — the ones nested deeper first, by the same walk.
    const unnest = (value: unknown) =>
      mapCells(value, ({ [NESTED]: nested, ...cell }) => {
        if (isPlainObject(nested) && typeof cell["model"] === "string") place(file.page, cell["model"], unnest(nested));
        return cell;
      });
    const templates = unnest(file.templates) as PageFile["templates"];
    viewModels = { ...viewModels, pages: { ...viewModels.pages, [file.page]: templates } };
    if (file.on !== undefined) viewModels = { ...viewModels, on: { ...viewModels.on, [file.page]: file.on } };
    // The file says what every role says about the page: a role's entry for it is replaced, or dropped when the file has none.
    for (const role of new Set([...Object.keys(viewModels.roles ?? {}), ...Object.keys(file.roles ?? {})])) {
      const held = file.roles?.[role];
      const plain =
        held?.templates === undefined ? held : { ...held, templates: unnest(held.templates) as typeof held.templates };
      viewModels = updateRole(viewModels, role, ({ pages, ...entry }) => {
        const { [file.page]: _dropped, ...kept } = pages ?? {};
        return { ...entry, pages: plain === undefined ? kept : { ...kept, [file.page]: plain } };
      });
    }
    for (const [model, templates] of Object.entries(file.widgets)) place(file.page, model, templates);
  }
  const routes = files.flatMap((file) => (file.route === undefined ? [] : [{ page: file.page, ...file.route }]));
  return { viewModels, routes, problems };
}
