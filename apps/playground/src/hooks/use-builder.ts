/**
 * ALL widget-BUILDER logic: the page a builder adds to, the engine it may
 * still choose, and placing a widget on it. Everything a host would have to
 * decide is NAMING, and naming is an argument — no page name, no id scheme
 * and no template name is written into this file. What remains is the part
 * that is the same for every host, so it can move into a package of its own
 * (see the extraction plan): this hook knows the engine registry and the
 * store, never a concrete widget, route or fixture.
 *
 * Placing a widget writes THROUGH THE STORE — the state inspector shows it
 * instantly and the engine treats it exactly like static configuration.
 */
import { useCallback } from "react";
import type { Store, ViewModels, WidgetBindings } from "@wirework/schema";
import { resolveTemplate, updatePageTemplate, type LayoutEngineRegistry } from "@wirework/engine";
import type { WidgetSettings } from "./use-widget-form";

/** What a builder calls the things it creates. A host may name them differently. */
export interface BuilderNaming {
  /** The page template the builder edits (`pages.<page>.<pageView>`). */
  pageView: string;
  /** The template name a placed widget gets (`widgets.<modelGroup>.<cellId>.<widgetTemplate>`). */
  widgetTemplate: string;
  /** The group under `viewModels.widgets` that holds placed widgets' templates. */
  modelGroup: string;
  /** The next free cell id, given every id and template name the page already uses. */
  cellId: (taken: readonly string[]) => string;
}

/**
 * Ids of the form `<prefix>-1`, `<prefix>-2`, … — derived from what is
 * TAKEN rather than from a counter, because the state inspector may have
 * applied a tree that already holds some.
 */
export function numberedIds(prefix: string): (taken: readonly string[]) => string {
  const head = `${prefix}-`;
  return (taken) => {
    const used = taken.flatMap((name) => {
      const rest = name.startsWith(head) ? name.slice(head.length) : "";
      return /^\d+$/.test(rest) ? [Number(rest)] : [];
    });
    return `${head}${Math.max(0, ...used) + 1}`;
  };
}

/** How this playground names what its builder creates. */
export const BUILDER_NAMING: BuilderNaming = {
  pageView: "default",
  widgetTemplate: "default",
  modelGroup: "custom",
  cellId: numberedIds("custom"),
};

/** Where a builder's widget templates live — the prefix that marks a model as builder-owned. */
export const modelNamespaceOf = (naming: BuilderNaming): string => `widgets.${naming.modelGroup}`;

/** The builder's SHARED page template, as the store holds it — not an edit session's view of it. */
export function builderPage(
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  page: string,
  naming: BuilderNaming,
) {
  return resolveTemplate(layoutEngines, viewModels.pages?.[page]?.[naming.pageView]);
}

export interface BuilderInput {
  store: Store;
  layoutEngines: LayoutEngineRegistry;
  viewModels: ViewModels;
  /** The page widgets are added to. */
  page: string;
  naming: BuilderNaming;
  /** The page as `builderPage` resolved it — passed in so it is resolved once. */
  resolved: ReturnType<typeof builderPage>;
  /** Choosing an engine replaces the page template: an open session would be stale. */
  cancelEditing: () => void;
  /** The page changed, so it must load again by the new configuration. */
  onAdded: () => void;
}

export function useBuilder({
  store,
  layoutEngines,
  viewModels,
  page,
  naming,
  resolved,
  cancelEditing,
  onAdded,
}: BuilderInput) {
  /**
   * The engine is a free choice UNTIL the first widget is placed: picking one
   * replaces the (empty) template with that engine's empty template. With
   * cells in place it is locked — there is no conversion between engines by
   * decision.
   */
  const engineLocked = resolved.problem !== undefined || resolved.cells.length > 0;

  const setEngine = useCallback(
    (name: string) => {
      const engine = layoutEngines.get(name);
      const current = builderPage(layoutEngines, viewModels, page, naming);
      if (!engine || current.problem !== undefined || current.cells.length > 0) return;
      cancelEditing();
      store.setConfig(
        "viewModels",
        updatePageTemplate(viewModels, page, naming.pageView, () => engine.empty()),
      );
    },
    [layoutEngines, viewModels, page, naming, store, cancelEditing],
  );

  /**
   * Place a widget: a fresh BASE widget template holding the bindings (input
   * paths + event reactions) and the settings the user typed (the widget's
   * defaults fill the rest), plus a cell appended by the page's engine
   * plugin. Read fresh from the store, never from a closure: the inspector
   * may have changed the tree since this callback was made.
   */
  const addWidget = useCallback(
    (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => {
      const prev = store.get<ViewModels>("viewModels");
      if (!prev) return;
      const target = builderPage(layoutEngines, prev, page, naming);
      // No template to append to (removed via the inspector): write nothing
      // rather than a dangling widget template nobody references.
      if (target.problem !== undefined) return;
      const group = (prev.widgets[naming.modelGroup] as Record<string, unknown> | undefined) ?? {};
      const id = naming.cellId([...Object.keys(group), ...target.cells.map((cell) => cell.id)]);
      const template = {
        inputs: bindings.inputs,
        ...(Object.keys(bindings.on).length > 0 ? { on: bindings.on } : {}),
        ...settings,
      };
      const withCell = updatePageTemplate(prev, page, naming.pageView, () =>
        target.engine.appendCell(target.template, {
          id,
          widget: widgetType,
          model: `${modelNamespaceOf(naming)}.${id}`,
          template: naming.widgetTemplate,
        }),
      );
      const placed = (withCell.widgets[naming.modelGroup] as Record<string, unknown> | undefined) ?? {};
      store.setConfig("viewModels", {
        ...withCell,
        widgets: {
          ...withCell.widgets,
          [naming.modelGroup]: { ...placed, [id]: { [naming.widgetTemplate]: template } },
        },
      });
      onAdded();
    },
    [store, layoutEngines, page, naming, onAdded],
  );

  return { engineLocked, setEngine, addWidget };
}
