/**
 * Boot-time validation: walk every page template — base AND the user's own
 * — validate each with its layout engine, then check every cell.
 *
 * Cell checking is NOT re-implemented here: `resolveCells` is the single
 * pipeline and this pass maps its problems. What is added on top is what
 * only a whole-tree walk can see: structural shape of both trees, EVERY
 * template a cell could pick (a user may select any of them later), user
 * views that do not exist, and overlay config nobody reads.
 *
 * Problems carry a SEVERITY: a fallback that engaged, or overlay config that
 * is simply dead, is a warning (the page renders as designed); an unknown
 * widget is an error. `ok` counts errors only.
 */
import { viewModelsSchema, type CellBase } from "@wirework/schema";
import { resolveTemplate } from "./layout-engines";
import { issuesText } from "./messages";
import { checkPageReactions } from "./page-events";
import type { WidgetRegistry } from "./registry";
import {
  checkOverlay,
  checkTemplate,
  pickTemplate,
  resolveCells,
  widgetTemplates,
  type CellProblem,
  type ResolveInput,
} from "./resolve";

export type ProblemSeverity = "error" | "warning";

export interface ValidationProblem {
  /** Where the problem was found, e.g. `pages.runs.default cell[1] (#counter)`. */
  location: string;
  message: string;
  /** `warning`: renders as designed but worth knowing. Default `error`. */
  severity: ProblemSeverity;
}

export interface ValidationReport {
  /** True when there is no ERROR (warnings do not fail a boot). */
  ok: boolean;
  problems: ValidationProblem[];
  errors: ValidationProblem[];
  warnings: ValidationProblem[];
}

/** What `resolvePage` takes, minus the page: validation walks every page. */
export type ValidateInput = Omit<ResolveInput, "page">;

type Report = (location: string, message: string) => void;

/** How a cell problem reads in a boot report. */
function cellProblemMessage(problem: CellProblem, registry: WidgetRegistry): string {
  switch (problem.kind) {
    case "unknown-widget":
      return `unknown widget "${problem.widget}" (registered: ${registry.keys().join(", ") || "none"})`;
    case "duplicate-cell-id":
      return `duplicate cell id "${problem.id}" — cell ids must be unique per page`;
    case "dangling-model-path":
      return `dangling model path "${problem.path}"`;
    case "missing-template":
      return `model "${problem.path}" has no template "${problem.template}" (and no "default" fallback)`;
    case "invalid-view-model":
      return `template rejected by the widget: ${problem.message}`;
    case "unmet-contract":
      return problem.message;
  }
}

