/**
 * Layouts INSIDE widgets (doc/containers-design.md): a container's template
 * holds a page template in one of its settings (`WidgetDefinition.contains`),
 * and the adapter, boot validation and the builder all need the same three
 * facts about it — which layouts a view model holds, how deep they may go,
 * and which part of the user overlay belongs to the cells inside.
 */
import {
  getPath,
  isPlainObject,
  setPath,
  type AnyWidgetDefinition,
  type CellBase,
  type UserViewModels,
  type ViewModels,
} from "@wirework/schema";
import { foldSettings, type Overlays } from "./layers";
import { resolveTemplate, type LayoutEngineRegistry } from "./layout-engines";
import { deepMerge } from "./paths";
import type { WidgetRegistry } from "./registry";
import { pageTemplates, updateUserViewCellSettings } from "./trees";

/** How deep layouts may nest: a card in a card in a card in a card, and no further. */
export const MAX_LAYOUT_DEPTH = 4;

/** One layout a container's view model holds: where in the view model, and the template. */
export interface HeldLayout {
  /** A dot path into the view model: "content", or "tabs.0.content" for an item of a list. */
  path: string;
  template: unknown;
}

/**
 * The layouts a resolved view model holds, by the definition's `contains`:
 * a setting that is a layout, or a list of items each holding a `content`
 * layout (tabs, panels). An item without one holds nothing yet.
 */
export function layoutsOf(definition: AnyWidgetDefinition, viewModel: unknown): HeldLayout[] {
  return (definition.contains ?? []).flatMap((setting) => {
    const held = getPath(viewModel, setting);
    if (Array.isArray(held)) {
      return held.flatMap((item, index) =>
        isPlainObject(item) && item["content"] !== undefined
          ? [{ path: `${setting}.${index}.content`, template: item["content"] }]
          : [],
      );
    }
    return held === undefined ? [] : [{ path: setting, template: held }];
  });
}

/**
 * The chain step for a layout inside a container cell: the cell's id, with
 * the layout's path when it is not the one `content` — `card-1`,
 * `tabs-1/tabs.0.content`. Chains join with "/".
 */
export const layoutChain = (container: string, layoutPath: string): string =>
  layoutPath === "content" ? container : `${container}/${layoutPath}`;

/**
 * The key of an inner cell in the user overlay of its page: the chain to
 * its layout, then its id — `card-1/button`, `tabs-1/tabs.0.content/button`.
 */
export const innerCellKey = (container: string, layoutPath: string, cell: string): string =>
  `${layoutChain(container, layoutPath)}/${cell}`;

/** One step of a chain of containers: the container's cell and the layout taken inside it. */
export interface ChainStep {
  cell: string;
  layoutPath: string;
  /** The chain down to and including this step — what `innerCellKey` would prefix an inner cell with. */
  at: string;
}

/**
 * A chain of containers (`card-1`, `card-1/card-2`, `tabs-1/tabs.0.content`)
 * read step by step — the same notation as the overlay keys and the nested
 * page name: a segment with a dot is the layout path inside the cell before
 * it; without one the layout is `content`.
 */
export function chainSteps(at: string): ChainStep[] {
  const steps: ChainStep[] = [];
  const segments = at.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const cell = segments[index] ?? "";
    const next = segments[index + 1];
    const layoutPath = next !== undefined && next.includes(".") ? segments[(index += 1)] : undefined;
    steps.push({ cell, layoutPath: layoutPath ?? "content", at: segments.slice(0, index + 1).join("/") });
  }
  return steps;
}

/** The cells of every template the engines accept, in order. */
const cellsOf = (layoutEngines: LayoutEngineRegistry, templates: readonly unknown[]): CellBase[] =>
  templates.flatMap((template) => {
    const resolved = resolveTemplate(layoutEngines, template);
    return resolved.problem === undefined ? resolved.cells : [];
  });

/**
 * The layout `at` a chain of containers under a page, located: where its
 * BASE lives in the view models, which container's setting holds it, and
 * the layout as a user SEES it — the base one under the user's settings for
 * that container, when a user overlay is given (a user's own layout inside
 * a card is a setting of the card: `cells["card-1"].settings.default.content`).
 */
export interface LocatedLayout {
  /** The dot-path segments of the base layout: `widgets.custom.card-1.default.content`. */
  path: string[];
  /** The container that holds it, as the page's user overlay keys it (`card-1`, `card-1/card-2`), and its template. */
  container: { key: string; template: string };
  /** The container's setting that holds the layout (`content`, `tabs`), its value as the user sees it, and the path of the layout within it (`0.content`, or nothing). */
  holder: { setting: string; value: unknown; within: string[] };
  /** The layout as the user sees it. */
  template: unknown;
}

/**
 * Where the layout `at` a chain lives and what it is — or undefined when
 * the chain leads nowhere. The chain's first cell is looked for in every
 * template of the page (a view is a layout of the same cells); the layouts
 * below are read from the widget templates, each under the overlays'
 * settings for its container — the roles' then the user's (layers.ts),
 * none for the shared page as it is.
 */
