/**
 * ALL widget-BUILDER logic: the page a builder adds to, the engine it may
 * still choose, and placing a widget on it. Everything a host would have to
 * decide is NAMING, and naming is an argument — no page name, no id scheme
 * and no template name is written into this file. The hook knows the engine
 * registry and the store, never a concrete widget, a route or a fixture.
 *
 * One rule about state, kept in one place: what is RENDERED (`engineLocked`,
 * `hasCells`) comes from the store subscription, so it follows every change;
 * what is WRITTEN (`setEngine`, `addWidget`) is computed from a fresh read
 * of the store at the moment of the click, never from a render's snapshot —
 * an inspector or another editor may have changed the tree since.
 *
 * Placing a widget writes THROUGH `commit` — the store, then the host's
 * `save` — so a host's inspector shows it instantly and the engine treats it
 * exactly like static configuration.
 */
import { useCallback } from "react";
import type { Store, ViewModels, WidgetBindings } from "@wirework/schema";
import {
  resolveTemplate,
  updatePageTemplate,
  type LayoutEngineRegistry,
  type TemplateResolution,
} from "@wirework/engine";
import { useStorePath } from "@wirework/react";
import type { EngineLock } from "./locks";
import type { Commit } from "./use-commit";
import type { WidgetSettings } from "./form-drafts";

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
 * TAKEN rather than from a counter, because a host may have applied a tree
 * that already holds some.
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

/** The names a builder uses unless the host says otherwise. */
export const DEFAULT_BUILDER_NAMING: BuilderNaming = {
  pageView: "default",
  widgetTemplate: "default",
  modelGroup: "custom",
  cellId: numberedIds("custom"),
};

/** Where a builder's widget templates live — the prefix that marks a model as builder-owned. */
export const modelNamespaceOf = (naming: BuilderNaming): string => `widgets.${naming.modelGroup}`;

const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };

/** The builder's SHARED page template, as the store holds it — not an edit session's view of it. */
export function builderPage(
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  page: string,
  naming: BuilderNaming,
): TemplateResolution {
  return resolveTemplate(layoutEngines, viewModels.pages?.[page]?.[naming.pageView]);
}

export interface BuilderInput {
  store: Store;
  /** THE write path (use-commit): placing a widget commits through it, never to the store itself. */
  commit: Commit;
  /** Whether this user may change pages at all — placing a widget changes the shared one. Required: a builder never assumes it may write. */
  canEdit: boolean;
  layoutEngines: LayoutEngineRegistry;
  /** The page widgets are added to. */
  page: string;
  naming: BuilderNaming;
  /** Choosing an engine replaces the page template: an open session would be stale. */
  cancelEditing: () => void;
  /** The page changed, so it must load again by the new configuration. */
  onAdded: () => void;
}

export function useBuilder({
  store,
  commit,
  canEdit,
  layoutEngines,
  page,
  naming,
  cancelEditing,
  onAdded,
}: BuilderInput) {
  // Rendered facts follow the store.
  const viewModels = useStorePath<ViewModels>(store, "viewModels") ?? NO_VIEW_MODELS;
  const resolved = builderPage(layoutEngines, viewModels, page, naming);
  const hasCells = resolved.problem === undefined && resolved.cells.length > 0;

  /**
   * The engine is a free choice UNTIL the first widget is placed: picking one
   * replaces the (empty) template with that engine's empty template. With
   * cells in place it is locked — there is no conversion between engines by
   * decision — and so it is without a template to choose for.
   */
  const engineLock: EngineLock | undefined =
    resolved.problem !== undefined ? "no-template" : hasCells ? "widgets-placed" : undefined;

  const setEngine = useCallback(
    (name: string) => {
      if (!canEdit) return;
      const engine = layoutEngines.get(name);
      const prev = store.get<ViewModels>("viewModels");
      if (!engine || !prev) return;
      const current = builderPage(layoutEngines, prev, page, naming);
      if (current.problem !== undefined || current.cells.length > 0) return;
      cancelEditing();
      commit({ viewModels: updatePageTemplate(prev, page, naming.pageView, () => engine.empty()) });
    },
    [canEdit, layoutEngines, store, page, naming, commit, cancelEditing],
  );

  /**
   * Place a widget: a fresh BASE widget template holding the bindings (input
   * paths + event reactions) and the settings the user typed (the widget's
   * defaults fill the rest), plus a cell appended by the page's engine
   * plugin.
   */
  const addWidget = useCallback(
    (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => {
      if (!canEdit) return;
      const prev = store.get<ViewModels>("viewModels");
      if (!prev) return;
      const target = builderPage(layoutEngines, prev, page, naming);
      // No template to append to (removed by a host's editor): write nothing
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
      commit({
        viewModels: {
          ...withCell,
          widgets: {
            ...withCell.widgets,
            [naming.modelGroup]: { ...placed, [id]: { [naming.widgetTemplate]: template } },
          },
        },
      });
      onAdded();
    },
    [canEdit, store, commit, layoutEngines, page, naming, onAdded],
  );

  return { hasCells, engineLock, setEngine, addWidget };
}
