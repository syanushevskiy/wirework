/**
 * Page resolution — turns (view models, user view models, page name,
 * widget registry, layout-engine registry) into a complete render plan.
 * ALL failure modes are captured here as typed problems (unknown widget,
 * dangling path, missing template, invalid view model, unknown or
 * rejecting layout engine) so non-React hosts get the same guarantees as
 * PageView; the React layer is a pure renderer of this plan.
 *
 * The plan carries the page template VALIDATED by its engine (opaque to
 * the core) plus every cell resolved by id; the engine's renderer places
 * them (doc/layout-engines-design.md).
 *
 * Fallback chain per cell template (team-tiger QA requirement):
 *   user-selected view -> cell's `template` -> "default" -> problem.
 * A fallback that engages is REPORTED on the resolved cell/page, never silent.
 */
import type {
  AnyWidgetDefinition,
  CellBase,
  PageViewModel,
  UserViewModels,
  ViewModels,
  WidgetEvents,
} from "@wirework/schema";
import type { ActionRegistry } from "./actions";
import { resolveTemplate, type LayoutEngineRegistry } from "./layout-engines";
import { deepMerge, getPath } from "./paths";
import type { WidgetRegistry } from "./registry";
import { pageTemplates } from "./trees";

export type CellProblem =
  | { kind: "unknown-widget"; widget: string }
  | { kind: "dangling-model-path"; path: string }
  | { kind: "missing-template"; path: string; template: string }
  | { kind: "invalid-view-model"; message: string };

/** Emitted when a requested template was absent and a fallback engaged. */
export interface FallbackNote {
  requested: string;
  used: string;
}

export interface ResolvedCell {
  /** Stable cell id from the layout (never positional). */
  key: string;
  widget: string;
  /** Dot-path of the widget's template map (for editors writing back). */
  model: string;
  /** Widget template actually used. Absent when none could be picked. */
  template?: string;
  /** VALIDATED view model (template + user overlay). Absent on `problem`. */
  viewModel?: unknown;
  /** Registered definition. Absent on `unknown-widget`. */
  definition?: AnyWidgetDefinition;
  /** Set when the requested template was missing and a fallback was used. */
  fallback?: FallbackNote;
  problem?: CellProblem;
}

interface ResolvedPageBase {
  /** Page name this plan was resolved for. */
  page: string;
  /** Layout template that was actually used. */
  view: string;
  /** Set when the user-selected page view was missing. */
  fallback?: FallbackNote;
}

/** A renderable page: engine name, its validated template, cells by id. */
export interface ResolvedPagePlan extends ResolvedPageBase {
  problem?: undefined;
  engine: string;
  template: PageViewModel;
  cells: ResolvedCell[];
}

/** A page that cannot render (unknown page / template / engine). */
export interface ResolvedPageProblem extends ResolvedPageBase {
  problem: string;
}

export type ResolvedPage = ResolvedPagePlan | ResolvedPageProblem;

export interface ResolveInput {
  viewModels: ViewModels;
  userViewModels?: UserViewModels;
  page: string;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** When given, reactions calling an unregistered action are a cell problem. */
  actions?: ActionRegistry;
}

/**
 * Shared template selection (used by resolve AND boot validation so the two
 * can never disagree): first candidate present and non-null wins.
 */
export function pickTemplate(
  templateMap: Record<string, unknown>,
  candidates: readonly (string | undefined)[],
): { name: string; fallback?: FallbackNote } | undefined {
  const requested = candidates.find((name): name is string => typeof name === "string");
  for (const name of candidates) {
    if (typeof name !== "string") continue;
    if (templateMap[name] !== undefined && templateMap[name] !== null) {
      return requested !== undefined && requested !== name
        ? { name, fallback: { requested, used: name } }
        : { name };
    }
  }
  return undefined;
}

/**
 * Contract check independent of the widget's own schema: every required
 * input port must be bound to a path, and every REQUIRED event must have at
 * least one reaction under `on` (that is how widget state reaches the
 * store). Returns a message describing what is missing, or undefined.
 */
