/**
 * ALL playground logic lives here (guidelines: components are render-only):
 * the page visit and overlay UI state, live validation, runtime widget
 * addition and the host-side event subscription example. One-time boot
 * (registries, pages, rejection proof) is `boot.ts`; page editing (session,
 * widget edits, removal) lives in use-page-editing.
 *
 * Opening a page starts a VISIT: a fresh store and bus from that page's
 * initial state (boot.ts), so the state inspector shows exactly what this
 * page put there, step by step. BOTH trees LIVE IN THE STORE —
 * "viewModels" and "userViewModels" — alongside the data: one
 * state-management tree. The state inspector edits it, widgets write into
 * it (through reactions), editors save into it, and the page re-renders
 * reactively from it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  eventFilter,
  type UserViewModels,
  type ViewModels,
  type WidgetBindings,
} from "@wirework/schema";
import { resolveTemplate, updatePageTemplate, validateViewModels } from "@wirework/engine";
import { useStorePath, useWidgetEvent } from "@wirework/react";
import { antdTable } from "@wirework/antd-widgets";
import { boot } from "../boot";
import { usePageEditing, type EditTarget } from "./use-page-editing";
import type { WidgetSettings } from "./use-widget-form";

/** The page whose edits are the USER's (saved in the overlay). */
const USER_PAGE = "demo";
/** The page the widget builder adds to. */
export const BUILDER_PAGE = "builder";

/** What a store without the trees means (the inspector can remove them): no pages, loudly. */
const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };
const NO_USER_VIEW_MODELS: UserViewModels = {};

/**
 * Next free builder cell id, derived from the STORE (not a counter): the
 * inspector may have applied state that already holds custom-N cells.
 */
function nextCustomId(viewModels: ViewModels, cellIds: string[]): string {
  const numbers = (keys: Iterable<string>): number[] =>
    [...keys].flatMap((key) => {
      const match = /^custom-(\d+)$/.exec(key);
      return match ? [Number(match[1])] : [];
    });
  const customTemplates = Object.keys(
    (viewModels.widgets["custom"] as Record<string, unknown> | undefined) ?? {},
  );
  return `custom-${Math.max(0, ...numbers(customTemplates), ...numbers(cellIds)) + 1}`;
}

