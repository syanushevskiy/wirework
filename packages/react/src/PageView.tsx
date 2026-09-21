/**
 * PageView — renders a page plan with the layout engine it declares.
 *
 * A PURE renderer: all resolution (template selection, user overlay merge,
 * registry lookups, validation) happens in the framework-agnostic
 * `resolvePage`, memoized once per input change in `usePagePlan` — never per
 * cell per render, and not at all when the host passes the plan it already
 * holds. Every problem renders as a visible, test-addressable placeholder
 * instead of failing silently: page problems, an ignored user overlay, the
 * layout engine's warnings, a crashing layout renderer.
 *
 * The engine plugin named by the template renders the layout; PageView
 * gives it the validated template, the resolved cells, a `renderCell`
 * callback (widget in its error boundary with a cell-scoped `emit` and a
 * read-only store) and, in edit mode, a `renderChrome` callback with the
 * Edit/Remove actions the engine places wherever its library allows
 * (doc/layout-engines-design.md). The plan's declared reactions — the
 * cells' and the page's own — stay subscribed while mounted, and the page's
 * `load` event fires once per opening (doc/widget-events-design.md).
 *
 * NOTE: registries are treated as immutable after mount — register all
 * widgets and engines BEFORE rendering.
 */
import type { ComponentType } from "react";
import type { EventBus, Store, UserViewModels, ViewModels } from "@wirework/schema";
import type { ActionRegistry, LayoutEngineRegistry, ResolvedPage, WidgetRegistry } from "@wirework/engine";
import type { LayoutRendererProps } from "./layout";
import { usePageLoad } from "./usePageLoad";
import { usePagePlan } from "./usePagePlan";
import { usePageRenderers } from "./usePageRenderers";
import { useReactions } from "./useReactions";
import { LayoutErrorBoundary } from "./WidgetErrorBoundary";

export interface PageViewProps {
  page: string;
  viewModels: ViewModels;
  userViewModels?: UserViewModels;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** Host actions that `call` reactions may invoke. */
  actions?: ActionRegistry;
  /**
   * An already-resolved plan (from `usePagePlan`) for these same inputs.
   * When given, PageView renders it and resolves nothing itself.
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
  /**
   * Change it to LOAD THE PAGE AGAIN — for a host that changed the page
   * while it is open (an editor after Add or Save): the page's `load` event
   * fires again and the cells mount afresh, so widgets that ask for their
   * data when they appear (a table's `load`) ask again, now by the NEW
   * configuration. The store is untouched.
   */
  reloadKey?: string | number;
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
  reloadKey,
}: PageViewProps) {
  // Render-only component: resolution lives in the hooks (guidelines).
  const plan = usePagePlan({ viewModels, userViewModels, page, registry, layoutEngines, actions }, providedPlan);
  useReactions(bus, store, plan, actions);
  // The page's own `load` event: what `viewModels.on.<page>.load` declares runs once per opening.
  usePageLoad(bus, store, page, reloadKey);
  const { cells, cellById, renderCell, renderChrome } = usePageRenderers({
    plan,
    store,
    bus,
    editable,
    onEditCell,
    onRemoveCell,
  });

  const overlayNote = plan.overlayProblem ? (
    <div role="status" className="ww-page-note" data-testid="overlay-ignored">
      Your personal view could not be applied, so the shared page is shown: {plan.overlayProblem}
    </div>
  ) : null;

  if (plan.problem !== undefined) {
    return (
      <>
        {overlayNote}
        <div role="alert" className="ww-page-problem" data-testid="page-problem">
          {plan.problem}
        </div>
      </>
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
      data-page={plan.page}
      data-view={plan.view}
      data-engine={plan.engine}
      data-layout-mode={editable ? "edit" : "view"}
    >
      {overlayNote}
      {plan.warnings.length > 0 ? (
        <ul role="status" className="ww-page-note" data-testid="page-warnings">
          {plan.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {/* resetKey: a new template (fixed in the inspector, say) retries the renderer. */}
      <LayoutErrorBoundary engine={plan.engine} resetKey={plan.template}>
        <Renderer
          // A new key mounts every cell afresh: "the page loads again" (see `reloadKey`).
          key={reloadKey}
          template={plan.template}
          cells={cells}
          cellById={cellById}
          editable={editable}
          onChange={onLayoutChange}
          renderCell={renderCell}
          renderChrome={renderChrome}
        />
      </LayoutErrorBoundary>
    </div>
  );
}
