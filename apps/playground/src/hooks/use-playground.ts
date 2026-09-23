/**
 * ALL playground logic lives here (guidelines: components are render-only):
 * the page visit and overlay UI state, live validation, permissions and the
 * page's reload key. One-time boot (registries, pages, rejection proof) is
 * `boot.ts`; page editing (session, widget edits, removal) lives in
 * use-page-editing; placing widgets lives in use-builder; this demo's own
 * event wiring lives in use-demo-bridge.
 *
 * The hook serves ONE page visit, which the router's loader opened
 * (router.tsx, boot.ts): the visit's store and bus, from that page's
 * initial state, so the state inspector shows exactly what this page put
 * there, step by step. The component using it is keyed by the visit, so
 * all state here starts over with it. BOTH trees LIVE IN THE STORE —
 * "viewModels" and "userViewModels" — alongside the data: one
 * state-management tree (for a demo page, the application's global state
 * layered under the visit's own — `layerStores` in boot.ts). The state
 * inspector edits it, widgets write into it (through reactions), editors
 * save into it, and the page re-renders reactively from it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserViewModels, ViewModels } from "@wirework/schema";
import { validateViewModels } from "@wirework/engine";
import { useStorePath } from "@wirework/react";
import type { PageVisit, Playground } from "../boot";
import { BUILDER_NAMING, builderPage, modelNamespaceOf, useBuilder } from "./use-builder";
import { useDemoBridge } from "./use-demo-bridge";
import { usePageEditing, type EditTarget } from "./use-page-editing";

/** The page the widget builder adds to. */
export const BUILDER_PAGE = "builder";

/** What a store without the trees means (the inspector can remove them): no pages, loudly. */
const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };
const NO_USER_VIEW_MODELS: UserViewModels = {};

export function usePlayground(playground: Playground, visit: PageVisit) {
  const { registry, contracts, layoutEngines, actions, rejections } = playground;
  const { page, store, bus } = visit;
  // The page's opening (the first server request, the application's session
  // request) is a side effect: it belongs here, not in the router's loader
  // that created the visit. `start` runs once per visit.
  useEffect(() => visit.start(), [visit]);

  // Reactive: inspector edits, addWidget, editors and saved sessions all go
  // through the store.
  const viewModels = useStorePath<ViewModels>(store, "viewModels") ?? NO_VIEW_MODELS;
  const userViewModels = useStorePath<UserViewModels>(store, "userViewModels") ?? NO_USER_VIEW_MODELS;
  const trees = useMemo(() => ({ viewModels, userViewModels }), [viewModels, userViewModels]);

  /** The builder's shared page, resolved once and shared with `useBuilder` below. */
  const builder = builderPage(layoutEngines, viewModels, BUILDER_PAGE, BUILDER_NAMING);

  /**
   * The user overlay. Every page has one, and a visit starts with it on or
   * off as the page says (boot.ts). On the builder there is nothing to
   * personalise until the shared page holds a widget: until then the
   * overlay is unavailable — and off.
   */
  const [overlayWanted, setOverlayWanted] = useState(visit.userOverlayOnOpen);
  const userOverlayAvailable =
    page !== BUILDER_PAGE || (builder.problem === undefined && builder.cells.length > 0);
  // The page was emptied under an overlay that was on (the inspector can):
  // it goes OFF for good, rather than coming back by itself with the next
  // widget — which would lock Add right after the first one.
  if (overlayWanted && !userOverlayAvailable) setOverlayWanted(false);
  const withUserOverlay = overlayWanted && userOverlayAvailable;

  /** LIVE validation of what is in the store — builder, editor and inspector edits included. */
  const report = useMemo(
    () => validateViewModels({ registry, layoutEngines, viewModels, userViewModels, actions }),
    [registry, layoutEngines, viewModels, userViewModels, actions],
  );

  /** This demo's own host-side wiring — not the builder's and not the engine's. */
  useDemoBridge(bus, store);

  /** With the overlay on, edits are the USER's; without it they change the shared page. */
  const target: EditTarget = withUserOverlay ? "user" : "base";
  const editing = usePageEditing({
    store,
    registry,
    layoutEngines,
    actions,
    page,
    target,
    withUserOverlay,
    trees,
    modelNamespace: modelNamespaceOf(BUILDER_NAMING),
  });

  /**
   * GLOBAL state at work: what the user may do arrived with the session
   * (app.permissions). Only an explicit `false` forbids — the builder has no
   * global state, and the demo's is still on its way when a page first shows.
   */
  const canEditPages = useStorePath<boolean>(store, "app.permissions.editPages") !== false;

  /** Toggling the overlay changes the edit target — an open session ends. */
  const toggleUserOverlay = useCallback(
    (checked: boolean) => {
      editing.cancel();
      setOverlayWanted(checked);
    },
    [editing.cancel],
  );

  /**
   * Why the builder's Add is not offered right now, if it is not. Adding
   * always changes the SHARED page: an open edit session would be silently
   * dropped by it, and a user's own view is no place for a new widget (the
   * overlay carries settings, view and layout only).
   */
  const addLocked = editing.editing
    ? "Save or cancel the page edit to add widgets."
    : target === "user"
      ? "Adding a widget changes the shared page — turn the user overlay off to add one."
      : undefined;

  /**
   * The page changed under the user's hands — a widget ADDED, a page edit
   * SAVED — so it LOADS AGAIN (`PageView`'s `reloadKey`): the page's `load`
   * event and its widgets' fire by the NEW configuration. A table whose load
   * reaction got another URL, page size or metadata flag shows it at once,
   * not after a reload of the browser. The store is untouched.
   */
  const [reloadKey, setReloadKey] = useState(0);
  const loadAgain = useCallback(() => setReloadKey((loads) => loads + 1), []);

  const { engineLocked, setEngine, addWidget } = useBuilder({
    store,
    layoutEngines,
    viewModels,
    page: BUILDER_PAGE,
    naming: BUILDER_NAMING,
    resolved: builder,
    cancelEditing: editing.cancel,
    onAdded: loadAgain,
  });

  /** Save page: commit the session, then the page loads again — by what was just saved. */
  const save = useCallback(() => {
    editing.save();
    loadAgain();
  }, [editing.save, loadAgain]);

  return {
    registry,
    contracts,
    layoutEngines,
    actions,
    engineNames: layoutEngines.keys(),
    builderEngineLocked: engineLocked,
    setBuilderEngine: setEngine,
    store,
    bus,
    report,
    rejections,
    page,
    canEditPages,
    target,
    withUserOverlay,
    userOverlayAvailable,
    setWithUserOverlay: toggleUserOverlay,
    addLocked,
    addWidget,
    ...editing,
    // After the spread: Save also loads the page again.
    save,
    reloadKey,
  };
}