export function validateViewModels(input: ValidateInput): ValidationReport {
  const { viewModels, layoutEngines } = input;
  const problems: ValidationProblem[] = [];
  const error: Report = (location, message) => {
    problems.push({ location, message, severity: "error" });
  };
  const warn: Report = (location, message) => {
    problems.push({ location, message, severity: "warning" });
  };

  // Shape-check BOTH trees first: everything below reads through them.
  const baseShape = viewModelsSchema.safeParse(viewModels);
  if (!baseShape.success) {
    error("viewModels", `invalid view models: ${issuesText(baseShape.error)}`);
    return report(problems);
  }
  const { overlay, problem: overlayProblem } = checkOverlay(input.userViewModels);
  if (overlayProblem !== undefined) error("userViewModels", `${overlayProblem} — the overlay is ignored entirely`);

  const pageNames = new Set([
    ...Object.keys(viewModels.pages ?? {}),
    ...Object.keys(overlay?.pages ?? {}),
  ]);

  for (const pageName of pageNames) {
    const baseTemplates = viewModels.pages?.[pageName] ?? {};
    const userTemplates = overlay?.pages?.[pageName]?.templates ?? {};
    // The user's own templates are validated like base ones, at their own location.
    const entries = [
      ...Object.entries(baseTemplates).map(([name, raw]) => ({ raw, location: `pages.${pageName}.${name}` })),
      ...Object.entries(userTemplates).map(([name, raw]) => ({
        raw,
        location: `user pages.${pageName}.templates.${name}`,
      })),
    ];

    for (const { raw: rawPage, location } of entries) {
      const resolution = resolveTemplate(layoutEngines, rawPage);
      if (resolution.problem !== undefined) {
        error(location, resolution.problem);
        continue;
      }
      // At boot the engine's findings fail the check; at render they are warnings on the plan.
      for (const message of resolution.warnings) error(location, message);
      validateCells(resolution.cells, location, { ...input, userViewModels: overlay, page: pageName }, error, warn);
    }

    // User-selected page views must exist among base + user templates.
    const userPageView = overlay?.pages?.[pageName]?.view;
    if (userPageView !== undefined && !pickTemplate({ ...baseTemplates, ...userTemplates }, [userPageView])) {
      warn(
        `user pages.${pageName}`,
        `user-selected page view "${userPageView}" does not exist — will fall back to "default"`,
      );
    }
  }

  // The pages' own reactions (what to load when a page opens): the same
  // check the renderer runs, where it only warns and ignores them.
  for (const pageName of Object.keys(viewModels.on ?? {})) {
    if (!Object.hasOwn(viewModels.pages ?? {}, pageName)) {
      error(`on.${pageName}`, `reactions for unknown page "${pageName}"`);
      continue;
    }
    const { problem } = checkPageReactions(viewModels, pageName, input.actions);
    if (problem !== undefined) error(`on.${pageName}`, problem);
  }

  for (const [userPageName, userPage] of Object.entries(overlay?.pages ?? {})) {
    // A user page with its own templates is a real page; without any it is dead config.
    if (!Object.hasOwn(viewModels.pages ?? {}, userPageName) && !userPage.templates) {
      warn(`user pages.${userPageName}`, `user view model references unknown page "${userPageName}"`);
    }
  }

  return report(problems);
}

/** Every cell of one template, through the SAME pipeline the renderer uses. */
function validateCells(
  cells: readonly CellBase[],
  location: string,
  input: ResolveInput,
  error: Report,
  warn: Report,
): void {
  const { page, registry, userViewModels: overlay } = input;

  resolveCells(cells, input).forEach((resolved, index) => {
    const cellLocation = `${location} cell[${index}] (#${resolved.key})`;
    if (resolved.problem) {
      error(cellLocation, cellProblemMessage(resolved.problem, registry));
    }
    if (resolved.fallback) {
      warn(
        cellLocation,
        `template "${resolved.fallback.requested}" missing at "${resolved.model}" — falling back to "${resolved.fallback.used}"`,
      );
    }

    // A repeated id was reported above; its templates belong to the first cell.
    const templateMap = widgetTemplates(input.viewModels, resolved.model);
    if (!templateMap || !resolved.definition || resolved.problem?.kind === "duplicate-cell-id") return;
    const userWidget = overlay?.pages?.[page]?.cells?.[resolved.key];

    // The templates this cell does not show today: a user may select any of them.
    for (const [name, template] of Object.entries(templateMap)) {
      if (name === resolved.template || template === undefined || template === null) continue;
      const checked = checkTemplate(resolved.definition, template, userWidget?.settings?.[name], input.actions);
      if (checked.problem) {
        error(`${cellLocation} template "${name}"`, cellProblemMessage(checked.problem, registry));
      }
    }

    // User settings for templates that do not exist are dead config.
    for (const settingsKey of Object.keys(userWidget?.settings ?? {})) {
      if (!Object.hasOwn(templateMap, settingsKey)) {
        warn(cellLocation, `user settings reference unknown template "${settingsKey}" at "${resolved.model}"`);
      }
    }
  });
}

function report(problems: ValidationProblem[]): ValidationReport {
  const errors = problems.filter((problem) => problem.severity === "error");
  const warnings = problems.filter((problem) => problem.severity === "warning");
  return { ok: errors.length === 0, problems, errors, warnings };
}
