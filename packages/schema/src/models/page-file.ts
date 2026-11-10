/**
 * The PAGE FILE — one page as it travels out of the builder and into an
 * application's source (doc/pages-as-code-design.md): everything the page
 * needs that is configuration, in one JSON document.
 *
 *   { "kind": "wirework-page", "version": 1, "page": "inventory",
 *     "route": { "path": "/demo/inventory", "title": "Inventory", "menu": true },
 *     "templates": { "default": { "engine": "react-grid-layout", "cells": [ … ] } },
 *     "on": { "load": [ { "call": "runs/overview" } ] },
 *     "widgets": { "widgets.inventory.table": { "default": { … } } } }
 *
 * `templates` is `viewModels.pages[<page>]` — the prebuilt views; `on` is
 * `viewModels.on[<page>]`; `widgets` holds, BY MODEL PATH, the template map
 * of every widget a cell of any template references, the cells inside
 * containers included; `route` is what the host's router says about the
 * page, when it knows; `roles` holds, BY ROLE, what `viewModels.roles.<role>`
 * says about this page (doc/roles-design.md) — a role's layouts are shared
 * configuration and travel with the page. The user overlay is never in a page file: a user's
 * own view is theirs, not the application's. Only the shape is checked
 * here; what the templates and the widgets mean is for the registries
 * (`validateViewModels`), after the file is merged into a tree.
 */
import { z } from "zod";
import { ROLE_NAME } from "../contracts/names";
import { pageBindingsSchema } from "../contracts/page-events";
import { pageViewModelSchema } from "./page-template";
import { pageUserViewModelSchema } from "./user-view-models";

export const PAGE_FILE_KIND = "wirework-page";
export const PAGE_FILE_VERSION = 1;

/** What a host's router says about a page: where it is and how the menu names it. */
export const pageRouteSchema = z.object({
  path: z.string().min(1),
  title: z.string(),
  menu: z.boolean(),
});
export type PageRoute = z.infer<typeof pageRouteSchema>;

/** What every role says about the page, by role (doc/roles-design.md). */
export const pageRolesSchema = z.record(z.string().regex(ROLE_NAME), pageUserViewModelSchema);
export type PageRoles = z.infer<typeof pageRolesSchema>;

/**
 * In a file the layouts NEST, as HTML does (doc/pages-as-code-design.md,
 * "Reviewed"): the cell of a widget whose definition `contains` a layout —
 * a card, tabs, a dialog — carries that widget's template map as
 * `templates`, the layouts inside it with their own cells, nested in turn.
 * A container's templates are written ONCE, in the first cell (document
 * order: the page's templates, then the roles') that points at its model;
 * a later cell of the same model only names it. `widgets` holds the other
 * widgets' template maps by model path. Merging a file into a tree moves
 * every nested map back to its model path and the cells are plain again.
 */
export const pageFileSchema = z.object({
  kind: z.literal(PAGE_FILE_KIND),
  version: z.literal(PAGE_FILE_VERSION),
  page: z.string().min(1),
  route: pageRouteSchema.optional(),
  templates: z.record(z.string(), pageViewModelSchema),
  on: pageBindingsSchema.optional(),
  widgets: z.record(z.string(), z.record(z.string(), z.unknown())),
  roles: pageRolesSchema.optional(),
});
export type PageFile = z.infer<typeof pageFileSchema>;

/**
 * The page as a FOLDER in an application's source — `pages/<page>/` — the
 * same page file in parts, one file each, so a reader opens what they are
 * after: `page.json` says WHICH page (its kind, version, name and route),
 * `viewModel.json` what it LOOKS like and does (its templates with the
 * containers' layouts nested inside, and its reactions), `roles.json` what
 * every role says about it (`{}` where no role does), `widgets.json` the
 * templates of the widgets that show or edit a value. Together they are one
 * `PageFile`.
 */
export const PAGE_FOLDER_FILES = {
  page: "page.json",
  viewModel: "viewModel.json",
  roles: "roles.json",
  widgets: "widgets.json",
} as const;
export type PageFolderPart = keyof typeof PAGE_FOLDER_FILES;

export const pageInfoFileSchema = pageFileSchema.pick({ kind: true, version: true, page: true, route: true });
export type PageInfoFile = z.infer<typeof pageInfoFileSchema>;
export const pageViewModelFileSchema = pageFileSchema.pick({ templates: true, on: true });
export type PageViewModelFile = z.infer<typeof pageViewModelFileSchema>;
export const pageWidgetsFileSchema = pageFileSchema.shape.widgets;
export type PageWidgetsFile = z.infer<typeof pageWidgetsFileSchema>;

export interface PageFolder {
  page: PageInfoFile;
  viewModel: PageViewModelFile;
  /** What every role says about the page — `{}` where no role does. */
  roles: PageRoles;
  widgets: PageWidgetsFile;
}
