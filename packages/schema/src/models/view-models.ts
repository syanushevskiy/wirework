/**
 * View Model layer — HOW pages and widgets are rendered.
 *
 * A page template DECLARES its layout engine by name; the engine plugin
 * owns the rest of the template's shape and validates it
 * (contracts/layout-engine.ts, doc/layout-engines-design.md). The core
 * knows only two things: the `engine` name, and that every cell carries
 * `CellBase` (identity + widget binding) whatever the engine.
 *
 * Team-tiger review applied: arrays not numeric-keyed records (stable
 * ordering), `template` not `default`, widget templates validated by each
 * widget's own Validator at registration/boot (see contracts/widget.ts).
 */
import { z } from "zod";
import { pageBindingsSchema, type PageBindings } from "../contracts/page-events";

/** Fields every cell has, whatever the engine: identity + widget binding. */
export const cellBaseSchema = z.object({
  /**
   * Stable cell id, unique within the page (team-tiger: identity must never
   * be positional — reordering cells must not remount or re-key widgets).
   */
  id: z.string().min(1),
  /** Registered widget type (WidgetDefinition.type). */
  widget: z.string().min(1),
  /** Dot-path into the view models tree holding this widget's templates. */
  model: z.string().min(1),
  /**
   * Which template of that view model to use by default. No dots: template
   * names are joined into dot paths by editors, so a "v1.0" would write to
   * a nested branch and lose the edit.
   */
  template: z.string().min(1).regex(/^[^.]+$/, "template names must not contain a dot"),
});
export type CellBase = z.infer<typeof cellBaseSchema>;

/**
 * Core shape of a page template: the engine name. Everything else belongs
 * to that engine and is validated by its plugin.
 */
export const pageViewModelSchema = z.object({ engine: z.string().min(1) }).passthrough();
export type PageViewModel = z.infer<typeof pageViewModelSchema>;

/** Named templates of a view model ("default", "simple", "e2e", ...). */
export type Templates<T> = Record<string, T>;

/**
 * Root view models tree.
 * `pages`: page -> template -> layout (engine-owned shape).
 * `widgets`: free-form tree of widget view-model templates; leaves are
 * validated by the owning widget's Validator, not here.
 * `on`: page -> the PAGE's own reactions (contracts/page-events.ts), e.g.
 * what to load when the page opens. Beside the templates, not inside one:
 * they hold for every template of the page, and a user's copy of a template
 * never carries reactions.
 */
export interface ViewModels {
  pages: Record<string, Templates<PageViewModel>>;
  widgets: Record<string, unknown>;
  on?: Record<string, PageBindings> | undefined;
}

// `satisfies`, not an annotation: the annotation would erase `.shape`/`.extend`.
export const viewModelsSchema = z.object({
  pages: z.record(z.string(), z.record(z.string(), pageViewModelSchema)),
  widgets: z.record(z.string(), z.unknown()),
  on: z.record(z.string(), pageBindingsSchema).optional(),
}) satisfies z.ZodType<ViewModels>;
