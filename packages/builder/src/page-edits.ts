/**
 * Page EDITS as pure functions: everything an edit session does to the two
 * trees, without React — `usePageEditing` keeps the session (its ops, the
 * selected cell, Save and Cancel) and calls these. Every edit is an `Op`,
 * `(trees) => trees`, made from an `EditContext` of eight facts and
 * replayed over the store's live trees; what it needs it reads from the
 * trees it is given, never from the moment it was made.
 *
 * Edit target (doc/ADR/0003-layout-engines.md, "Where edits go"):
 *  - "user": a page with the user overlay on — the demo as it opens, the
 *    builder once it holds a widget and the visitor turns the overlay on.
 *    Page-template ops edit what the user SEES: one of their own views in
 *    place, or a prebuilt one as a fresh copy named USER_PAGE_TEMPLATE (the
 *    first free "my-own", "my-own-2", …) that becomes the page view
 *    (doc/ADR/0006-page-views.md); widget edits become per-cell settings
 *    overlays. The base view models stay untouched.
 *  - { role }: a ROLE's pages (doc/ADR/0012-roles.md) — the same ops as the
 *    user's, written into `viewModels.roles.<role>` through `updateRole`:
 *    a prebuilt view edited becomes the role's own copy named after the
 *    role, a widget's edit the role's settings for that cell, a chosen
 *    widget template the role's `view` for it. The page is read AS THAT
 *    ROLE SEES IT: the roles up to it, no user overlay.
 *  - "base": the overlay is off (how the builder opens). Ops rewrite the
 *    view models — the shared page.
 * The user overlay is ON exactly when the target is the user's.
 *
 * Engine ops never look inside a template: the registered plugin for the
 * template's engine applies the change, removes the cell, etc.
 *
 * The LOCATION (doc/ADR/0009-containers.md): an edit is of the page's layout
 * — or, `at` a chain of containers (`card-1`, `tabs-1/tabs.0.content`), of
 * the layout INSIDE a container's widget template, shown as the page and
 * edited by the same ops. On the shared page the ops rewrite that template;
 * in a user's (or a role's) view they write that overlay's OWN copy of the
 * layout as the container's setting FOR THE VIEW of the page that shows it
 * (`viewCells["my-own"]["card-1"].settings.default.content` — a prebuilt
 * view is copied into the overlay's own first, as a page edit copies it),
 * so every view keeps its own layouts inside its containers; the cells
 * inside are customised under their chain keys (`cells["card-1/button"]`).
 */
import {
  RESERVED_VIEW_MODEL_KEYS,
  deletePath,
  getPath,
  isPlainObject,
  setPath,
  settingFields,
  type AnyLayoutEngine,
  type PageViewModel,
  type UserViewModels,
  type ViewModels,
  type WidgetBindings,
} from "@wirework/schema";
import {
  cellsWithin,
  foldViewCells,
  holdsUserCellSettings,
  innerOverlaysAt,
  layoutPathAt,
  locateLayoutAt,
  overlayLayers,
  pageTemplates,
  putUserViewCells,
  removeUserCell,
  resetUserCellSettings,
  resolveTemplate,
  selectUserCellView,
  shownLayers,
  shownView,
  updateRole,
  updateUserCellSettings,
  updateUserLayoutAt,
  updateUserPageTemplate,
  updateWidgetTemplate,
  widgetTemplates,
  type LayoutEngineRegistry,
  type Overlays,
  type ResolveLayers,
  type WidgetRegistry,
} from "@wirework/engine";
import { freeTemplateName } from "./page-views";
import { modelNamespaceOf, withEmptyLayouts, type BuilderNaming } from "./naming";
import type { EditableTrees } from "./use-commit";
import type { EditableCell } from "./use-widget-editor";
import { templateOf, type WidgetSettings } from "./form-drafts";

/** Where edits go: the shared page, a role's pages, or the user's own overlay. */
export type EditTarget = "user" | "base" | { role: string };

/** Name of the user's own copy of a prebuilt page template (the sketch's "my own" pill); numbered when taken. */
export const USER_PAGE_TEMPLATE = "my-own";

/** The role a target edits for, if it is one. */
export const roleOf = (target: EditTarget): string | undefined =>
  typeof target === "object" ? target.role : undefined;
/** Whether two targets are the same place. */
export const sameTarget = (a: EditTarget, b: EditTarget): boolean =>
  a === b || (roleOf(a) !== undefined && roleOf(a) === roleOf(b));

