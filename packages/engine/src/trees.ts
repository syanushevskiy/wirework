/**
 * View-model tree surgery shared by resolve, validation, builders and
 * editors. Nothing here knows any layout engine: templates are opaque
 * values, engines change them (doc/layout-engines-design.md).
 * Every function is pure and returns a NEW tree.
 */
import type { PageViewModel, UserViewModels, ViewModels } from "@wirework/schema";
import { deletePath, getPath, setPath } from "./paths";

/**
 * Page templates as the user sees them: base templates with the user's own
 * layered on top (same name -> user wins). Undefined when the page exists
 * in neither tree. Defensive against a structurally broken tree (state
 * inspector) — that must surface as a page problem, not a TypeError.
 */
export function pageTemplates(
  viewModels: ViewModels,
  userViewModels: UserViewModels | undefined,
  page: string,
): Record<string, unknown> | undefined {
  const base = viewModels.pages?.[page];
  const user = userViewModels?.pages?.[page]?.templates;
  return base === undefined && user === undefined ? undefined : { ...base, ...user };
}

/** Replace one BASE page template immutably; unknown page/template -> same tree. */
export function updatePageTemplate(
  viewModels: ViewModels,
  page: string,
  view: string,
  update: (current: PageViewModel) => PageViewModel,
): ViewModels {
  const templates = viewModels.pages?.[page];
  const current = templates?.[view];
  if (!templates || !current) return viewModels;
  return {
    ...viewModels,
    pages: { ...viewModels.pages, [page]: { ...templates, [view]: update(current) } },
  };
}

/**
 * Route a page edit into the USER overlay and select the user's template
 * `name` as the page view. The edit applies to what the user SEES: the
 * user's template while it is the selected view (an earlier edit of the
 * session may have just created it), otherwise a fresh copy of `shown` —
 * never placements merged into an own template that is not on screen
 * (team-tiger review, Alexei).
 */
export function updateUserPageTemplate(
  userViewModels: UserViewModels,
  page: string,
  name: string,
  shown: PageViewModel,
  update: (template: PageViewModel) => PageViewModel,
): UserViewModels {
  const userPage = userViewModels.pages?.[page] ?? {};
  const templates = userPage.templates ?? {};
  const own = userPage.view === name ? templates[name] : undefined;
  return {
    ...userViewModels,
    pages: {
      ...userViewModels.pages,
      [page]: {
        ...userPage,
        view: name,
        templates: { ...templates, [name]: update(own ?? shown) },
      },
    },
  };
}

/** Set one cell's settings overlay for one widget template in the USER overlay. */
export function updateUserCellSettings(
  userViewModels: UserViewModels,
  page: string,
  cellId: string,
  template: string,
  overrides: Record<string, unknown>,
): UserViewModels {
  const userPage = userViewModels.pages?.[page] ?? {};
  const cells = userPage.cells ?? {};
  const cell = cells[cellId] ?? {};
  return {
    ...userViewModels,
    pages: {
      ...userViewModels.pages,
      [page]: {
        ...userPage,
        cells: {
          ...cells,
          [cellId]: { ...cell, settings: { ...cell.settings, [template]: overrides } },
        },
      },
    },
  };
}

/** Drop one cell's customisation from the USER overlay (after the cell is removed). */
export function removeUserCell(userViewModels: UserViewModels, page: string, cellId: string): UserViewModels {
  const userPage = userViewModels.pages?.[page];
  if (!userPage?.cells?.[cellId]) return userViewModels;
  const { [cellId]: _removed, ...cells } = userPage.cells;
  return { ...userViewModels, pages: { ...userViewModels.pages, [page]: { ...userPage, cells } } };
}

/** Drop a whole widget template map (`model` dot path) from the BASE tree. */
export function removeWidgetModel(viewModels: ViewModels, model: string): ViewModels {
  return deletePath(viewModels, model);
}

/**
 * Replace one widget template (`model` dot path + template name) in the
 * BASE tree. The template name is passed as its OWN segment: a name
 * containing a dot must not be split into a nested branch (that silently
 * lost the edit — team-tiger, Katya).
 */
export function updateWidgetTemplate(
  viewModels: ViewModels,
  model: string,
  template: string,
  update: (current: unknown) => unknown,
): ViewModels {
  const segments = [...model.split("."), template];
  return setPath(viewModels, segments, update(getPath(viewModels, segments)));
}
