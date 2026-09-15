/**
 * ALL playground logic lives here (guidelines: components are render-only):
 * one-time boot (widget registry, layout-engine registry, store, bus,
 * rejection proof), live validation, the page/overlay UI state, runtime
 * widget addition, and the host-side event subscription example. Page
 * editing (session, widget edits, removal) lives in use-page-editing.
 *
 * BOTH trees LIVE IN THE STORE — "viewModels" and "userViewModels" —
 * alongside the data models: one state-management tree. The state
 * inspector edits it, widgets write into it (through reactions), editors
 * save into it, and the page re-renders reactively from it.
 */
import { useCallback, useMemo, useState } from "react";
import {
  eventFilter,
  type UserViewModels,
  type ViewModels,
  type WidgetBindings,
} from "@wirework/schema";
import {
  createActions,
  createLayoutEngines,
  createRegistry,
  resolveTemplate,
  updatePageTemplate,
  validateViewModels,
} from "@wirework/engine";
import { flexRowsEngine } from "@wirework/engine-flex-rows";
import { flexLayoutEngine } from "@wirework/engine-flexlayout";
import { gridstackEngine } from "@wirework/engine-gridstack";
import { reactGridLayoutEngine } from "@wirework/engine-react-grid-layout";
import { createEventBus } from "@wirework/events";
import { useStorePath, useWidgetEvent } from "@wirework/react";
import { createStore } from "@wirework/store";
import {
  seedData,
  userViewModels as fixtureUserViewModels,
  viewModels as fixtureViewModels,
} from "@wirework/view-data-models-examples";
import { brokenWidgets, dummyRunsTable, exampleWidgets } from "@wirework/widgets-examples";
import { usePageEditing, type EditTarget } from "./use-page-editing";
import type { WidgetSettings } from "./use-widget-form";

export const PAGES = ["demo", "builder"] as const;
export type PageName = (typeof PAGES)[number];

/** The page whose edits are the USER's (saved in the overlay). */
const USER_PAGE: PageName = "demo";