/**
 * The OVERLAY a user or role target writes: how to read its entry out of
 * the trees and how to write it back — the one difference between the two,
 * so every op (here and in use-page-views) is written once.
 */
export interface OverlayTarget {
  read: (trees: EditableTrees) => UserViewModels;
  write: (trees: EditableTrees, update: (entry: UserViewModels) => UserViewModels) => EditableTrees;
  /** What a copy of a prebuilt view is named for this overlay: the user's "my-own", a role's own name. */
  copyName: string;
}

/** The overlay a target writes — none for the shared page. */
export const overlayTargetOf = (target: EditTarget): OverlayTarget | undefined => {
  if (target === "base") return undefined;
  if (target === "user") {
    return {
      read: (trees) => trees.userViewModels,
      write: (trees, update) => ({ ...trees, userViewModels: update(trees.userViewModels) }),
      copyName: USER_PAGE_TEMPLATE,
    };
  }
  const { role } = target;
  return {
    read: (trees) => trees.viewModels.roles?.[role] ?? {},
    write: (trees, update) => ({ ...trees, viewModels: updateRole(trees.viewModels, role, update) }),
    copyName: role,
  };
};

/** One pure edit, replayed onto the store's current trees on every render and on Save. */
export type Op = (trees: EditableTrees) => EditableTrees;

/** Where the shown layout is read and written from — what every op needs, and nothing else. */
export interface EditLocation {
  readonly layoutEngines: LayoutEngineRegistry;
  readonly page: string;
  /** The layout edited: the page's own when absent, else the one inside the containers chained here. */
  readonly at: string | undefined;
  /** Where edits go — and whether the user overlay is on: it is, exactly for the user's target. */
  readonly target: EditTarget;
  /** The roles the page is shown AS (doc/ADR/0012-roles.md): the viewer's, or the application's up to the role edited for. */
  readonly roles: readonly string[] | undefined;
}

/** The eight facts an op is made from: the location, the widgets, the builder's naming, and the view the shown layout resolved to. */
export interface EditContext extends EditLocation {
  readonly registry: WidgetRegistry;
  readonly naming: BuilderNaming;
  /** The plan's view of the shown layout; undefined while it does not resolve. */
  readonly view: string | undefined;
}

/** A chain of names joined by "/": the nested page name (`demo/card-1`), a cell's overlay key (`card-1/button`). */
export const chained = (...parts: (string | undefined)[]): string =>
  parts.filter((part) => part !== undefined).join("/");

/**
 * The layers a page is read through — the roles' entries, then the user's
 * overlay when it is on — from the trees given, as the page's SHOWN view
 * reads them: what a layer holds for that view alone (the layouts inside
 * its containers) on top of its cells.
 */
export const layersOf = ({ page, target, roles }: EditLocation, source: EditableTrees): Overlays =>
  shownLayers(
    source.viewModels,
    overlayLayers(source.viewModels, roles, target === "user" ? source.userViewModels : undefined),
    page,
  );

/**
 * What the plan of the shown layout is made of: the page itself — or the
 * layout `at` the chain, shown AS a page under its nested name: the shared
 * page's layout, or through the overlays the one the viewer sees (their own
 * copy, held as the container's setting), with the inner cells' overlay
 * entries under their own ids. A chain that leads nowhere is a page without
 * a template, and the plan says so. The page keeps the user's overlay as
 * such: that is the way a broken overlay is checked and reported on the plan.
 */
export function plannedInput(
  where: EditLocation,
  shown: EditableTrees,
): { page: string; viewModels: ViewModels } & ResolveLayers {
  const { layoutEngines, page, at, target, roles } = where;
  if (at === undefined) {
    const userViewModels = target === "user" ? shown.userViewModels : undefined;
    return { page, viewModels: shown.viewModels, userViewModels, roles };
  }
  const layoutPage = chained(page, at);
  const overlays = layersOf(where, shown);
  const located = locateLayoutAt(layoutEngines, shown.viewModels, overlays, page, at);
  // The boundary: a layout read out of a widget template is raw; the plan validates it as it does a page's.
  const template = located?.template as PageViewModel | undefined;
  const viewModels: ViewModels = {
    ...shown.viewModels,
    pages: { [layoutPage]: template === undefined ? {} : { default: template } },
  };
  return { page: layoutPage, viewModels, overlays: innerOverlaysAt(overlays, page, at, layoutPage) };
}

