/**
 * usePagePlan — ALL of PageView's resolution logic lives here (guidelines:
 * components are render-only). Resolves the page once per input change.
 */
import { useMemo } from "react";
import { resolvePage, type ResolvedPage, type ResolveInput } from "@wirework/engine";

export function usePagePlan(input: ResolveInput): ResolvedPage {
  const { viewModels, userViewModels, page, registry, layoutEngines, actions } = input;
  return useMemo(
    () => resolvePage({ viewModels, userViewModels, page, registry, layoutEngines, actions }),
    [viewModels, userViewModels, page, registry, layoutEngines, actions],
  );
}