function boot() {
  const registry = createRegistry();
  for (const widget of exampleWidgets) registry.register(widget);

  // Layout engines are plugins too: a page template names one.
  const layoutEngines = createLayoutEngines();
  layoutEngines.register(reactGridLayoutEngine);
  layoutEngines.register(flexRowsEngine);
  layoutEngines.register(gridstackEngine);
  layoutEngines.register(flexLayoutEngine);

  // Host ACTIONS: what a user may attach to an event beyond a store write
  // (doc/widget-events-design.md, "Listening"). Business code lives here,
  // named and described; the builder lists them.
  const actions = createActions();
  actions.register({
    name: "reset-counter",
    description: "Set demo.counter back to 0",
    handler: ({ store }) => store.set("demo.counter", 0),
  });
  actions.register({
    name: "clear-selected-run",
    description: "Forget the selected run",
    handler: ({ store }) => store.set("runs.selected", undefined),
  });
  actions.register({
    name: "log-event",
    description: "console.log the event (debugging)",
    // eslint-disable-next-line no-console
    handler: ({ event, args }) => console.log("[action log-event]", event, args),
  });

  // Negative proof: every broken definition must be rejected loudly.
  const rejections: string[] = [];
  for (const [name, definition] of Object.entries(brokenWidgets)) {
    try {
      registry.register(definition);
      rejections.push(`${name}: was ACCEPTED — registry guard is broken!`);
    } catch (error) {
      rejections.push(
        `${name}: rejected (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  // One state tree: both view-model trees live next to the data models.
  const store = createStore({
    viewModels: fixtureViewModels,
    userViewModels: fixtureUserViewModels,
    ...seedData,
  });
  const bus = createEventBus();
  return { registry, layoutEngines, actions, store, bus, rejections };
}

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
  // silently recreate the store and reset all runtime state.
  const [{ registry, layoutEngines, actions, store, bus, rejections }] = useState(boot);
  // Reactive: inspector edits, addWidget, editors and saved sessions all go
  // through the store.
  const viewModels = useStorePath<ViewModels>(store, "viewModels") ?? fixtureViewModels;
  const userViewModels =
    useStorePath<UserViewModels>(store, "userViewModels") ?? fixtureUserViewModels;
  const trees = useMemo(() => ({ viewModels, userViewModels }), [viewModels, userViewModels]);
  const [page, setPage] = useState<PageName>("demo");
  const [withUserOverlay, setWithUserOverlay] = useState(true);

  /** LIVE validation of what is in the store — builder, editor and inspector edits included. */
  const report = useMemo(
    () => validateViewModels(registry, layoutEngines, viewModels, userViewModels, actions),
    [registry, layoutEngines, viewModels, userViewModels, actions],
  );

  /**
   * Host-side subscription example: a row action is an INTENT on the bus;
   * the host turns it into STATE ("runs.selected") that any widget can
   * display. The payload is typed by the widget's declaration — no cast.
   */
  useWidgetEvent(bus, eventFilter(dummyRunsTable, "row-selected"), (event) =>
    store.set("runs.selected", event.payload.id),
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

  const selectPage = useCallback(
    (name: PageName) => {
      editing.cancel();
      setPage(name);
    },
    [editing.cancel],
  );

  /**
   * The builder's engine is a free choice UNTIL the first widget is placed:
   * picking one replaces the (empty) builder template with that engine's
   * empty template. With cells in place the engine is locked — there is no
   * conversion between engines by decision.
   */
  const builder = resolveTemplate(layoutEngines, viewModels.pages?.["builder"]?.["default"]);
  const builderEngineLocked =
    builder.problem !== undefined || builder.engine.cells(builder.template).length > 0;
  const setBuilderEngine = useCallback(
    (name: string) => {
      const engine = layoutEngines.get(name);
      const current = resolveTemplate(layoutEngines, viewModels.pages?.["builder"]?.["default"]);
      if (!engine || current.problem !== undefined || current.engine.cells(current.template).length > 0) return;
      editing.cancel();
      store.set("viewModels", updatePageTemplate(viewModels, "builder", "default", () => engine.empty()));
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
   * static configuration.
   */
  const addWidget = useCallback(
    (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => {
      editing.cancel();
      const prev = store.get<ViewModels>("viewModels");
      if (!prev) return;
      const builder = resolveTemplate(layoutEngines, prev.pages?.["builder"]?.["default"]);
      // No builder template to append to (removed via the inspector): write
      // nothing rather than a dangling widget template nobody references.
      if (builder.problem !== undefined) return;
      const id = nextCustomId(prev, builder.engine.cells(builder.template).map((cell) => cell.id));
      const template = {
        inputs: bindings.inputs,
        ...(Object.keys(bindings.on).length > 0 ? { on: bindings.on } : {}),
        ...settings,
      };
      const withCell = updatePageTemplate(prev, "builder", "default", () =>
        builder.engine.appendCell(builder.template, {
          id,
          widget: widgetType,
          model: `widgets.custom.${id}`,
          template: "default",
        }),
      );
      const customTemplates =
        (withCell.widgets["custom"] as Record<string, unknown> | undefined) ?? {};
      store.set("viewModels", {
        ...withCell,
        widgets: {
          ...withCell.widgets,
          custom: { ...customTemplates, [id]: { default: template } },
        },
      });
    },
    [store, layoutEngines, editing.cancel],
  );

  return {
    registry,
    layoutEngines,
    actions,
    engineNames: layoutEngines.names(),
    builderEngineLocked,
    setBuilderEngine,
    store,
    bus,
    report,
    rejections,
    page,
    selectPage,
    target,
    withUserOverlay,
    setWithUserOverlay: toggleUserOverlay,
    addWidget,
    ...editing,
  };
}