/**
 * The SHOWN layout as the shared page holds it, found in `source`: the
 * page's own template, or the one at the chain inside a container — with
 * its engine, the raw template validated and its cells. Undefined when the
 * page does not resolve or the chain leads nowhere.
 */
export function locateShown({ layoutEngines, page, at, view }: EditContext, source: EditableTrees) {
  const path =
    at === undefined
      ? view === undefined
        ? undefined
        : ["pages", page, view]
      : layoutPathAt(layoutEngines, source.viewModels, page, at);
  if (path === undefined) return undefined;
  const resolution = resolveTemplate(layoutEngines, getPath(source.viewModels, path));
  return resolution.problem === undefined ? { path, ...resolution } : undefined;
}

/**
 * Where an overlay-target page op lands: the shown view itself when it is
 * one of the overlay's own, else a free name for the copy it makes of the
 * shown prebuilt one.
 */
const ownTemplateFor = (overlay: OverlayTarget, trees: EditableTrees, layers: Overlays, page: string, shown: string) =>
  Object.hasOwn(overlay.read(trees).pages?.[page]?.templates ?? {}, shown)
    ? shown
    : freeTemplateName(overlay.copyName, Object.keys(pageTemplates(trees.viewModels, layers, page) ?? {}));

/**
 * An op on the SHOWN layout, routed by target and location: the shared
 * page's template wherever it is (`locateShown`); an overlay's own copy of
 * the layout inside a container, as the container's setting; or the
 * overlay's own view of the page. The engine plugin of that template
 * applies the edit to the VALIDATED template.
 */
export const pageOp =
  (ctx: EditContext, edit: (engine: AnyLayoutEngine, template: PageViewModel) => PageViewModel): Op =>
  (source) => {
    const { layoutEngines, page, at, target } = ctx;
    const overlay = overlayTargetOf(target);
    if (overlay === undefined) {
      // The shared page: a layout inside a container is the widget template's, the same in every prebuilt view.
      const located = locateShown(ctx, source);
      if (located === undefined) return source;
      return {
        ...source,
        viewModels: setPath(source.viewModels, located.path, edit(located.engine, located.template)),
      };
    }
    const layers = layersOf(ctx, source);
    // The PAGE's view, wherever the edit is: a layout inside a container belongs to the view of the page that shows it.
    const pageView = pageViewOf(ctx, source);
    if (pageView === undefined) return source;
    const current = resolveTemplate(layoutEngines, pageTemplates(source.viewModels, layers, page)?.[pageView]);
    if (current.problem !== undefined) return source;
    const name = ownTemplateFor(overlay, source, layers, page, pageView);
    // A copy of the shown view takes along what the layers hold for that view alone: the layouts inside its containers.
    const carried = name === pageView ? undefined : foldViewCells(layers, page, pageView);
    const intoOwn = (entry: UserViewModels, update: (raw: PageViewModel) => PageViewModel): UserViewModels => {
      const next = updateUserPageTemplate(entry, page, name, current.template, update);
      return carried === undefined ? next : putUserViewCells(next, page, name, carried);
    };
    if (at !== undefined) {
      const located = locateLayoutAt(layoutEngines, source.viewModels, layers, page, at);
      const inner = located === undefined ? undefined : resolveTemplate(layoutEngines, located.template);
      if (located === undefined || inner === undefined || inner.problem !== undefined) return source;
      const edited = edit(inner.engine, inner.template);
      // The page's layout as it is, in the overlay's own view — and the layout inside the container as THAT view's.
      return overlay.write(source, (entry) =>
        updateUserLayoutAt(
          intoOwn(entry, (raw) => raw),
          page,
          name,
          located,
          edited,
        ),
      );
    }
    // The overlay's own template is raw: validated by its engine before the edit, kept as it was if it fails.
    const edited = (raw: PageViewModel): PageViewModel => {
      const own = resolveTemplate(layoutEngines, raw);
      return own.problem === undefined ? edit(own.engine, own.template) : raw;
    };
    return overlay.write(source, (entry) => intoOwn(entry, edited));
  };

