/**
 * A page asks for the code of what it SHOWS as soon as its plan is known
 * (doc/ADR/0018-lazy-widgets.md): the layout engine's renderer and every lazy
 * widget among its cells, all at once — not the widgets after the renderer
 * arrived, one round trip later. A cell with a CONDITION is left alone: its
 * widget asks for its own code when it is first shown, so a widget a page
 * hides is never downloaded for nothing.
 */
import { useEffect } from "react";
import {
  resolvePage,
  type LayoutEngineRegistry,
  type ResolvedCell,
  type ResolvedPage,
  type ResolveInput,
} from "@wirework/engine";
import { loadingOf } from "./lazy";

/** The one cast: the widget's own schema parsed the view model. */
const hasCondition = (viewModel: unknown): boolean => (viewModel as { when?: unknown } | null)?.when !== undefined;

/** Ask for the code of every lazy widget among the cells that show whatever the store holds. */
export function preloadCells(cells: readonly ResolvedCell[]): void {
  cells
    .filter((cell) => cell.problem === undefined && !hasCondition(cell.viewModel))
    .forEach((cell) => loadingOf(cell.definition?.component)?.preload());
}

/** Ask for everything a resolved page shows: its engine's renderer and its cells' widgets. */
export function preloadPlan(plan: ResolvedPage, layoutEngines: LayoutEngineRegistry): void {
  if (plan.problem !== undefined) return;
  loadingOf(layoutEngines.get(plan.engine)?.renderer)?.preload();
  preloadCells(plan.cells);
}

/**
 * For a host's router: start a page's code before it opens — on the menu
 * item's hover, say. The same inputs `PageView` takes.
 */
export function preloadPage(input: ResolveInput): void {
  preloadPlan(resolvePage(input), input.layoutEngines);
}

export function usePreload(plan: ResolvedPage, layoutEngines: LayoutEngineRegistry): void {
  useEffect(() => preloadPlan(plan, layoutEngines), [plan, layoutEngines]);
}
