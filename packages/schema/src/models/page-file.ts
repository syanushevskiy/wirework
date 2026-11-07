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

export const pageFileSchema = z.object({
  kind: z.literal(PAGE_FILE_KIND),
  version: z.literal(PAGE_FILE_VERSION),
  page: z.string().min(1),
  route: pageRouteSchema.optional(),
  templates: z.record(z.string(), pageViewModelSchema),
  on: pageBindingsSchema.optional(),
  widgets: z.record(z.string(), z.record(z.string(), z.unknown())),
  roles: z.record(z.string().regex(ROLE_NAME), pageUserViewModelSchema).optional(),
});
export type PageFile = z.infer<typeof pageFileSchema>;
