/**
 * View-model tree surgery shared by resolve, builders and editors. Nothing
 * here knows any layout engine: templates are opaque values, engines change
 * them (doc/layout-engines-design.md).
 * Every function is pure and returns a NEW tree.
 */
import {
  getPath,
  setPath,
  type PageUserViewModel,
  type PageViewModel,
  type UserViewModels,
  type ViewModels,
} from "@wirework/schema";

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

/** Write one BASE page template (a prebuilt view), creating the page's template map when absent. */
export function putPageTemplate(
  viewModels: ViewModels,
  page: string,
  name: string,
  template: PageViewModel,
): ViewModels {
  return { ...viewModels, pages: { ...viewModels.pages, [page]: { ...viewModels.pages?.[page], [name]: template } } };
}

/** One page of the USER overlay, rebuilt immutably (created when absent). */
function updateUserPage(
  userViewModels: UserViewModels,
  page: string,
  update: (userPage: PageUserViewModel) => PageUserViewModel,
): UserViewModels {
  return {
    ...userViewModels,
    pages: { ...userViewModels.pages, [page]: update(userViewModels.pages?.[page] ?? {}) },
  };
}

/**
 * Route a page edit into the USER overlay and select the user's template
 * `name` as the page view. The edit applies to what the user SEES: the
 * user's template while it is the selected view (an earlier edit of the
 * session may have just created it), otherwise a fresh copy of `shown` —
 * never placements merged into an own template that is not on screen.
 */
export function updateUserPageTemplate(
  userViewModels: UserViewModels,
  page: string,
  name: string,
  shown: PageViewModel,
  update: (template: PageViewModel) => PageViewModel,
): UserViewModels {
  return updateUserPage(userViewModels, page, (userPage) => {
    const templates = userPage.templates ?? {};
    const own = userPage.view === name ? templates[name] : undefined;
    return { ...userPage, view: name, templates: { ...templates, [name]: update(own ?? shown) } };
  });
}

/** Write one of the user's OWN page templates and select it as the page view. */
export function putUserPageTemplate(
  userViewModels: UserViewModels,
  page: string,
  name: string,
  template: PageViewModel,
): UserViewModels {
  return updateUserPage(userViewModels, page, (userPage) => ({
    ...userPage,
    view: name,
    templates: { ...userPage.templates, [name]: template },
  }));
}

/** Select the page view (a base or a user template by name); `undefined` goes back to the page's default. */
export function selectUserPageView(
  userViewModels: UserViewModels,
  page: string,
  name: string | undefined,
): UserViewModels {
  return updateUserPage(userViewModels, page, ({ view: _previous, ...userPage }) => ({
    ...userPage,
    ...(name === undefined ? {} : { view: name }),
  }));
}

/** Rename one of the user's OWN templates; the selection follows it. Unknown name -> same tree. */
export function renameUserPageTemplate(
  userViewModels: UserViewModels,
  page: string,
  from: string,
  to: string,
): UserViewModels {
  const templates = userViewModels.pages?.[page]?.templates;
  const moved = templates?.[from];
  if (templates === undefined || moved === undefined) return userViewModels;
  return updateUserPage(userViewModels, page, (userPage) => {
    const { [from]: _renamed, ...rest } = templates;
    return { ...userPage, ...(userPage.view === from ? { view: to } : {}), templates: { ...rest, [to]: moved } };
  });
}

/** Drop one of the user's OWN templates; a page that showed it goes back to its default. Unknown name -> same tree. */
export function removeUserPageTemplate(userViewModels: UserViewModels, page: string, name: string): UserViewModels {
  const templates = userViewModels.pages?.[page]?.templates;
  if (templates?.[name] === undefined) return userViewModels;
  return updateUserPage(userViewModels, page, ({ view, ...userPage }) => {
    const { [name]: _removed, ...rest } = templates;
    return { ...userPage, ...(view === undefined || view === name ? {} : { view }), templates: rest };
  });
}

/** Set one cell's settings overlay for one widget template in the USER overlay. */
export function updateUserCellSettings(
  userViewModels: UserViewModels,
  page: string,
  cellId: string,
  template: string,
  overrides: Record<string, unknown>,
): UserViewModels {
  return updateUserPage(userViewModels, page, (userPage) => {
    const cells = userPage.cells ?? {};
    const cell = cells[cellId] ?? {};
    return {
      ...userPage,
      cells: { ...cells, [cellId]: { ...cell, settings: { ...cell.settings, [template]: overrides } } },
    };
  });
}

/** Drop one cell's customisation from the USER overlay (after the cell is removed). */
export function removeUserCell(userViewModels: UserViewModels, page: string, cellId: string): UserViewModels {
  if (!userViewModels.pages?.[page]?.cells?.[cellId]) return userViewModels;
  return updateUserPage(userViewModels, page, (userPage) => {
    const { [cellId]: _removed, ...cells } = userPage.cells ?? {};
    return { ...userPage, cells };
  });
}

/**
 * Replace one widget template (`model` dot path + template name) in the
 * BASE tree. The template name is passed as its OWN segment: a name
 * containing a dot must not be split into a nested branch, which would
 * silently lose the edit.
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
