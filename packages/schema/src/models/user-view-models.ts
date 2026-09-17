/**
 * User View Model layer — user defaults and customisation applied ON TOP of
 * the View Models:
 *  - which page template ("view") the user selected,
 *  - the user's OWN page templates (e.g. "my-own": a copied and edited
 *    layout), selectable via `view` exactly like base templates,
 *  - per-CELL widget customisation: selected widget template and settings
 *    overrides per template (keyed by cell id — two cells of the same
 *    widget type are customised independently).
 *
 * Fallback chain (per team-tiger QA review): user-selected template ->
 * cell/default template -> boot-validation error. A user override referencing
 * a missing template falls back and is reported, never silently dropped.
 */
import { z } from "zod";
import { RESERVED_VIEW_MODEL_KEYS } from "../contracts/settings";
import { pageViewModelSchema } from "./view-models";

/**
 * One template's settings overrides. SETTINGS only: `inputs` and `on` are
 * the page's wiring, and a user's view must not be able to rebind a widget,
 * call an action or write a data path the page never declared (team-tiger
 * review, Ren).
 */
const userSettingsSchema = z
  .record(z.string(), z.unknown())
  .refine((settings) => Object.keys(settings).every((key) => !RESERVED_VIEW_MODEL_KEYS.has(key)), {
    message: "user settings may not contain inputs or on (bindings belong to the page)",
  });

/** User's customisation of a single widget instance (cell) on a page. */
export const widgetUserViewModelSchema = z.object({
  /** Selected view-model template for the widget (optional). */
  view: z.string().min(1).optional(),
  /** Per-template settings overrides, keyed by template name. */
  settings: z.record(z.string(), userSettingsSchema).optional(),
});
export type WidgetUserViewModel = z.infer<typeof widgetUserViewModelSchema>;

/** User's customisation of a single page. */
export const pageUserViewModelSchema = z.object({
  /** Selected page layout template — base or user-owned. */
  view: z.string().min(1).optional(),
  /** User-owned page templates, layered over the base ones by name. */
  templates: z.record(z.string(), pageViewModelSchema).optional(),
  /** Widget customisations keyed by CELL id. */
  cells: z.record(z.string(), widgetUserViewModelSchema).optional(),
});
export type PageUserViewModel = z.infer<typeof pageUserViewModelSchema>;

/** Root user view model. */
export const userViewModelsSchema = z.object({
  pages: z.record(z.string(), pageUserViewModelSchema).optional(),
});
export type UserViewModels = z.infer<typeof userViewModelsSchema>;
