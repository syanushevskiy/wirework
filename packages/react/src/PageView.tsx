/**
 * PageView — renders a page plan with the layout engine it declares.
 *
 * A PURE renderer: all resolution (template selection, user overlay merge,
 * registry lookups, validation) happens in the framework-agnostic
 * `resolvePage`, memoized once per input change in `usePagePlan` — never per
 * cell per render. Every problem renders as a visible, test-addressable
 * placeholder instead of failing silently.
 *
 * The engine plugin named by the template renders the layout; PageView
 * gives it the validated template, the resolved cells, a `renderCell`
 * callback (widget in its error boundary with a cell-scoped `emit` and a
 * read-only store) and, in edit mode, a `renderChrome` callback with the
 * Edit/Remove actions the engine places wherever its library allows
 * (doc/layout-engines-design.md). The plan's declared reactions stay
 * subscribed while mounted (doc/widget-events-design.md).
 *
 * NOTE: registries are treated as immutable after mount — register all
 * widgets and engines BEFORE rendering.
 */
import type { ComponentType } from "react";
import type { EventBus, Store, UserViewModels, ViewModels } from "@wirework/schema";
import type { ActionRegistry, LayoutEngineRegistry, ResolvedPage, WidgetRegistry } from "@wirework/engine";
import type { LayoutRendererProps } from "./layout";
import { usePagePlan } from "./usePagePlan";
import { usePageRenderers } from "./usePageRenderers";
import { useReactions } from "./useReactions";

export interface PageViewProps {
  page: string;
  viewModels: ViewModels;
  userViewModels?: UserViewModels;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** Host actions that `call` reactions may invoke. */
  actions?: ActionRegistry;
  /**
   * An already-resolved plan (from `usePagePlan`). Pass it when the host
   * needs the plan too: without it the page is resolved twice per render
   * and the host's plan is a different object from the rendered one.
   */
  plan?: ResolvedPage;
  store: Store;
  bus: EventBus;
  /** Edit mode: the engine's interactive editing + per-cell chrome. */
  editable?: boolean;
  /** Engine-specific change payload after each drop/resize (see the engine's `applyChange`). */
  onLayoutChange?: (change: unknown) => void;
  /** Edit-mode chrome actions; a button renders only when its callback is given. */
  onEditCell?: (cellId: string) => void;
  onRemoveCell?: (cellId: string) => void;
}

export function PageView({
  page,
  viewModels,
  userViewModels,
  registry,
  layoutEngines,
  actions,
  plan: providedPlan,
  store,
  bus,
  editable = false,
  onLayoutChange,
  onEditCell,
  onRemoveCell,
}: PageViewProps) {
  // Render-only component: resolution lives in the hooks (guidelines).
  // A host that already resolved the page (an editor) passes its plan in,
  // so the same inputs are never resolved twice per render.
  const resolved = usePagePlan({ viewModels, userViewModels, page, registry, layoutEngines, actions });
  const plan = providedPlan ?? resolved;
  useReactions(bus, store, plan, actions);
  const { cells, cellById, renderCell, renderChrome } = usePageRenderers({
    plan,
    page,
    store,
    bus,
    editable,
    onEditCell,
    onRemoveCell,
  });

  if (plan.problem !== undefined) {
    return (
      <div role="alert" className="ww-page-problem" data-testid="page-problem">
        {plan.problem}
      </div>
    );
  }

  // Resolution already checked the engine exists; the cast narrows the
  // opaque renderer slot to this adapter's React shape.
  const Renderer = layoutEngines.get(plan.engine)?.renderer as
    | ComponentType<LayoutRendererProps>
    | undefined;
  if (!Renderer) {
    return (
      <div role="alert" className="ww-page-problem" data-testid="page-problem">
        Layout engine &quot;{plan.engine}&quot; has no renderer
      </div>
    );
  }

  return (
    <div
      className="ww-page"
      data-testid="page"
      data-page={page}
      data-view={plan.view}
      data-engine={plan.engine}
      data-layout-mode={editable ? "edit" : "view"}
    >
      <Renderer
        template={plan.template}
        cells={cells}
        cellById={cellById}
        editable={editable}
        onChange={onLayoutChange}
        renderCell={renderCell}
        renderChrome={renderChrome}
      />
    </div>
  );
}
