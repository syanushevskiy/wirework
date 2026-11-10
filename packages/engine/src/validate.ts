/**
 * Boot-time validation: walk every page template — base, the roles' own
 * and the user's own — validate each with its layout engine, then check
 * every cell.
 *
 * Cell checking is NOT re-implemented here: `resolveCells` is the single
 * pipeline and this pass maps its problems. What is added on top is what
 * only a whole-tree walk can see: structural shape of every tree, EVERY
 * template a cell could pick (a user may select any of them later), views
 * that do not exist, and overlay config nobody reads.
 *
 * The LAYERS (doc/roles-design.md): the shared page is checked as everyone
 * sees it (`pages.runs.default`), then once more through each layer — a
 * role's entry read with the roles before it in the application's order
 * (`knownRoles`), the user's overlay — at the layer's own location
 * (`roles.admin pages.runs.default`, `user pages.runs.templates.mine`), so
 * a problem a layer causes names the layer; what the shared page already
 * reported is not repeated. A layer's own templates are checked the same
 * way. The fold itself is the resolver's: nothing here folds by hand.
 *
 * Problems carry a SEVERITY: a fallback that engaged, or overlay config that
 * is simply dead, is a warning (the page renders as designed); an unknown
 * widget is an error. `ok` counts errors only.
 */
import { viewModelsSchema, type CellBase, type UserViewModels } from "@wirework/schema";
import { foldSettings, viewLayers, type Overlays } from "./layers";
import { resolveTemplate } from "./layout-engines";
import { issuesText } from "./messages";
import { MAX_LAYOUT_DEPTH, innerOverlay, innerOverlays, layoutsOf } from "./nesting";
import { checkPageReactions } from "./page-events";
import type { WidgetRegistry } from "./registry";
import {
  checkOverlay,
  checkTemplate,
  pickTemplate,
  resolveCells,
  widgetTemplates,
  type CellProblem,
  type ResolveCommon,
} from "./resolve";
import { pageTemplates } from "./trees";

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
  problems: readonly ValidationProblem[];
  errors: readonly ValidationProblem[];
  warnings: readonly ValidationProblem[];
}

/** What `resolvePage` takes, minus the page: validation walks every page. */
export type ValidateInput = Omit<ResolveCommon, "page"> & {
  userViewModels?: UserViewModels | undefined;
  /**
   * Every role the application grants, in order from the broadest to the
   * most specific, when the host knows them: a role entry outside the list
   * is dead configuration — a warning — and a role is checked with the roles
   * before it, as a user holding it would see the page. Absent: the roles
   * in the tree's order, none dead.
   */
  knownRoles?: readonly string[] | undefined;
};

type Report = (location: string, message: string) => void;

