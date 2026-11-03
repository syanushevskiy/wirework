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
import type { ComponentType, ErrorInfo } from "react";
import type { EventBus, Store, UserViewModels, ViewModels } from "@wirework/schema";
import type {
  ActionRegistry,
  AppearanceRegistry,
  LayoutEngineRegistry,
  PredicateRegistry,
  ResolvedPage,
  WidgetRegistry,
} from "@wirework/engine";
import type { LayoutRendererProps } from "./layout";
import { PageContext } from "./PageContext";
import { PageReloadContext } from "./useAnnounce";
import { usePageLoad } from "./usePageLoad";
import { usePagePlan } from "./usePagePlan";
import { usePageRenderers } from "./usePageRenderers";
import { useReactions } from "./useReactions";
import { LayoutErrorBoundary } from "./WidgetErrorBoundary";
import type { WrapCell } from "./CellChrome";

/** A crash PageView isolated — in one widget's cell, or in the layout renderer — for the host to report. */
export type PageError = { error: Error; info: ErrorInfo } & (
  { in: "widget"; cell: string; widget: string } | { in: "layout"; engine: string }
);

export interface PageViewProps {
  page: string;
  viewModels: ViewModels;
  userViewModels?: UserViewModels | undefined;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** Host actions that `call` reactions may invoke. */
  actions?: ActionRegistry | undefined;
  /** The predicates a cell's `when` may name (doc/conditions-design.md); the standard ones alone when absent. */
  predicates?: PredicateRegistry | undefined;
  /** The appearances a cell's `appear` and `disappear` may name; the standard ones alone when absent. */
  appearances?: AppearanceRegistry | undefined;
  /**
   * An already-resolved plan (from `usePagePlan`) for these same inputs.
   * When given, PageView renders it and resolves nothing itself.
   */
  plan?: ResolvedPage | undefined;
  store: Store;
  bus: EventBus;
  /** Edit mode: the engine's interactive editing + per-cell chrome. */
  editable?: boolean | undefined;
  /** Engine-specific change payload after each drop/resize (see the engine's `applyChange`). */
  onLayoutChange?: ((change: unknown) => void) | undefined;
  /** Edit-mode chrome actions; a button renders only when its callback is given. */
  onEditCell?: ((cellId: string) => void) | undefined;
  onRemoveCell?: ((cellId: string) => void) | undefined;
  /** A container's "Edit content": open the layout it holds at `layoutPath` (doc/containers-design.md). */
  onEditLayout?: ((cellId: string, layoutPath: string) => void) | undefined;
  /** "Wrap in a card": put the cell into a new container — the host names the button and does the wrapping. */
  wrapCell?: WrapCell | undefined;
  /**
   * Change it to LOAD THE PAGE AGAIN — for a host that changed the page
   * while it is open (an editor after Add or Save): every widget that asks
   * for its data when it appears (a table's `load`) asks again, then the
   * page's own `load` fires again — IN PLACE, by the NEW configuration.
   * Nothing remounts and the store is untouched.
   */
  reloadKey?: string | number | undefined;
  /** A crash the page isolated (a widget, the layout renderer): report it — the placeholder is shown either way. */
  onError?: ((report: PageError) => void) | undefined;
}

export function PageView({
  page,
  viewModels,
  userViewModels,
  registry,
  layoutEngines,
  actions,
  predicates,
  appearances,
  plan: providedPlan,
  store,
  bus,
  editable = false,
  onLayoutChange,
  onEditCell,
  onRemoveCell,
  onEditLayout,
  wrapCell,
  reloadKey,
  onError,
}: PageViewProps) {
  // Render-only component: resolution lives in the hooks (guidelines).
  const plan = usePagePlan(
    { viewModels, userViewModels, page, registry, layoutEngines, actions, predicates, appearances },
    providedPlan,
  );
  useReactions(bus, store, plan, actions);
  // The page's own `load` event: what `viewModels.on.<page>.load` declares runs once per opening.
  usePageLoad(bus, store, page, reloadKey);
  const { cells, cellById, renderCell, renderChrome, scope } = usePageRenderers({
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
  const Renderer = layoutEngines.get(plan.engine)?.renderer as ComponentType<LayoutRendererProps> | undefined;
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
      <LayoutErrorBoundary
        engine={plan.engine}
        resetKey={plan.template}
        onError={(error, info) => onError?.({ in: "layout", engine: plan.engine, error, info })}
      >
        {/* The reload signal: every widget under the page announces itself again when it changes (useAfterMount). */}
        <PageReloadContext value={reloadKey}>
          {/* What the layouts inside this page's containers render with (NestedLayout). */}
          <PageContext value={scope}>
            <Renderer
              template={plan.template}
              cells={cells}
              cellById={cellById}
              editable={editable}
              onChange={onLayoutChange}
              renderCell={renderCell}
              renderChrome={renderChrome}
            />
          </PageContext>
        </PageReloadContext>
      </LayoutErrorBoundary>
    </div>
  );
}
