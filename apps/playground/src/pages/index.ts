/**
 * The demo application's PAGES, one folder each (doc/ADR/0011-pages-as-code.md):
 *
 *   pages/<page>/page.json       what the page is — its name and its route
 *   pages/<page>/viewModel.json  what it looks like and does — its prebuilt
 *                                layouts with the cards' (tabs', dialogs')
 *                                layouts NESTED in their cells, its reactions
 *   pages/<page>/roles.json      what every role says about it ({} where none does)
 *   pages/<page>/widgets.json    the templates of the widgets that show or
 *                                edit a value, by model path
 *
 * The three files are one page file (`pageFromFolder`), and a page's view
 * models are that file alone, merged into a tree of its own: what the store
 * gets when the page OPENS (boot.ts) — nothing of another page. Vite reads
 * the folders at build time; a folder with a problem fails the boot loudly,
 * naming the file, before any page shows.
 */
import { mergePageFiles, pageFromFolder } from "@wirework/engine";
import type { PageFile, PageFolderPart, PageRoute, ViewModels } from "@wirework/schema";
import { DEMO_PAGES, type DemoPage } from "@wirework/view-data-models-examples";

const PART_FILE = /^\.\/([^/]+)\/(page|viewModel|roles|widgets)\.json$/;

/** Every folder's files, as parsed JSON, by folder and part. */
const folders = new Map<string, Partial<Record<PageFolderPart, unknown>>>();
for (const [path, value] of Object.entries(
  import.meta.glob<unknown>("./*/*.json", { eager: true, import: "default" }),
)) {
  const match = PART_FILE.exec(path);
  if (match === null) throw new Error(`pages/${path.slice(2)}: not one of a page folder's files`);
  const [, folder = "", part = ""] = match;
  folders.set(folder, { ...folders.get(folder), [part]: value });
}

const isDemoPage = (name: string): name is DemoPage => (DEMO_PAGES as readonly string[]).includes(name);

/** The page files, read from their folders — every demo page has one, and every folder is a demo page's. */
export const demoPageFiles: Record<DemoPage, PageFile> = Object.fromEntries(
  [...folders].map(([folder, parts]) => {
    if (!isDemoPage(folder)) throw new Error(`pages/${folder}: not a page of the demo (DEMO_PAGES)`);
    const read = pageFromFolder(parts, folder);
    if ("problem" in read) throw new Error(`pages/${folder}/${read.problem}`);
    return [folder, read.file];
  }),
) as Record<DemoPage, PageFile>;
for (const page of DEMO_PAGES) {
  if (!(page in demoPageFiles)) throw new Error(`pages/${page}: the demo page has no folder`);
}

/** The pages' routes, in the menu's order (DEMO_PAGES). */
export const demoPageRoutes: readonly (PageRoute & { page: DemoPage })[] = DEMO_PAGES.flatMap((page) => {
  const route = demoPageFiles[page].route;
  return route === undefined ? [] : [{ page, ...route }];
});

/** One page's view models — a tree holding this page alone: its templates, its reactions, its roles' entries, its widgets. */
export const pageViewModels = (page: DemoPage): ViewModels => mergePageFiles([demoPageFiles[page]]).viewModels;

/** Every page's view models as one tree: what a user's saved views are read with when they are loaded (boot.ts). */
export const allViewModels = (): ViewModels => mergePageFiles(Object.values(demoPageFiles)).viewModels;