export function locateLayoutAt(
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  overlays: Overlays,
  page: string,
  at: string,
): LocatedLayout | undefined {
  let templates: unknown[] = Object.values(pageTemplates(viewModels, overlays, page) ?? {});
  let located: LocatedLayout | undefined;
  const steps = chainSteps(at);
  for (const [index, step] of steps.entries()) {
    const cell = cellsOf(layoutEngines, templates).find((candidate) => candidate.id === step.cell);
    if (!cell) return undefined;
    // The container's overlay key: the chain above it, then its id (`innerCellKey` of the layout above).
    const above = steps[index - 1];
    const key = above === undefined ? step.cell : `${above.at}/${step.cell}`;
    const base = getPath(viewModels, [...cell.model.split("."), cell.template]);
    const seen = deepMerge(base, foldSettings(overlays, page, key, cell.template));
    const [setting = "", ...within] = step.layoutPath.split(".");
    located = {
      path: [...cell.model.split("."), cell.template, ...step.layoutPath.split(".")],
      container: { key, template: cell.template },
      holder: { setting, value: getPath(seen, setting), within },
      template: getPath(seen, step.layoutPath),
    };
    templates = [located.template];
  }
  return located;
}

/**
 * Where, in the view models, the BASE of the layout `at` a chain lives — the
 * dot-path segments of `widgets.custom.card-1.default.content` — or
 * undefined when the chain leads nowhere.
 */
export const layoutPathAt = (
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  page: string,
  at: string,
): string[] | undefined => locateLayoutAt(layoutEngines, viewModels, [], page, at)?.path;

/**
 * A VIEW's own layout inside a container: written into the overlay as the
 * container's setting that holds it (the whole `tabs` list for a tab's
 * content) FOR THAT VIEW of the page (`viewCells.<view>`) — another view
 * shows the container as it was —, what the view already holds for the
 * container kept.
 */
export function updateUserLayoutAt(
  userViewModels: UserViewModels,
  page: string,
  view: string,
  located: LocatedLayout,
  template: unknown,
): UserViewModels {
  const { key, template: name } = located.container;
  const { setting, value, within } = located.holder;
  const held = within.length === 0 ? template : setPath(value, within, template);
  const settings = userViewModels.pages?.[page]?.viewCells?.[view]?.[key]?.settings?.[name] ?? {};
  return updateUserViewCellSettings(userViewModels, page, view, key, name, { ...settings, [setting]: held });
}

/**
 * The overlays as the cells of the layout `at` a chain see them: each
 * narrowed step by step (`innerOverlay`), keyed under `name` — the nested
 * page name a builder shows the layout as. A layer with nothing for them
 * is left out.
 */
export const innerOverlaysAt = (overlays: Overlays, page: string, at: string, name: string): UserViewModels[] =>
  chainSteps(at)
    .reduce<Overlays>((layers, step) => innerOverlays(layers, page, step.cell, step.layoutPath), overlays)
    .map((inner) => inner.pages?.[page])
    .filter((cells) => cells !== undefined)
    .map((cells) => ({ pages: { [name]: cells } }));

/** Every overlay layer as the cells INSIDE a container see it (`innerOverlay` of each); a layer with nothing for them is left out. */
export const innerOverlays = (
  overlays: Overlays,
  page: string,
  container: string,
  layoutPath: string,
): UserViewModels[] =>
  overlays.map((overlay) => innerOverlay(overlay, page, container, layoutPath)).filter((inner) => inner !== undefined);

/**
 * Every cell of a layout, the ones inside its containers included — what a
 * builder walks to know whether a widget template is still referenced.
 * Reads the containers' RAW templates: no overlay, no resolution.
 */
export function cellsWithin(
  registry: WidgetRegistry,
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  template: unknown,
  depth = 0,
): CellBase[] {
  if (depth >= MAX_LAYOUT_DEPTH) return [];
  return cellsOf(layoutEngines, [template]).flatMap((cell) => {
    const definition = registry.get(cell.widget);
    const inner = definition
      ? layoutsOf(definition, getPath(viewModels, [...cell.model.split("."), cell.template])).flatMap((held) =>
          cellsWithin(registry, layoutEngines, viewModels, held.template, depth + 1),
        )
      : [];
    return [cell, ...inner];
  });
}

/**
 * The user overlay as the cells INSIDE a container see it: their entries,
 * re-keyed to their own ids. Composes: a layout inside that layout narrows
 * it again. Undefined when there is nothing for them.
 */
export function innerOverlay(
  userViewModels: UserViewModels | undefined,
  page: string,
  container: string,
  layoutPath: string,
): UserViewModels | undefined {
  const cells = userViewModels?.pages?.[page]?.cells;
  if (cells === undefined) return undefined;
  const prefix = innerCellKey(container, layoutPath, "");
  const inner = Object.fromEntries(
    Object.entries(cells).flatMap(([key, value]) =>
      key.startsWith(prefix) ? [[key.slice(prefix.length), value] as const] : [],
    ),
  );
  return Object.keys(inner).length === 0 ? undefined : { pages: { [page]: { cells: inner } } };
}
