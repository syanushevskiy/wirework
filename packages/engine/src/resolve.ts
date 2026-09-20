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
 * Fallback chain per cell template:
 *   user-selected view -> cell's `template` -> "default" -> problem.
 * A fallback that engages is REPORTED on the resolved cell/page, never
 * silent — and so is a user overlay that had to be ignored, and the layout
 * engine's own validation warnings.
 */
import {
  getPath,
  isPlainObject,
  userViewModelsSchema,
  validatorKeys,
  type AnyWidgetDefinition,
  type CellBase,
  type PageViewModel,
  type UserViewModels,
  type ViewModels,
  type WidgetEvents,
} from "@wirework/schema";
import type { ActionRegistry } from "./actions";
import { resolveTemplate, type LayoutEngineRegistry } from "./layout-engines";
import { errorText, issuesText } from "./messages";
import { deepMerge } from "./paths";
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
 * case, and the healthy case needs no cast.
 */
export type ResolvedCell = ResolvedCellOk | ResolvedCellProblem;

interface ResolvedPageBase {
  /** Page name this plan was resolved for. */
  page: string;
  /** Layout template that was actually used. */
  view: string;
  /** Set when the user-selected page view was missing. */
  fallback?: FallbackNote;
  /** Set when a user overlay was given but is invalid, so the page ignores ALL of it. */
  overlayProblem?: string;
}

/** A renderable page: engine name, its validated template, cells by id. */
export interface ResolvedPagePlan extends ResolvedPageBase {
  problem?: undefined;
  engine: string;
  template: PageViewModel;
  cells: ResolvedCell[];
  /** The layout engine's validation findings: the page renders, not as designed. */
  warnings: string[];
}

/** A page that cannot render (unknown page / template / engine). */
export interface ResolvedPageProblem extends ResolvedPageBase {
  problem: string;
}

export type ResolvedPage = ResolvedPagePlan | ResolvedPageProblem;

export interface ResolveInput {
  viewModels: ViewModels;
  /**
   * The user overlay. `resolvePage` checks it once (`checkOverlay`); a
   * direct `resolveCells` caller passes an already checked one.
   */
  userViewModels?: UserViewModels;
  page: string;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** When given, reactions calling an unregistered action are a cell problem. */
  actions?: ActionRegistry;
}

/**
 * The user overlay when it is structurally valid; otherwise undefined and
 * WHY — an invalid overlay is ignored as a whole, and that must be visible.
 */
export function checkOverlay(
  userViewModels: UserViewModels | undefined,
): { overlay?: UserViewModels; problem?: string } {
  if (userViewModels === undefined) return {};
  const parsed = userViewModelsSchema.safeParse(userViewModels);
  return parsed.success ? { overlay: parsed.data } : { problem: `user view models ignored: ${issuesText(parsed.error)}` };
}

/**
 * The template map a cell's `model` path points at, or undefined when the
 * path holds no plain object. ONE rule for render and boot validation.
 */