export function unboundRequirements(
  definition: AnyWidgetDefinition,
  viewModel: unknown,
  actions?: ActionRegistry,
): string | undefined {
  const vm = viewModel as
    | { inputs?: Record<string, unknown>; on?: Record<string, unknown[] | undefined> }
    | null;
  const unknownActions =
    actions === undefined
      ? []
      : Object.values(vm?.on ?? {}).flatMap((reactions) =>
          (reactions ?? []).flatMap((reaction) => {
            const call = (reaction as { call?: unknown } | null)?.call;
            return typeof call === "string" && !actions.get(call) ? [call] : [];
          }),
        );
  const unboundPorts = Object.entries(definition.io.inputs).flatMap(([name, port]) =>
    port.required !== false && typeof vm?.inputs?.[name] !== "string" ? [`inputs.${name}`] : [],
  );
  const unreactedEvents = Object.entries(definition.events as WidgetEvents).flatMap(
    ([name, event]) => (event.required === true && !vm?.on?.[name]?.length ? [name] : []),
  );
  const parts = [
    ...(unboundPorts.length > 0
      ? [`required input ports not bound to store paths: ${unboundPorts.join(", ")}`]
      : []),
    ...(unreactedEvents.length > 0
      ? [`required events without a reaction: ${unreactedEvents.join(", ")}`]
      : []),
    ...(unknownActions.length > 0
      ? [`reactions call unknown actions: ${unknownActions.join(", ")} (registered: ${actions?.names().join(", ") || "none"})`]
      : []),
  ];
  return parts.length > 0 ? parts.join("; ") : undefined;
}

export function resolveCell(cell: CellBase, input: ResolveInput): ResolvedCell {
  const { viewModels, userViewModels, page, registry, actions } = input;
  const base: ResolvedCell = { key: cell.id, widget: cell.widget, model: cell.model };

  const definition = registry.get(cell.widget);
  if (!definition) {
    return { ...base, problem: { kind: "unknown-widget", widget: cell.widget } };
  }
  base.definition = definition;

  const templates = getPath(viewModels, cell.model);
  if (templates === null || typeof templates !== "object") {
    return { ...base, problem: { kind: "dangling-model-path", path: cell.model } };
  }
  const templateMap = templates as Record<string, unknown>;

  // Per-CELL customisation (two cells of one widget type stay independent).
  const userWidget = userViewModels?.pages?.[page]?.cells?.[cell.id];
  // Fallback chain: user view -> cell template -> "default".
  const picked = pickTemplate(templateMap, [userWidget?.view, cell.template, "default"]);
  if (!picked) {
    return {
      ...base,
      problem: {
        kind: "missing-template",
        path: cell.model,
        template: userWidget?.view ?? cell.template,
      },
    };
  }

  base.template = picked.name;
  const overlay = userWidget?.settings?.[picked.name];
  const merged = deepMerge(templateMap[picked.name], overlay);
  try {
    const viewModel = definition.viewModel.parse(merged);
    const unbound = unboundRequirements(definition, viewModel, actions);
    if (unbound) {
      return {
        ...base,
        fallback: picked.fallback,
        problem: { kind: "invalid-view-model", message: unbound },
      };
    }
    return { ...base, fallback: picked.fallback, viewModel };
  } catch (error) {
    return {
      ...base,
      fallback: picked.fallback,
      problem: {
        kind: "invalid-view-model",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

const problemPage = (page: string, view: string, problem: string): ResolvedPageProblem => ({
  page,
  view,
  problem,
});

export function resolvePage(input: ResolveInput): ResolvedPage {
  const { viewModels, userViewModels, page, layoutEngines } = input;

  // Base templates with the user's own layered on top.
  const templates = pageTemplates(viewModels, userViewModels, page);
  if (!templates) {
    return problemPage(page, "default", `Unknown page "${page}"`);
  }

  const userView = userViewModels?.pages?.[page]?.view;
  const picked = pickTemplate(templates, [userView, "default"]);
  if (!picked) {
    return problemPage(
      page,
      userView ?? "default",
      `Page "${page}" has no template "${userView ?? "default"}"`,
    );
  }

  const resolution = resolveTemplate(layoutEngines, templates[picked.name]);
  if (resolution.problem !== undefined) {
    return problemPage(page, picked.name, `Page "${page}" template "${picked.name}": ${resolution.problem}`);
  }
  const { engine, template } = resolution;
  return {
    page,
    view: picked.name,
    fallback: picked.fallback,
    engine: engine.name,
    template,
    cells: (engine.cells(template) as CellBase[]).map((cell) => resolveCell(cell, input)),
  };
}
