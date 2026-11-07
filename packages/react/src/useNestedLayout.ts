/**
 * ALL NestedLayout logic (guidelines: render-only components): the layout a
 * container holds, resolved with the page's registries from `PageContext`,
 * its cells' reactions bound on the page's bus, the scope the layouts
 * inside it get — or why it cannot render: no page around it (a preview),
 * too deep, an engine that refuses it.
 */
import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import type { PageViewModel } from "@wirework/schema";
import {
  MAX_LAYOUT_DEPTH,
  bindCellReactions,
  innerOverlays,
  layoutChain,
  resolveCells,
  resolveTemplate,
  type ResolvedCell,
} from "@wirework/engine";
import { CellView } from "./CellView";
import type { LayoutRendererProps } from "./layout";
import { useCellKey, usePageScope, type PageScope } from "./PageContext";

export type NestedLayoutState =
  /** No page around: a palette preview or a story shows the widget alone. */
  | { kind: "preview"; cells: number }
  | { kind: "problem"; message: string }
  | {
      kind: "layout";
      scope: PageScope;
      Renderer: ComponentType<LayoutRendererProps>;
      template: PageViewModel;
      cells: readonly ResolvedCell[];
      cellById: (id: string) => ResolvedCell | undefined;
      renderCell: (cell: ResolvedCell) => ReactNode;
    };

const countCells = (template: unknown): number => {
  const cells = (template as { cells?: unknown } | null)?.cells;
  return Array.isArray(cells) ? cells.length : 0;
};

export function useNestedLayout(template: unknown, layoutPath: string): NestedLayoutState {
  const outer = usePageScope();
  const container = useCellKey() ?? "";

  const resolution = useMemo(() => {
    if (outer === undefined) return { kind: "preview" as const, cells: countCells(template) };
    if (outer.depth + 1 >= MAX_LAYOUT_DEPTH) {
      return { kind: "problem" as const, message: `layouts nested too deep (at most ${MAX_LAYOUT_DEPTH})` };
    }
    const resolved = resolveTemplate(outer.layoutEngines, template);
    if (resolved.problem !== undefined) return { kind: "problem" as const, message: resolved.problem };
    const Renderer = resolved.engine.renderer as ComponentType<LayoutRendererProps> | undefined;
    if (!Renderer)
      return { kind: "problem" as const, message: `layout engine "${resolved.engine.name}" has no renderer` };
    // The layout's own scope: the page's name with this container's id, every overlay layer narrowed to its cells.
    const scope: PageScope = {
      ...outer,
      page: `${outer.page}/${layoutChain(container, layoutPath)}`,
      overlays: innerOverlays(outer.overlays, outer.page, container, layoutPath),
      depth: outer.depth + 1,
    };
    const { viewModels, overlays, registry, layoutEngines, actions, predicates, appearances } = scope;
    const cells = resolveCells(resolved.cells, {
      viewModels,
      overlays,
      page: outer.page,
      registry,
      layoutEngines,
      actions,
      predicates,
      appearances,
    });
    return { kind: "layout" as const, scope, Renderer, template: resolved.template, cells };
  }, [outer, container, layoutPath, template]);

  // The cells' reactions, bound while the layout is mounted — as a page binds its own.
  useEffect(() => {
    if (resolution.kind !== "layout") return undefined;
    const { scope, cells } = resolution;
    const unsubscribes = cells.map((cell) =>
      bindCellReactions(
        scope.bus,
        scope.store,
        { page: scope.page, cell: cell.key, viewModel: cell.viewModel },
        scope.actions,
      ),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [resolution]);

  const byId = useMemo(
    () => new Map(resolution.kind === "layout" ? resolution.cells.map((cell) => [cell.key, cell]) : []),
    [resolution],
  );
  const cellById = useCallback((id: string) => byId.get(id), [byId]);
  const renderCell = useCallback(
    (cell: ResolvedCell): ReactNode => {
      if (resolution.kind !== "layout") return null;
      const { scope } = resolution;
      return createElement(CellView, {
        cell,
        page: scope.page,
        store: scope.store,
        bus: scope.bus,
        predicates: scope.predicates,
        editable: false,
        // A crash inside is reported as the page reports its own cells', the inner cell named.
        onError: (error: Error, info: ErrorInfo) =>
          scope.onError?.({ in: "widget", cell: cell.key, widget: cell.widget, error, info }),
      });
    },
    [resolution],
  );

  return resolution.kind === "layout" ? { ...resolution, cellById, renderCell } : resolution;
}
