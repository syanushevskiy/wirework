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
import {
  getPath,
  setPath,
  type AnyLayoutEngine,
  type AnyWidgetDefinition,
  type Store,
  type ViewModels,
  type WidgetBindings,
} from "@wirework/schema";
import {
  layoutPathAt,
  layoutsOf,
  resolveTemplate,
  type LayoutEngineRegistry,
  type TemplateResolution,
  type WidgetRegistry,
} from "@wirework/engine";
import { useStorePath } from "@wirework/react";
import type { EngineLock } from "./locks";
import type { Commit } from "./use-commit";
import { templateOf, type WidgetSettings } from "./form-drafts";

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

/**
 * Where the layout a builder adds to lives in the view models: the page's
 * own template, or — `at` a chain of containers (doc/containers-design.md)
 * — the layout inside a container's widget template; undefined when the
 * chain leads nowhere.
 */
const builderLayoutPath = (
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  page: string,
  naming: BuilderNaming,
  at: string | undefined,
): string[] | undefined =>
  at === undefined ? ["pages", page, naming.pageView] : layoutPathAt(layoutEngines, viewModels, page, at);

/** The builder's SHARED layout, as the store holds it — not an edit session's view of it. */
export function builderPage(
  layoutEngines: LayoutEngineRegistry,
  viewModels: ViewModels,
  page: string,
  naming: BuilderNaming,
  at?: string,
): TemplateResolution {
  const path = builderLayoutPath(layoutEngines, viewModels, page, naming, at);
  return resolveTemplate(layoutEngines, path === undefined ? undefined : getPath(viewModels, path));
}

/**
 * A placed CONTAINER starts with its layouts EMPTY, on the engine of the
 * layout it is placed in: a card's `content`, the `content` of every item
 * of a tabs widget's `tabs` (the form's entries, else the setting's
 * defaults) — and an item an EDIT added gets one the same way. The form
 * never asks for a layout; this is where it comes from.
 */
export function withEmptyLayouts(
  definition: AnyWidgetDefinition | undefined,
  template: Record<string, unknown>,
  engine: AnyLayoutEngine,
): Record<string, unknown> {
  const contains = definition?.contains ?? [];
  if (!definition || contains.length === 0) return template;
  let parsed: Record<string, unknown>;
  try {
    parsed = definition.viewModel.parse(template) as Record<string, unknown>;
  } catch {
    return template;
  }
  const started = (held: unknown): unknown =>
    Array.isArray(held)
      ? held.map((item: unknown) =>
          item !== null && typeof item === "object" && !("content" in item)
            ? { ...item, content: engine.empty() }
            : item,
        )
      : (held ?? engine.empty());
  return { ...template, ...Object.fromEntries(contains.map((name) => [name, started(parsed[name])])) };
}

/** What `addWidget` placed — for the host to react to (the page loads again; a container opens). */
export interface PlacedWidget {
  /** The new cell's id — the name of its template under the builder's group too. */
  id: string;
  widget: string;
  /**
   * The layouts the widget holds, by their paths in its template (`content`,
   * `tabs.0.content`), started empty; none for a leaf. A host that shows
   * the first one at once lets the user fill the container right away.
   */
  layouts: string[];
}

export interface BuilderInput {
  store: Store;
  /** THE write path (use-commit): placing a widget commits through it, never to the store itself. */
  commit: Commit;
  /** Whether this user may change pages at all — placing a widget changes the shared one. Required: a builder never assumes it may write. */
  canEdit: boolean;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** The page widgets are added to. */
  page: string;
  /** The layout inside the containers chained here, when widgets are added into one; the page itself when absent. */
  at?: string | undefined;
  naming: BuilderNaming;
  /** Choosing an engine replaces the page template: an open session would be stale. */
  cancelEditing: () => void;
  /** The page changed, so it must load again by the new configuration; and what was placed. */
  onAdded: (placed: PlacedWidget) => void;
}

export function useBuilder({
  store,
  commit,
  canEdit,
  registry,
  layoutEngines,
  page,
  at,
  naming,
  cancelEditing,
  onAdded,
}: BuilderInput) {
  // Rendered facts follow the store.
  const viewModels = useStorePath<ViewModels>(store, "viewModels") ?? NO_VIEW_MODELS;
  const resolved = builderPage(layoutEngines, viewModels, page, naming, at);
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
      const path = builderLayoutPath(layoutEngines, prev, page, naming, at);
      const current = builderPage(layoutEngines, prev, page, naming, at);
      if (path === undefined || current.problem !== undefined || current.cells.length > 0) return;
      cancelEditing();
      commit({ viewModels: setPath(prev, path, engine.empty()) });
    },
    [canEdit, layoutEngines, store, page, at, naming, commit, cancelEditing],
  );

  /**
   * Place a widget: a fresh BASE widget template holding the bindings (input
   * paths + event reactions) and the settings the user typed (the widget's
   * defaults fill the rest), plus a cell appended by the page's engine
   * plugin — a TALL one for a container, whose layout needs the room.
   */
  const addWidget = useCallback(
    (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => {
      if (!canEdit) return;
      const prev = store.get<ViewModels>("viewModels");
      if (!prev) return;
      const path = builderLayoutPath(layoutEngines, prev, page, naming, at);
      const target = builderPage(layoutEngines, prev, page, naming, at);
      // No template to append to (removed by a host's editor): write nothing
      // rather than a dangling widget template nobody references.
      if (path === undefined || target.problem !== undefined) return;
      const group = (prev.widgets[naming.modelGroup] as Record<string, unknown> | undefined) ?? {};
      const id = naming.cellId([...Object.keys(group), ...target.cells.map((cell) => cell.id)]);
      const definition = registry.get(widgetType);
      const template = withEmptyLayouts(definition, templateOf(bindings, settings), target.engine);
      const layouts = definition ? layoutsOf(definition, template).map((held) => held.path) : [];
      const withCell = setPath(
        prev,
        path,
        target.engine.appendCell(
          target.template,
          { id, widget: widgetType, model: `${modelNamespaceOf(naming)}.${id}`, template: naming.widgetTemplate },
          layouts.length > 0 ? "tall" : "default",
        ),
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
      onAdded({ id, widget: widgetType, layouts });
    },
    [canEdit, store, commit, registry, layoutEngines, page, at, naming, onAdded],
  );

  return { hasCells, engineLock, setEngine, addWidget };
}
