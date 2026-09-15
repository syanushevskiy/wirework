/**
 * Boot-time validation (team-tiger blocker): walk every page template — base
 * AND the user's own — validate each with its layout engine, then every
 * cell: resolve all string-path bindings against the widget registry and
 * the view models, run each widget's own view-model validator (which also
 * rejects reactions to undeclared events), check required ports/events —
 * and validate the USER view models too: selected views that don't exist
 * and settings overlays that break a template are reported here, not
 * discovered at render.
 *
 * Template selection uses the same `pickTemplate` as `resolvePage`, and
 * engine resolution the same `resolveTemplate`, so validation and rendering
 * can never disagree.
 */
import type {
  AnyWidgetDefinition,
  CellBase,
  UserViewModels,
  ViewModels,
} from "@wirework/schema";
import { userViewModelsSchema } from "@wirework/schema";
import type { ActionRegistry } from "./actions";
import { resolveTemplate, type LayoutEngineRegistry } from "./layout-engines";
import { deepMerge, getPath } from "./paths";
import type { WidgetRegistry } from "./registry";
import { pickTemplate, unboundRequirements } from "./resolve";

export interface ValidationProblem {
  /** Where the problem was found, e.g. `pages.runs.default cell[1] (#counter)`. */
  location: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  problems: ValidationProblem[];
}

export function validateViewModels(
  registry: WidgetRegistry,
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  userViewModels?: UserViewModels,
  actions?: ActionRegistry,
): ValidationReport {
  const problems: ValidationProblem[] = [];

  // Shape-check the overlay first: everything below reads through it.
  const parsedUser = userViewModels === undefined ? undefined : userViewModelsSchema.safeParse(userViewModels);
  if (parsedUser && !parsedUser.success) {
    problems.push({
      location: "userViewModels",
      message: `invalid user view models: ${parsedUser.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    });
  }
  const overlay = parsedUser?.success ? parsedUser.data : undefined;

  const pageNames = new Set([
    ...Object.keys(viewModels.pages ?? {}),
    ...Object.keys(overlay?.pages ?? {}),
  ]);
  for (const pageName of pageNames) {
    const baseTemplates = viewModels.pages?.[pageName] ?? {};
    const userTemplates = overlay?.pages?.[pageName]?.templates ?? {};
    // The user's own templates are validated like base ones, at their own location.
    const entries = [
      ...Object.entries(baseTemplates).map(([name, raw]) => ({
        raw,
        location: `pages.${pageName}.${name}`,
      })),
      ...Object.entries(userTemplates).map(([name, raw]) => ({
        raw,
        location: `user pages.${pageName}.templates.${name}`,
      })),
    ];

    for (const { raw: rawPage, location } of entries) {
      const resolution = resolveTemplate(layoutEngines, rawPage);
      if (resolution.problem !== undefined) {
        problems.push({ location, message: resolution.problem });
        continue;
      }
      const { engine, template } = resolution;
      for (const message of engine.validate?.(template) ?? []) {
        problems.push({ location, message });
      }

      const seenIds = new Set<string>();
      (engine.cells(template) as CellBase[]).forEach((cell, index) => {
        const cellLocation = `${location} cell[${index}] (#${cell.id})`;

        if (seenIds.has(cell.id)) {
          problems.push({
            location: cellLocation,
            message: `duplicate cell id "${cell.id}" — cell ids must be unique per page`,
          });
        }
        seenIds.add(cell.id);

        const definition = registry.get(cell.widget);
        if (!definition) {
          problems.push({
            location: cellLocation,
            message: `unknown widget "${cell.widget}" (registered: ${registry.types().join(", ") || "none"})`,
          });
        }

        const templatesAtPath = getPath(viewModels, cell.model);
        if (templatesAtPath === null || typeof templatesAtPath !== "object") {
          problems.push({
            location: cellLocation,
            message: `dangling model path "${cell.model}"`,
          });
          return;
        }
        const templateMap = templatesAtPath as Record<string, unknown>;

        const userWidget = overlay?.pages?.[pageName]?.cells?.[cell.id];
        const picked = pickTemplate(templateMap, [
          userWidget?.view,
          cell.template,
          "default",
        ]);
        if (!picked) {
          problems.push({
            location: cellLocation,
            message: `model "${cell.model}" has no template "${cell.template}" (and no "default" fallback)`,
          });
          return;
        }
        if (picked.fallback) {
          problems.push({
            location: cellLocation,
            message: `template "${picked.fallback.requested}" missing at "${cell.model}" — falling back to "${picked.fallback.used}"`,
          });
        }

        if (definition) {
          const widgetOverlay = userWidget?.settings?.[picked.name];
          validateTemplate(
            definition,
            deepMerge(templateMap[picked.name], widgetOverlay),
            cellLocation,
            problems,
            actions,
          );
        }

        // User settings for templates that don't exist are dead config.
        for (const settingsKey of Object.keys(userWidget?.settings ?? {})) {
          if (templateMap[settingsKey] === undefined) {
            problems.push({
              location: cellLocation,
              message: `user settings reference unknown template "${settingsKey}" at "${cell.model}"`,
            });
          }
        }
      });
    }

    // User-selected page views must exist among base + user templates.
    const userPageView = overlay?.pages?.[pageName]?.view;
    if (
      userPageView !== undefined &&
      baseTemplates[userPageView] === undefined &&
      userTemplates[userPageView] === undefined
    ) {
      problems.push({
        location: `user pages.${pageName}`,
        message: `user-selected page view "${userPageView}" does not exist — will fall back to "default"`,
      });
    }
  }

  if (overlay) {
    for (const [userPageName, userPage] of Object.entries(overlay.pages ?? {})) {
      // A user page with its own templates is a real page; without any it is dead config.
      if (viewModels.pages?.[userPageName] === undefined && !userPage.templates) {
        problems.push({
          location: `user pages.${userPageName}`,
          message: `user view model references unknown page "${userPageName}"`,
        });
      }
    }
  }

  return { ok: problems.length === 0, problems };
}

function validateTemplate(
  definition: AnyWidgetDefinition,
  template: unknown,
  location: string,
  problems: ValidationProblem[],
  actions?: ActionRegistry,
): void {
  try {
    const viewModel = definition.viewModel.parse(template);
    const unbound = unboundRequirements(definition, viewModel, actions);
    if (unbound) {
      problems.push({
        location,
        message: `widget "${definition.type}": ${unbound}`,
      });
    }
  } catch (error) {
    problems.push({
      location,
      message: `template rejected by widget "${definition.type}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}
