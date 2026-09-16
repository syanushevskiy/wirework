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
import {
  userViewModelsSchema,
  type AnyWidgetDefinition,
  type CellBase,
  type PageViewModel,
  type UserViewModels,
  type ViewModels,
  type WidgetEvents,
} from "@wirework/schema";
import type { ActionRegistry } from "./actions";
import { resolveTemplate, type LayoutEngineRegistry } from "./layout-engines";
import { deepMerge, getPath } from "./paths";
import type { WidgetRegistry } from "./registry";
import { pageTemplates } from "./trees";

export type CellProblem =
  | { kind: "unknown-widget"; widget: string }
  | { kind: "duplicate-cell-id"; id: string }
  | { kind: "dangling-model-path"; path: string }
  | { kind: "missing-template"; path: string; template: string }
  | { kind: "invalid-view-model"; message: string }
  /** The template parses, but the widget's CONTRACT is unmet (ports, events, actions). */
  | { kind: "unmet-contract"; message: string };

/** Emitted when a requested template was absent and a fallback engaged. */
export interface FallbackNote {
  requested: string;
  used: string;
}

interface ResolvedCellBase {
  /** Stable cell id from the layout (never positional). */
  readonly key: string;
  readonly widget: string;
  /** Dot-path of the widget's template map (for editors writing back). */
  readonly model: string;
  /** Set when the requested template was missing and a fallback was used. */
  readonly fallback?: FallbackNote;
}

/** A cell that renders: definition and validated view model are present. */
export interface ResolvedCellOk extends ResolvedCellBase {
  readonly problem?: undefined;
  readonly template: string;
  readonly viewModel: unknown;
  readonly definition: AnyWidgetDefinition;
}

/** A cell that cannot render; `definition` is present unless it is unknown. */
export interface ResolvedCellProblem extends ResolvedCellBase {
  readonly problem: CellProblem;
  readonly template?: string;
  readonly viewModel?: undefined;
  readonly definition?: AnyWidgetDefinition;
}

/**
 * Discriminated on `problem`: `if (cell.problem)` narrows to the failed
 * case, and the healthy case needs no cast (team-tiger, Vlad).
 */
export type ResolvedCell = ResolvedCellOk | ResolvedCellProblem;

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
 * Cell ids must be unique per page: reactions are addressed by (page, cell),
 * so two cells sharing an id cross-fire each other's reactions. Shared by
 * resolve and boot validation.
 */
export function duplicateCellIds(cells: readonly CellBase[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const cell of cells) {
    if (seen.has(cell.id)) duplicates.add(cell.id);
    seen.add(cell.id);
  }
  return duplicates;
}

/**
 * The cells of a template, or a problem when the engine plugin throws:
 * a third-party engine must not take the page down with a raw TypeError.
 */
export function engineCells(
  engine: { name: string; cells: (template: PageViewModel) => CellBase[] },
  template: PageViewModel,
): { cells: CellBase[]; problem?: undefined } | { cells?: undefined; problem: string } {
  try {
    return { cells: engine.cells(template) };
  } catch (error) {
    return {
      problem: `layout engine "${engine.name}" failed to list cells: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** The user overlay, or undefined when it is structurally invalid. */
export function usableOverlay(userViewModels: UserViewModels | undefined): UserViewModels | undefined {
  if (userViewModels === undefined) return undefined;
  const parsed = userViewModelsSchema.safeParse(userViewModels);
  return parsed.success ? parsed.data : undefined;
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
    // Own properties only: "valueOf" or "toString" would otherwise "resolve"
    // to an inherited function and fail later with a confusing message.
    if (Object.hasOwn(templateMap, name) && templateMap[name] !== undefined && templateMap[name] !== null) {
      return requested !== undefined && requested !== name
        ? { name, fallback: { requested, used: name } }
        : { name };
    }
  }
  return undefined;
}

/**
 * Contract check independent of the widget's own schema: every required
 * input port must be bound to a path, every REQUIRED event must have at
 * least one reaction under `on` (that is how widget state reaches the
 * store), and every `call` must name a registered action. Returns a
 * message describing what is missing, or undefined.
 */
export function contractProblems(
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

/**
 * One cell of a page: registry lookup, template selection (with the user's
 * overlay), validation by the widget's own schema and the contract check.
 * The SINGLE cell pipeline — boot validation maps its problems rather than
 * repeating it (team-tiger, Alexei).
 */
export function resolveCell(cell: CellBase, input: ResolveInput, duplicate = false): ResolvedCell {
  const { viewModels, page, registry, actions } = input;
  const base = { key: cell.id, widget: cell.widget, model: cell.model } as const;
  const userViewModels = usableOverlay(input.userViewModels);

  const definition = registry.get(cell.widget);
  if (!definition) {
    return { ...base, problem: { kind: "unknown-widget", widget: cell.widget } };
  }
  if (duplicate) {
    return { ...base, definition, problem: { kind: "duplicate-cell-id", id: cell.id } };
  }

  const templates = getPath(viewModels, cell.model);
  if (templates === null || typeof templates !== "object") {
    return { ...base, definition, problem: { kind: "dangling-model-path", path: cell.model } };
  }
  const templateMap = templates as Record<string, unknown>;

  // Per-CELL customisation (two cells of one widget type stay independent).
  const userWidget = userViewModels?.pages?.[page]?.cells?.[cell.id];
  // Fallback chain: user view -> cell template -> "default".
  const picked = pickTemplate(templateMap, [userWidget?.view, cell.template, "default"]);
  if (!picked) {
    return {
      ...base,
      definition,
      problem: {
        kind: "missing-template",
        path: cell.model,
        template: userWidget?.view ?? cell.template,
      },
    };
  }

  const failed = (problem: CellProblem): ResolvedCellProblem => ({
    ...base,
    definition,
    template: picked.name,
    fallback: picked.fallback,
    problem,
  });

  const merged = deepMerge(templateMap[picked.name], userWidget?.settings?.[picked.name]);
  let viewModel: unknown;
  try {
    viewModel = definition.viewModel.parse(merged);
  } catch (error) {
    return failed({
      kind: "invalid-view-model",
      message: error instanceof Error ? error.message : String(error),
    });
  }
  const unmet = contractProblems(definition, viewModel, actions);
  if (unmet) return failed({ kind: "unmet-contract", message: unmet });

  return { ...base, definition, template: picked.name, fallback: picked.fallback, viewModel };
}

const problemPage = (page: string, view: string, problem: string): ResolvedPageProblem => ({
  page,
  view,
  problem,
});

export function resolvePage(input: ResolveInput): ResolvedPage {
  const { viewModels, page, layoutEngines } = input;
  // A structurally broken overlay is ignored here exactly as boot
  // validation ignores it, so the two passes see the same trees.
  const userViewModels = usableOverlay(input.userViewModels);

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
  const listed = engineCells(engine, template);
  if (listed.problem !== undefined) {
    return problemPage(page, picked.name, `Page "${page}" template "${picked.name}": ${listed.problem}`);
  }
  // First cell of a duplicated id renders; the later ones are problems, so
  // one emit can never fire another cell's reactions.
  const duplicates = duplicateCellIds(listed.cells);
  const seen = new Set<string>();
  return {
    page,
    view: picked.name,
    fallback: picked.fallback,
    engine: engine.name,
    template,
    cells: listed.cells.map((cell) => {
      const repeated = duplicates.has(cell.id) && seen.has(cell.id);
      seen.add(cell.id);
      return resolveCell(cell, { ...input, userViewModels }, repeated);
    }),
  };
}
