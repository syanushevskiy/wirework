/**
 * View Model layer — HOW pages and widgets are rendered.
 *
 * A page template DECLARES its layout engine by name; the engine plugin
 * owns the rest of the template's shape and validates it
 * (contracts/layout-engine.ts, doc/ADR/0003-layout-engines.md). The core
 * knows only two things: the `engine` name, and that every cell carries
 * `CellBase` (identity + widget binding) whatever the engine
 * (page-template.ts).
 *
 * Team-tiger review applied: arrays not numeric-keyed records (stable
 * ordering), `template` not `default`, widget templates validated by each
 * widget's own Validator at registration/boot (see contracts/widget.ts).
 */
import { z } from "zod";
import { ROLE_NAME } from "../contracts/names";
import { pageBindingsSchema, type PageBindings } from "../contracts/page-events";
import { userViewModelsSchema, type UserViewModels } from "./user-view-models";
import { pageViewModelSchema, type PageViewModel, type Templates } from "./page-template";
import { formatStampSchema, type FormatStamp } from "./versions";

/**
 * Root view models tree.
 * `pages`: page -> template -> layout (engine-owned shape).
 * `widgets`: free-form tree of widget view-model templates; leaves are
 * validated by the owning widget's Validator, not here.
 * `on`: page -> the PAGE's own reactions (contracts/page-events.ts), e.g.
 * what to load when the page opens. Beside the templates, not inside one:
 * they hold for every template of the page, and a user's copy of a template
 * never carries reactions.
 * `roles`: what a ROLE's pages are, on top of the base (doc/ADR/0012-roles.md):
 * the user overlay's shape — a page's view, own templates, a cell's widget
 * template and settings — keyed by role name. Resolution folds the base,
 * then the user's roles in the session's order, then the user's own
 * overlay; a role picks templates and never carries wiring, like a user.
 */
export interface ViewModels {
  /** The format stamp of the tree as it is stored (doc/ADR/0017-versioning-and-upgrades.md); absent = format 1. */
  versions?: FormatStamp | undefined;
  pages: Record<string, Templates<PageViewModel>>;
  widgets: Record<string, unknown>;
  on?: Record<string, PageBindings> | undefined;
  roles?: Record<string, UserViewModels> | undefined;
}

// `satisfies`, not an annotation: the annotation would erase `.shape`/`.extend`.
export const viewModelsSchema = z.object({
  versions: formatStampSchema.optional(),
  pages: z.record(z.string(), z.record(z.string(), pageViewModelSchema)),
  widgets: z.record(z.string(), z.unknown()),
  on: z.record(z.string(), pageBindingsSchema).optional(),
  roles: z
    .record(z.string().regex(ROLE_NAME, "a role name is kebab-case, one namespace at most"), userViewModelsSchema)
    .optional(),
}) satisfies z.ZodType<ViewModels>;
