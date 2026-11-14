/**
 * The OVERLAY LAYERS (doc/ADR/0012-roles.md): the base view models are read
 * through a list of overlays, every one in the user overlay's shape — the
 * entries of the roles the user holds, in the session's order from the
 * broadest to the most specific, then the user's own. ONE rule at every
 * place an overlay is read: base, then the roles in the order given, then
 * the user — the LAST layer that sets a thing wins, per thing (a page's
 * view, a cell's template, one setting). No inheritance between roles: the
 * host orders the list, because it knows who is also an admin. A role entry
 * has the tree's shape (`viewModelsSchema`), so it is read as it is.
 */
import type { UserViewModels, ViewModels, WidgetUserViewModel } from "@wirework/schema";
import { deepMerge } from "./paths";

/** The overlays a page is read through, in the order they apply. */
export type Overlays = readonly UserViewModels[];

/** The whole fold: the entries of the roles held (a role without an entry is nothing), then the user's own overlay. */
export const overlayLayers = (
  viewModels: ViewModels,
  roles: readonly string[] | undefined,
  userViewModels: UserViewModels | undefined,
): Overlays => [
  ...(roles ?? []).map((role) => viewModels.roles?.[role]).filter((entry) => entry !== undefined),
  ...(userViewModels === undefined ? [] : [userViewModels]),
];

/**
 * The layers as ONE VIEW of a page reads them: in every layer, what it
 * holds for that view alone (`viewCells.<view>` — a view's own layouts
 * inside its containers, doc/ADR/0006-page-views.md) merged over its `cells`.
 * The result has the overlays' own shape, so everything below — a cell's
 * settings, the layouts inside containers, validation — reads it unchanged.
 * A layer with nothing for the view is the layer itself.
 */
export const viewLayers = (overlays: Overlays, page: string, view: string | undefined): Overlays =>
  overlays.map((overlay) => {
    const entry = overlay.pages?.[page];
    const own = view === undefined ? undefined : entry?.viewCells?.[view];
    if (entry === undefined || own === undefined) return overlay;
    const cells = { ...entry.cells };
    for (const [key, cell] of Object.entries(own)) {
      // The one cast: two cell entries merged key by key are a cell entry.
      cells[key] = deepMerge(cells[key], cell) as WidgetUserViewModel;
    }
    return { ...overlay, pages: { ...overlay.pages, [page]: { ...entry, cells } } };
  });

/** What every layer holds for one view alone, merged in order — what a COPY of that view takes along. Undefined when none has any. */
export const foldViewCells = (
  overlays: Overlays,
  page: string,
  view: string,
): Record<string, WidgetUserViewModel> | undefined =>
  overlays.reduce<Record<string, WidgetUserViewModel> | undefined>(
    // The one cast: maps of cell entries merged are a map of cell entries.
    (merged, overlay) =>
      deepMerge(merged, overlay.pages?.[page]?.viewCells?.[view]) as Record<string, WidgetUserViewModel> | undefined,
    undefined,
  );

/** The page views the layers choose, the LAST layer's first — candidates for `pickTemplate`. */
export const viewCandidates = (overlays: Overlays, page: string): string[] =>
  overlays
    .map((overlay) => overlay.pages?.[page]?.view)
    .filter((view) => view !== undefined)
    .reverse();

/** The widget templates the layers choose for one cell, the LAST layer's first. */
export const cellViewCandidates = (overlays: Overlays, page: string, cellId: string): string[] =>
  overlays
    .map((overlay) => overlay.pages?.[page]?.cells?.[cellId]?.view)
    .filter((view) => view !== undefined)
    .reverse();

/** Every layer's settings for one cell's template, merged in order — undefined when no layer has any. */
export const foldSettings = (overlays: Overlays, page: string, cellId: string, template: string): unknown =>
  overlays.reduce<unknown>(
    (merged, overlay) => deepMerge(merged, overlay.pages?.[page]?.cells?.[cellId]?.settings?.[template]),
    undefined,
  );
