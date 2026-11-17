/**
 * A page file IMPORTED into a running application
 * (doc/ADR/0011-pages-as-code.md, "Import page"): the counterpart of the
 * export. The text is a file from somebody else, so it is read as data and
 * refused unless it is what it says — ONE page, this one:
 *
 *  - a page file by its shape, of a data format this version reads (an
 *    older one is brought forward through the door, a newer one refused);
 *  - the page that is open, not another;
 *  - writing widget templates only — every model path under `widgets.` —
 *    and replacing none that this page did not hold before
 *    (doc/ADR/0019-security.md, finding 5);
 *  - leaving the tree with no error it did not have.
 *
 * Pure: the tree to commit comes back, nothing is written here.
 */
import type { PageFile, ViewModels } from "@wirework/schema";
import { getPath } from "@wirework/schema";
import { stampProblem, stamped, upgradeTrees } from "./migrations";
import { mergePageFiles, pageFile, pageFileModels, parsePageFile } from "./pages-file";
import { validateViewModels, type ValidateInput } from "./validate";

/** The registries and the tree an import is checked against — validation's own input, the user's overlay aside. */
export type PageImportInput = Omit<ValidateInput, "userViewModels">;

export interface PageImport {
  /** The tree with the file's page in it: what to commit. */
  viewModels: ViewModels;
  /** The file as merged — in this version's data format. */
  file: PageFile;
  /** What validation warns about that it did not before: shown, never a refusal. */
  warnings: readonly string[];
}

const WIDGETS = "widgets.";
const sameStamp = (a: unknown, b: unknown): boolean =>
  JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());

/** The file in the data format of the tree it goes into, or why it cannot be brought there. */
function broughtForward(input: PageImportInput, file: PageFile): { file: PageFile } | { problem: string } {
  const { registry, layoutEngines, migrations, viewModels } = input;
  if (sameStamp(file.versions, viewModels.versions)) return { file };
  const different = "the file is of another data format than this application's pages";
  if (migrations === undefined) return { problem: different };
  // Through the door alone, then cut again: the same page, in the format this version writes.
  const upgraded = upgradeTrees({ viewModels: mergePageFiles([file]).viewModels }, { migrations, registry });
  const [failed] = upgraded.problems;
  if (failed !== undefined) return { problem: failed };
  const current =
    upgraded.viewModels === undefined
      ? undefined
      : pageFile({ viewModels: upgraded.viewModels, registry, layoutEngines }, file.page, file.route);
  return current !== undefined && sameStamp(current.versions, viewModels.versions)
    ? { file: current }
    : { problem: different };
}

/** The file's page laid into the tree, or the first reason it is refused. */
export function importPageFile(input: PageImportInput, page: string, text: string): PageImport | { problem: string } {
  const parsed = parsePageFile(text);
  if ("problem" in parsed) return parsed;
  if (parsed.file.page !== page) {
    return { problem: `the file is the page "${parsed.file.page}", and this is the page "${page}"` };
  }
  const unread = stampProblem(parsed.file.versions, input.migrations);
  if (unread !== undefined) return { problem: `the file was ${unread}` };

  const models = pageFileModels(parsed.file);
  const outside = models.find((model) => !model.startsWith(WIDGETS));
  if (outside !== undefined) return { problem: `the file writes outside the widgets: "${outside}"` };
  const before = pageFile(input, page);
  const own = new Set(before === undefined ? [] : pageFileModels(before));
  const foreign = models.find((model) => !own.has(model) && getPath(input.viewModels, model) !== undefined);
  if (foreign !== undefined) {
    return { problem: `the file replaces the widget template "${foreign}", which this page did not hold` };
  }

  // The tree in the store is past the door: it IS of the format this version writes, stamped or not yet.
  const tree = stamped(input.viewModels, input.migrations);
  const forward = broughtForward({ ...input, viewModels: tree }, parsed.file);
  if ("problem" in forward) return forward;
  const merged = mergePageFiles([forward.file], tree);
  const [conflict] = merged.problems;
  if (conflict !== undefined) return { problem: conflict };

  const said = (problems: readonly { location: string; message: string }[]) =>
    problems.map(({ location, message }) => `${location}: ${message}`);
  const was = validateViewModels(input);
  const now = validateViewModels({ ...input, viewModels: merged.viewModels });
  const [broken] = said(now.errors).filter((error) => !said(was.errors).includes(error));
  if (broken !== undefined) return { problem: `the page would not work — ${broken}` };
  return {
    viewModels: merged.viewModels,
    file: forward.file,
    warnings: said(now.warnings).filter((warning) => !said(was.warnings).includes(warning)),
  };
}