/** One overlay layer and how a user holding it reads the base: the roles before it, then itself. */
interface Layer {
  /** `roles.admin`, `user`. */
  name: string;
  entry: UserViewModels;
  overlays: Overlays;
}

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
  const { viewModels, knownRoles } = input;
  const problems: ValidationProblem[] = [];
  const error: Report = (location, message) => {
    problems.push({ location, message, severity: "error" });
  };
  const warn: Report = (location, message) => {
    problems.push({ location, message, severity: "warning" });
  };

  // Shape-check EVERY tree first: everything below reads through them (the roles' entries with the tree's).
  const baseShape = viewModelsSchema.safeParse(viewModels);
  if (!baseShape.success) {
    error("viewModels", `invalid view models: ${issuesText(baseShape.error)}`);
    return report(problems);
  }
  const { overlay, problem: overlayProblem } = checkOverlay(input.userViewModels);
  if (overlayProblem !== undefined) error("userViewModels", `${overlayProblem} — the overlay is ignored entirely`);

  const roles = viewModels.roles ?? {};
  const roleNames = knownRoles === undefined ? Object.keys(roles) : [...knownRoles, ...Object.keys(roles)];
  Object.keys(roles)
    .filter((role) => knownRoles !== undefined && !knownRoles.includes(role))
    .forEach((role) =>
      warn(
        `roles.${role}`,
        `role "${role}" is held by nobody (the application's roles: ${knownRoles?.join(", ") || "none"})`,
      ),
    );
  const roleEntries = [...new Set(roleNames)].map((role) => roles[role]).filter((entry) => entry !== undefined);
  const layers: Layer[] = [
    ...[...new Set(roleNames)].flatMap((role, index) => {
      const entry = roles[role];
      return entry === undefined ? [] : [{ name: `roles.${role}`, entry, overlays: roleEntries.slice(0, index + 1) }];
    }),
    ...(overlay === undefined ? [] : [{ name: "user", entry: overlay, overlays: [overlay] }]),
  ];

  const pageNames = new Set([
    ...Object.keys(viewModels.pages ?? {}),
    ...layers.flatMap((layer) => Object.keys(layer.entry.pages ?? {})),
  ]);

  for (const pageName of pageNames) {
    const baseTemplates = viewModels.pages?.[pageName] ?? {};
    const common = { ...input, page: pageName };

    // The shared page as everyone sees it; what it reports is not repeated for a layer — nor is what an earlier layer reported.
    const reported = new Set<string>();
    for (const [name, raw] of Object.entries(baseTemplates)) {
      const remember: Report = (location, message) => reported.add(`${location}:${message}`);
      const location = `pages.${pageName}.${name}`;
      validateTemplate(raw, location, { ...common, overlays: [] }, undefined, error, warn, remember);
    }

    for (const { name: layerName, entry, overlays } of layers) {
      const page = entry.pages?.[pageName];
      const key = (location: string, message: string) => `${location.slice(layerName.length + 1)}:${message}`;
      const once =
        (report: Report): Report =>
        (location, message) => {
          if (!reported.has(key(location, message))) report(location, message);
        };
      const remember: Report = (location, message) => reported.add(key(location, message));
      // Every view is checked as IT reads the layers: what a layer holds for that view alone on top of its cells.
      const as = (view: string) => ({
        input: { ...common, overlays: viewLayers(overlays, pageName, view) },
        own: viewLayers([entry], pageName, view)[0],
      });
      // The shared page through this layer: a problem the layer causes, at the layer's location.
      for (const [name, raw] of Object.entries(baseTemplates)) {
        const location = `${layerName} pages.${pageName}.${name}`;
        const { input: seen, own } = as(name);
        validateTemplate(raw, location, seen, own, once(error), once(warn), remember);
      }
      // The layer's own templates, like base ones, at their own location.
      for (const [name, raw] of Object.entries(page?.templates ?? {})) {
        const location = `${layerName} pages.${pageName}.templates.${name}`;
        const { input: seen, own } = as(name);
        validateTemplate(raw, location, seen, own, error, warn);
      }
      // What a layer holds for a view nobody can show is dead config.
      const known = pageTemplates(viewModels, overlays, pageName) ?? {};
      Object.keys(page?.viewCells ?? {})
        .filter((view) => !Object.hasOwn(known, view))
        .forEach((view) => warn(`${layerName} pages.${pageName}`, `viewCells reference unknown page view "${view}"`));
      // The layer's chosen view must exist among what it sees.
      if (page?.view !== undefined && !pickTemplate(pageTemplates(viewModels, overlays, pageName) ?? {}, [page.view])) {
        warn(`${layerName} pages.${pageName}`, `page view "${page.view}" does not exist — will fall back to "default"`);
      }
      // A layer's page with its own templates is a real page; without any it is dead config.
      if (page !== undefined && !Object.hasOwn(viewModels.pages ?? {}, pageName) && !page.templates) {
        warn(`${layerName} pages.${pageName}`, `references unknown page "${pageName}"`);
      }
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

  return report(problems);
}

type CellsInput = ResolveCommon & { overlays: Overlays };

/** One page template: its engine's verdict, then every cell. */
function validateTemplate(
  raw: unknown,
  location: string,
  input: CellsInput,
  own: UserViewModels | undefined,
  error: Report,
  warn: Report,
  remember: Report = () => undefined,
): void {
  const resolution = resolveTemplate(input.layoutEngines, raw);
  if (resolution.problem !== undefined) {
    error(location, resolution.problem);
    remember(location, resolution.problem);
    return;
  }
  // At boot the engine's findings fail the check; at render they are warnings on the plan.
  for (const message of resolution.warnings) {
    error(location, message);
    remember(location, message);
  }
  const both =
    (report: Report): Report =>
    (where, message) => {
      report(where, message);
      remember(where, message);
    };
  validateCells(resolution.cells, location, input, own, both(error), both(warn));
}

/**
 * Every cell of one template, through the SAME pipeline the renderer uses —
 * and into the layouts a container holds. `own` is the layer being checked:
 * its dead settings are reported, not the layers before it.
 */
function validateCells(
  cells: readonly CellBase[],
  location: string,
  input: CellsInput,
  own: UserViewModels | undefined,
  error: Report,
  warn: Report,
  depth = 0,
): void {
  const { page, registry, overlays } = input;

  resolveCells(cells, input).forEach((resolved, index) => {
    const cellLocation = `${location} cell[${index}] (#${resolved.key})`;
    if (resolved.problem) {
      error(cellLocation, cellProblemMessage(resolved.problem, registry));
    }

    // A container's layouts are pages inside the page: the same checks, one level down.
    if (resolved.definition && resolved.viewModel !== undefined) {
      for (const { path, template } of layoutsOf(resolved.definition, resolved.viewModel)) {
        const innerLocation = `${cellLocation} ${path}`;
        if (depth + 1 >= MAX_LAYOUT_DEPTH) {
          error(innerLocation, `layouts nested too deep (at most ${MAX_LAYOUT_DEPTH})`);
          continue;
        }
        const inner = resolveTemplate(input.layoutEngines, template);
        if (inner.problem !== undefined) {
          error(innerLocation, inner.problem);
          continue;
        }
        for (const message of inner.warnings) error(innerLocation, message);
        const innerInput = { ...input, overlays: innerOverlays(overlays, page, resolved.key, path) };
        const innerOwn = innerOverlay(own, page, resolved.key, path);
        validateCells(inner.cells, innerLocation, innerInput, innerOwn, error, warn, depth + 1);
      }
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

    // The templates this cell does not show today: a user may select any of them.
    for (const [name, template] of Object.entries(templateMap)) {
      if (name === resolved.template || template === undefined || template === null) continue;
      const checked = checkTemplate(resolved.definition, template, foldSettings(overlays, page, resolved.key, name), {
        actions: input.actions,
        predicates: input.predicates,
        appearances: input.appearances,
      });
      if (checked.problem) {
        error(`${cellLocation} template "${name}"`, cellProblemMessage(checked.problem, registry));
      }
    }

    // The layer's settings for templates that do not exist are dead config.
    Object.keys(own?.pages?.[page]?.cells?.[resolved.key]?.settings ?? {})
      .filter((settingsKey) => !Object.hasOwn(templateMap, settingsKey))
      .forEach((settingsKey) =>
        warn(cellLocation, `settings reference unknown template "${settingsKey}" at "${resolved.model}"`),
      );
  });
}

function report(problems: ValidationProblem[]): ValidationReport {
  const errors = problems.filter((problem) => problem.severity === "error");
  const warnings = problems.filter((problem) => problem.severity === "warning");
  return { ok: errors.length === 0, problems, errors, warnings };
}