export function usePlayground() {
  // useState, not useMemo: React may discard memo caches, which would
  // silently recreate the registries and reset all runtime state.
  const [{ registry, contracts, layoutEngines, actions, rejections, pageNames, openPage }] = useState(boot);
  const [visit, setVisit] = useState(() => openPage(USER_PAGE));
  const { page, store, bus } = visit;
  // The page's opening (the demo's first server request) is a side effect:
  // it belongs here, not in the initializer above. `start` runs once per visit.
  useEffect(() => visit.start(), [visit]);

  // Reactive: inspector edits, addWidget, editors and saved sessions all go
  // through the store.
  const viewModels = useStorePath<ViewModels>(store, "viewModels") ?? NO_VIEW_MODELS;
  const userViewModels = useStorePath<UserViewModels>(store, "userViewModels") ?? NO_USER_VIEW_MODELS;
  const trees = useMemo(() => ({ viewModels, userViewModels }), [viewModels, userViewModels]);
  const [withUserOverlay, setWithUserOverlay] = useState(true);

  /** LIVE validation of what is in the store — builder, editor and inspector edits included. */
  const report = useMemo(
    () => validateViewModels({ registry, layoutEngines, viewModels, userViewModels, actions }),
    [registry, layoutEngines, viewModels, userViewModels, actions],
  );

  /**
   * Host-side subscription example: a row click is an INTENT on the bus;
   * the host turns it into STATE ("runs.selected") that any widget can
   * display. The payload is typed by the widget's declaration — no cast.
   * Scoped to the demo's runs table: the table is generic, and a table
   * added in the builder must not change the selected run.
   */
  useWidgetEvent(bus, eventFilter(antdTable, "row-selected", { page: "demo", cell: "table-main" }), (event) =>
    store.set("runs.selected", event.payload.key),
  );

  const target: EditTarget = page === USER_PAGE && withUserOverlay ? "user" : "base";
  const editing = usePageEditing({
    store,
    registry,
    layoutEngines,
    actions,
    page,
    target,
    withUserOverlay,
    trees,
  });

  /**
   * Opening a page — the current one included — starts a new visit: a fresh
   * store from the page's initial state. The visit is created HERE, in the
   * event handler, never inside a state updater (StrictMode runs those twice).
   */
  const selectPage = useCallback(
    (name: string) => {
      editing.cancel();
      setVisit(openPage(name));
    },
    [editing.cancel, openPage],
  );

  /**
   * The builder's engine is a free choice UNTIL the first widget is placed:
   * picking one replaces the (empty) builder template with that engine's
   * empty template. With cells in place the engine is locked — there is no
   * conversion between engines by decision.
   */
  const builder = resolveTemplate(layoutEngines, viewModels.pages?.[BUILDER_PAGE]?.["default"]);
  const builderEngineLocked =
    builder.problem !== undefined || builder.cells.length > 0;
  const setBuilderEngine = useCallback(
    (name: string) => {
      const engine = layoutEngines.get(name);
      const current = resolveTemplate(layoutEngines, viewModels.pages?.[BUILDER_PAGE]?.["default"]);
      if (!engine || current.problem !== undefined || current.cells.length > 0) return;
      editing.cancel();
      store.setConfig("viewModels", updatePageTemplate(viewModels, BUILDER_PAGE, "default", () => engine.empty()));
    },
    [layoutEngines, viewModels, store, editing.cancel],
  );

  /** Toggling the overlay changes the edit target — an open session ends. */
  const toggleUserOverlay = useCallback(
    (checked: boolean) => {
      editing.cancel();
      setWithUserOverlay(checked);
    },
    [editing.cancel],
  );

  /**
   * Add a widget to the builder page: a fresh BASE view-model template
   * holding the bindings (input paths + event reactions) and the settings
   * the user typed (widget defaults fill the rest), plus a cell appended by
   * the page's engine plugin. Written THROUGH THE STORE — the state
   * inspector shows it instantly and the engine treats it exactly like
   * static configuration. Not offered during a page edit session: the
   * builder's Add is disabled then, so a session is never silently dropped.
   */
  const addWidget = useCallback(
    (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => {
      const prev = store.get<ViewModels>("viewModels");
      if (!prev) return;
      const builder = resolveTemplate(layoutEngines, prev.pages?.[BUILDER_PAGE]?.["default"]);
      // No builder template to append to (removed via the inspector): write
      // nothing rather than a dangling widget template nobody references.
      if (builder.problem !== undefined) return;
      const id = nextCustomId(prev, builder.cells.map((cell) => cell.id));
      const template = {
        inputs: bindings.inputs,
        ...(Object.keys(bindings.on).length > 0 ? { on: bindings.on } : {}),
        ...settings,
      };
      const withCell = updatePageTemplate(prev, BUILDER_PAGE, "default", () =>
        builder.engine.appendCell(builder.template, {
          id,
          widget: widgetType,
          model: `widgets.custom.${id}`,
          template: "default",
        }),
      );
      const customTemplates =
        (withCell.widgets["custom"] as Record<string, unknown> | undefined) ?? {};
      store.setConfig("viewModels", {
        ...withCell,
        widgets: {
          ...withCell.widgets,
          custom: { ...customTemplates, [id]: { default: template } },
        },
      });
    },
    [store, layoutEngines],
  );

  return {
    registry,
    contracts,
    layoutEngines,
    actions,
    engineNames: layoutEngines.keys(),
    builderEngineLocked,
    setBuilderEngine,
    store,
    bus,
    report,
    rejections,
    pages: pageNames,
    page,
    /** Changes with every visit: a key for what must start over with the store. */
    visitId: visit.id,
    selectPage,
    target,
    withUserOverlay,
    setWithUserOverlay: toggleUserOverlay,
    addWidget,
    ...editing,
  };
}
