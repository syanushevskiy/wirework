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
  type AnyWidgetDefinition,
  type CellBase,
  type UserViewModels,
  type ViewModels,
} from "@wirework/schema";
import { resolveTemplate, type LayoutEngineRegistry } from "./layout-engines";
import type { WidgetRegistry } from "./registry";
import { pageTemplates } from "./trees";

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
 * Where, in the view models, the layout `at` a chain of containers under a
 * page lives — the dot-path segments of `widgets.custom.card-1.default.content`
 * — or undefined when the chain leads nowhere. The chain's first cell is
 * looked for in every template of the page (a view is a layout of the same
 * cells); the layouts below are read from the widget templates.
 */
export function layoutPathAt(
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  page: string,
  at: string,
): string[] | undefined {
  let templates: unknown[] = Object.values(pageTemplates(viewModels, undefined, page) ?? {});
  let path: string[] | undefined;
  for (const step of chainSteps(at)) {
    const cell = cellsOf(layoutEngines, templates).find((candidate) => candidate.id === step.cell);
    if (!cell) return undefined;
    path = [...cell.model.split("."), cell.template, ...step.layoutPath.split(".")];
    templates = [getPath(viewModels, path)];
  }
  return path;
}

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