/** Every widget template a cell of the page references — in any view of any layer, down into its containers. */
const referencedModels = ({ registry, layoutEngines, page }: EditContext, source: EditableTrees): Set<string> => {
  const everyLayer = [...Object.values(source.viewModels.roles ?? {}), source.userViewModels];
  return new Set(
    Object.values(pageTemplates(source.viewModels, everyLayer, page) ?? {}).flatMap((raw) =>
      cellsWithin(registry, layoutEngines, source.viewModels, raw).map((cell) => cell.model),
    ),
  );
};

/** Builder-owned template maps an op stopped referencing — a removed cell's, a removed tab's — go with it. */
const withoutOrphans = (ctx: EditContext, before: EditableTrees, after: EditableTrees): EditableTrees => {
  const namespace = `${modelNamespaceOf(ctx.naming)}.`;
  const kept = referencedModels(ctx, after);
  return [...referencedModels(ctx, before)]
    .filter((model) => model.startsWith(namespace) && !kept.has(model))
    .reduce((next, model) => ({ ...next, viewModels: deletePath(next.viewModels, model) }), after);
};

/** Keys the form owns: dropped from a base template before the form's values are re-applied. */
const withoutFormKeys = (template: unknown, settingNames: string[]): Record<string, unknown> => {
  const owned = new Set([...RESERVED_VIEW_MODEL_KEYS, ...settingNames]);
  return Object.fromEntries(Object.entries(isPlainObject(template) ? template : {}).filter(([key]) => !owned.has(key)));
};

/* ---- the ops ---- */

/** The engine's change payload, already checked by the engine's own validator, applied to the shown layout. */
export const changeLayoutOp = (ctx: EditContext, checked: unknown): Op =>
  pageOp(ctx, (engine, template) => engine.applyChange(template, checked));

/** A cell gone from the shown layout — and in an overlay's view its entry, on the shared page the templates nobody uses any more. */
export const removeCellOp = (ctx: EditContext, cellId: string): Op => {
  const overlay = overlayTargetOf(ctx.target);
  const remove = pageOp(ctx, (plugin, template) => plugin.removeCell(template, cellId));
  const key = chained(ctx.at, cellId);
  return (source) =>
    overlay === undefined
      ? withoutOrphans(ctx, source, remove(source))
      : overlay.write(remove(source), (entry) => removeUserCell(entry, ctx.page, key));
};

/** The PAGE's view an edit at a location belongs to — the plan's on the page, the page's own from inside a container. */
const pageViewOf = (ctx: EditContext, source: EditableTrees): string | undefined =>
  ctx.at === undefined ? ctx.view : shownView(source.viewModels, layersOf(ctx, source), ctx.page);

/**
 * Whether the target's overlay holds a layout of its own inside a container
 * cell of the shown layout — what "Reset to original" would take away.
 * Never on the shared page: there the layout IS the original.
 */
export function holdsOwnLayout(ctx: EditContext, source: EditableTrees, cellId: string, widget: string): boolean {
  const overlay = overlayTargetOf(ctx.target);
  const contains = ctx.registry.get(widget)?.contains ?? [];
  if (overlay === undefined || contains.length === 0) return false;
  const key = chained(ctx.at, cellId);
  return holdsUserCellSettings(overlay.read(source), ctx.page, pageViewOf(ctx, source), key, contains);
}

/**
 * "Reset to original" for a container cell: the overlay's own layouts
 * inside it — the shown view's and any it holds for every view — are
 * dropped, so the container shows the layout the layers below have (the
 * shared page's, or a role's). Nothing on the shared page.
 */
export function resetLayoutOp(ctx: EditContext, cellId: string, widget: string): Op | undefined {
  const overlay = overlayTargetOf(ctx.target);
  const contains = ctx.registry.get(widget)?.contains ?? [];
  if (overlay === undefined || contains.length === 0) return undefined;
  const key = chained(ctx.at, cellId);
  return (source) =>
    overlay.write(source, (entry) => resetUserCellSettings(entry, ctx.page, pageViewOf(ctx, source), key, contains));
}

/**
 * Wrap a cell in a CONTAINER (doc/ADR/0009-containers.md, "Wrap in a card"):
 * one op on the shared page — a new container cell appended (tall) where
 * the layout puts it, its first layout the engine's empty one with the cell
 * inside, the cell gone from the layout it was in. The container's
 * template is builder-owned, named as a placed widget's. Nothing for an
 * overlay's view (it cannot hold a template) or a widget that is no container.
 */
