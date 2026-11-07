/**
 * A PAGE TEMPLATE's core shape — what the view models, the user overlay and
 * the role layer all hold (view-models.ts, user-view-models.ts): the layout
 * engine's name, and a cell's identity and widget binding whatever the
 * engine. In a module of its own because the view models hold the user
 * overlay's shape under `roles` and the overlay holds page templates: both
 * import this, neither imports the other.
 *
 * A page template DECLARES its layout engine by name; the engine plugin
 * owns the rest of the template's shape and validates it
 * (contracts/layout-engine.ts, doc/layout-engines-design.md).
 */
import { z } from "zod";

/** Fields every cell has, whatever the engine: identity + widget binding. */
export const cellBaseSchema = z.object({
  /**
   * Stable cell id, unique within the page: identity is never positional —
   * reordering cells must not remount or re-key widgets.
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
  template: z
    .string()
    .min(1)
    .regex(/^[^.]+$/, "template names must not contain a dot"),
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
