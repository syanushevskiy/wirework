/**
 * ALL PageView logic beyond resolution (guidelines: render-only
 * components): the stable per-cell render callbacks handed to the engine
 * renderer, and the cell lookup.
 */
import { createElement, useCallback, useEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from "react";
import type { EventBus, Store, UserViewModels, ViewModels } from "@wirework/schema";
import type {
  ActionRegistry,
  AppearanceRegistry,
  LayoutEngineRegistry,
  PredicateRegistry,
  ResolvedCell,
  ResolvedPage,
  WidgetRegistry,
} from "@wirework/engine";
import { CellChrome, type WrapCell } from "./CellChrome";
import { CellView } from "./CellView";
import type { PageScope } from "./PageContext";
import type { PageError } from "./PageView";

export interface PageRenderersInput {
  plan: ResolvedPage;
  viewModels: ViewModels;
  userViewModels: UserViewModels | undefined;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  actions: ActionRegistry | undefined;
  store: Store;
  bus: EventBus;
  predicates?: PredicateRegistry | undefined;
  appearances?: AppearanceRegistry | undefined;
  editable: boolean;
  onEditCell?: ((cellId: string) => void) | undefined;
  onRemoveCell?: ((cellId: string) => void) | undefined;
  /** Edit-mode chrome of a container: open the layout it holds at `layoutPath` for editing. */
  onEditLayout?: ((cellId: string, layoutPath: string) => void) | undefined;
  wrapCell?: WrapCell | undefined;
  onError?: ((report: PageError) => void) | undefined;
}

export function usePageRenderers({
  plan,
  viewModels,
  userViewModels,
  registry,
  layoutEngines,
  actions,
  store,
  bus,
  predicates,
  appearances,
  editable,
  onEditCell,
  onRemoveCell,
  onEditLayout,
  wrapCell,
  onError,
}: PageRenderersInput) {
  // The host's reporter, read at the moment of a report: a callback written
  // inline is a new function every render, and the page scope below must
  // not change with it — every layout inside a container would resolve and
  // rebind its reactions again.
  const reporter = useRef(onError);
  useEffect(() => {
    reporter.current = onError;
  });
  const cells = useMemo<readonly ResolvedCell[]>(() => (plan.problem === undefined ? plan.cells : []), [plan]);
  const byId = useMemo(() => new Map(cells.map((cell) => [cell.key, cell])), [cells]);
  const cellById = useCallback((id: string) => byId.get(id), [byId]);

  // Events are stamped with the PLAN's page — the page reactions are bound
  // to — never a separate prop that could name another page.
  const { page } = plan;
  const renderCell = useCallback(
    (cell: ResolvedCell): ReactNode =>
      createElement(CellView, {
        cell,
        page,
        store,
        bus,
        predicates,
        editable,
        onError: (error: Error, info: ErrorInfo) =>
          onError?.({ in: "widget", cell: cell.key, widget: cell.widget, error, info }),
      }),
    [page, store, bus, predicates, editable, onError],
  );

  const renderChrome = useMemo(
    () =>
      editable && (onEditCell || onRemoveCell || onEditLayout || wrapCell)
        ? (cell: ResolvedCell): ReactNode =>
            createElement(CellChrome, { cell, onEdit: onEditCell, onRemove: onRemoveCell, onEditLayout, wrapCell })
        : undefined,
    [editable, onEditCell, onRemoveCell, onEditLayout, wrapCell],
  );

  /** What the layouts inside this page's containers render with (PageContext). */
  const scope = useMemo<PageScope>(
    () => ({
      page,
      viewModels,
      userViewModels,
      registry,
      layoutEngines,
      actions,
      predicates,
      appearances,
      store,
      bus,
      onError: (report: PageError) => reporter.current?.(report),
      depth: 0,
    }),
    [page, viewModels, userViewModels, registry, layoutEngines, actions, predicates, appearances, store, bus],
  );

  return { cells, cellById, renderCell, renderChrome, scope };
}