export function wrapCellOp(ctx: EditContext, cellId: string, widget: string): Op | undefined {
  const inside = ctx.registry.get(widget)?.contains?.[0];
  if (inside === undefined || overlayTargetOf(ctx.target) !== undefined) return undefined;
  const { naming } = ctx;
  const namespace = modelNamespaceOf(naming);
  return (source) => {
    const located = locateShown(ctx, source);
    const wrapped = located?.cells.find((cell) => cell.id === cellId);
    if (!located || !wrapped) return source;
    const { path, engine, template } = located;
    const group = widgetTemplates(source.viewModels, namespace) ?? {};
    const containerId = naming.cellId([...Object.keys(group), ...located.cells.map((cell) => cell.id)]);
    const model = `${namespace}.${containerId}`;
    const container = { id: containerId, widget, model, template: naming.widgetTemplate };
    const outer = engine.appendCell(engine.removeCell(template, cellId), container, "tall");
    // The cell's four facts, never its placement: the new layout decides that.
    const { id, widget: kind, model: wrappedModel, template: wrappedTemplate } = wrapped;
    const inner = engine.appendCell(engine.empty(), {
      id,
      widget: kind,
      model: wrappedModel,
      template: wrappedTemplate,
    });
    const viewModels = setPath(source.viewModels, path, outer);
    return {
      ...source,
      viewModels: updateWidgetTemplate(viewModels, model, naming.widgetTemplate, () => ({ [inside]: inner })),
    };
  };
}

/**
 * The editor's form saved into the cell's template. An overlay carries
 * SETTINGS only — a user's or a role's view never rewires inputs or
 * reactions (doc/ADR/0003-layout-engines.md, "Where edits go") — and keeps
 * its own copy of a layout the container holds, which the form never shows.
 * On the shared page a container's edit may have ADDED a tab (its layout
 * starts empty, on the engine of the layout the cell is in) or REMOVED one
 * (the templates of the cells inside it go, as with a removed cell).
 *
 * `rewires` — an ADMINISTRATOR's edit from an overlay's session
 * (doc/ADR/0012-roles.md, "Amended (17 November 2026)"): the overlay still
 * gets the settings and nothing else, and the form's WIRING — the ports,
 * the reactions, the condition, the appearance — is written into the
 * SHARED template, for everyone who uses it. Wiring is never an overlay's.
 */
export function saveWidgetOp(
  ctx: EditContext,
  cell: EditableCell & { template: string },
  bindings: WidgetBindings,
  settings: WidgetSettings,
  rewires = false,
): Op {
  const overlay = overlayTargetOf(ctx.target);
  const { model, template, key, definition } = cell;
  const overlayKey = chained(ctx.at, key);
  const settingNames = settingFields(definition.viewModel).map((field) => field.name);
  return (source) => {
    if (overlay !== undefined) {
      const kept = overlay.read(source).pages?.[ctx.page]?.cells?.[overlayKey]?.settings?.[template] ?? {};
      const layouts = Object.fromEntries(Object.entries(kept).filter(([held]) => definition.contains?.includes(held)));
      const written = overlay.write(source, (entry) =>
        updateUserCellSettings(entry, ctx.page, overlayKey, template, { ...layouts, ...settings }),
      );
      if (!rewires) return written;
      return {
        ...written,
        viewModels: updateWidgetTemplate(written.viewModels, model, template, (current) => ({
          ...withoutFormKeys(current, []),
          ...templateOf(bindings, {}),
        })),
      };
    }
    const engine = locateShown(ctx, source)?.engine;
    const viewModels = updateWidgetTemplate(source.viewModels, model, template, (current) => {
      const merged = { ...withoutFormKeys(current, settingNames), ...templateOf(bindings, settings) };
      return engine === undefined ? merged : withEmptyLayouts(definition, merged, engine);
    });
    return withoutOrphans(ctx, source, { ...source, viewModels });
  };
}

/**
 * A cell's widget TEMPLATE chosen for the overlay (the user's or a role's
 * `view` for that cell, doc/ADR/0012-roles.md): how an admin's table gets
 * its admin wiring without touching wiring. Nothing on the shared page:
 * there the cell's own `template` is edited as configuration.
 */
export function setCellViewOp(ctx: EditContext, cellId: string, view: string | undefined): Op | undefined {
  const overlay = overlayTargetOf(ctx.target);
  if (overlay === undefined) return undefined;
  const key = chained(ctx.at, cellId);
  return (source) => overlay.write(source, (entry) => selectUserCellView(entry, ctx.page, key, view));
}
