/**
 * usePagePlan — ALL of PageView's resolution logic lives here (guidelines:
 * components are render-only). Resolves the page once per input change —
 * or not at all when the host already holds the plan.
 */
import { useMemo } from "react";
import { resolvePage, type ResolvedPage, type ResolveInput } from "@wirework/engine";

export function usePagePlan(input: ResolveInput, provided?: ResolvedPage): ResolvedPage {
  const { viewModels, userViewModels, page, registry, layoutEngines, actions } = input;
  return useMemo(
    () => provided ?? resolvePage({ viewModels, userViewModels, page, registry, layoutEngines, actions }),
    [provided, viewModels, userViewModels, page, registry, layoutEngines, actions],
  );
}
