/**
 * usePagePlan — ALL of PageView's resolution logic lives here (guidelines:
 * components are render-only). Resolves the page once per input change —
 * or not at all when the host already holds the plan.
 */
import { useMemo } from "react";
import { resolvePage, type ResolvedPage, type ResolveInput, type ResolveLayers } from "@wirework/engine";

export function usePagePlan(input: ResolveInput, provided?: ResolvedPage): ResolvedPage {
  const {
    viewModels,
    userViewModels,
    roles,
    overlays,
    page,
    registry,
    layoutEngines,
    actions,
    predicates,
    appearances,
  } = input;
  return useMemo(() => {
    if (provided) return provided;
    // The layers one way or the other (ResolveLayers): ready-made for a layout inside a container, else the user's.
    const layers: ResolveLayers = overlays === undefined ? { roles, userViewModels } : { overlays };
    return resolvePage({ viewModels, page, registry, layoutEngines, actions, predicates, appearances, ...layers });
  }, [
    provided,
    viewModels,
    userViewModels,
    roles,
    overlays,
    page,
    registry,
    layoutEngines,
    actions,
    predicates,
    appearances,
  ]);
}