export function widgetTemplates(viewModels: ViewModels, model: string): Record<string, unknown> | undefined {
  const templates = getPath(viewModels, model);
  return isPlainObject(templates) ? templates : undefined;
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

type ReactionList = readonly unknown[] | undefined;

/**
 * Contract check independent of the widget's own schema: every required
 * input port must be bound to a path, every REQUIRED event must have at
 * least one reaction under `on` (that is how widget state reaches the
 * store), every `call` must name a registered action, and every `from`
 * must start at a field the event's payload has — a typo there would write
 * `undefined` on every emit. Returns a message describing what is wrong, or
 * undefined.
 */
export function contractProblems(
  definition: AnyWidgetDefinition,
  viewModel: unknown,
  actions?: ActionRegistry,
): string | undefined {
  const vm = viewModel as { inputs?: Record<string, unknown>; on?: Record<string, ReactionList> } | null;
  const events = definition.events as WidgetEvents;
  const reactions = Object.entries(vm?.on ?? {}).flatMap(([event, list]) =>
    (list ?? []).map((reaction) => ({ event, reaction: reaction as { call?: unknown; from?: unknown } | null })),
  );

  const unknownActions =
    actions === undefined
      ? []
      : reactions.flatMap(({ reaction }) =>
          typeof reaction?.call === "string" && !actions.get(reaction.call) ? [reaction.call] : [],
        );
  const unknownFields = reactions.flatMap(({ event, reaction }) => {
    const fields = events[event] ? validatorKeys(events[event].payload) : undefined;
    const head = typeof reaction?.from === "string" ? reaction.from.split(".")[0] : undefined;
    return fields !== undefined && head !== undefined && !fields.includes(head)
      ? [`${event} from "${reaction?.from as string}" (payload fields: ${fields.join(", ") || "none"})`]
      : [];
  });
  const unboundPorts = Object.entries(definition.io.inputs).flatMap(([name, port]) =>
    port.required !== false && typeof vm?.inputs?.[name] !== "string" ? [`inputs.${name}`] : [],
  );
  const unreactedEvents = Object.entries(events).flatMap(([name, event]) =>
    event.required === true && !vm?.on?.[name]?.length ? [name] : [],
  );

  const parts: string[] = [];
  if (unboundPorts.length > 0) parts.push(`required input ports not bound to store paths: ${unboundPorts.join(", ")}`);
  if (unreactedEvents.length > 0) parts.push(`required events without a reaction: ${unreactedEvents.join(", ")}`);
  if (unknownActions.length > 0) {
    parts.push(
      `reactions call unknown actions: ${unknownActions.join(", ")} (registered: ${actions?.keys().join(", ") || "none"})`,
    );
  }
  if (unknownFields.length > 0) parts.push(`reactions read payload fields that do not exist: ${unknownFields.join("; ")}`);
  return parts.length > 0 ? parts.join("; ") : undefined;
}

/**
 * ONE template of a widget with the user's settings for it: parsed by the
 * widget's own schema, then contract-checked. Resolve runs it on the picked
 * template; boot validation on every template a cell could pick.
 */
export function checkTemplate(
  definition: AnyWidgetDefinition,
  template: unknown,
  userSettings: unknown,
  actions?: ActionRegistry,
): { viewModel: unknown; problem?: undefined } | { viewModel?: undefined; problem: CellProblem } {
  let viewModel: unknown;
  try {
    viewModel = definition.viewModel.parse(deepMerge(template, userSettings));
  } catch (error) {
    return { problem: { kind: "invalid-view-model", message: errorText(error) } };
  }
  const unmet = contractProblems(definition, viewModel, actions);
  return unmet ? { problem: { kind: "unmet-contract", message: unmet } } : { viewModel };
}

/**
 * One cell of a page: registry lookup, template selection (with the user's
 * overlay), validation by the widget's own schema and the contract check.
 */
function resolveCell(cell: CellBase, input: ResolveInput, duplicate: boolean): ResolvedCell {
  const { viewModels, userViewModels, page, registry, actions } = input;
  const base = { key: cell.id, widget: cell.widget, model: cell.model } as const;

  const definition = registry.get(cell.widget);
  if (!definition) {
    return { ...base, problem: { kind: "unknown-widget", widget: cell.widget } };
  }
  if (duplicate) {
    return { ...base, definition, problem: { kind: "duplicate-cell-id", id: cell.id } };
  }

  const templateMap = widgetTemplates(viewModels, cell.model);
  if (!templateMap) {
    return { ...base, definition, problem: { kind: "dangling-model-path", path: cell.model } };
  }

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

  const checked = checkTemplate(definition, templateMap[picked.name], userWidget?.settings?.[picked.name], actions);
  if (checked.problem) {
    return { ...base, definition, template: picked.name, fallback: picked.fallback, problem: checked.problem };
  }
  return { ...base, definition, template: picked.name, fallback: picked.fallback, viewModel: checked.viewModel };
}

/**
 * Every cell of one template, in order — the SINGLE cell pipeline: the
 * renderer uses the result, boot validation maps its problems. The first
 * cell of a repeated id resolves; the later ones are `duplicate-cell-id`
 * problems, so one emit can never fire another cell's reactions.
 */
export function resolveCells(cells: readonly CellBase[], input: ResolveInput): ResolvedCell[] {
  const seen = new Set<string>();
  return cells.map((cell) => {
    const repeated = seen.has(cell.id);
    seen.add(cell.id);
    return resolveCell(cell, input, repeated);
  });
}

export function resolvePage(input: ResolveInput): ResolvedPage {
  const { viewModels, page, layoutEngines } = input;
  // Checked once per page. A broken overlay is ignored here exactly as boot
  // validation ignores it — and the plan says so.
  const { overlay: userViewModels, problem: overlayProblem } = checkOverlay(input.userViewModels);
  const notes = overlayProblem === undefined ? {} : { overlayProblem };

  // Base templates with the user's own layered on top.
  const templates = pageTemplates(viewModels, userViewModels, page);
  if (!templates) {
    return { page, view: "default", problem: `Unknown page "${page}"`, ...notes };
  }

  const userView = userViewModels?.pages?.[page]?.view;
  const picked = pickTemplate(templates, [userView, "default"]);
  if (!picked) {
    const view = userView ?? "default";
    return { page, view, problem: `Page "${page}" has no template "${view}"`, ...notes };
  }

  const resolution = resolveTemplate(layoutEngines, templates[picked.name]);
  if (resolution.problem !== undefined) {
    return {
      page,
      view: picked.name,
      problem: `Page "${page}" template "${picked.name}": ${resolution.problem}`,
      ...notes,
    };
  }
  return {
    page,
    view: picked.name,
    fallback: picked.fallback,
    ...notes,
    engine: resolution.engine.name,
    template: resolution.template,
    warnings: resolution.warnings,
    cells: resolveCells(resolution.cells, { ...input, userViewModels }),
  };
}
