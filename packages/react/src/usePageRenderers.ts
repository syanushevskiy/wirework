/**
 * ALL PageView logic beyond resolution (guidelines: render-only
 * components): the stable per-cell render callbacks handed to the engine
 * renderer, and the cell lookup.
 */
import { createElement, useCallback, useMemo, type ReactNode } from "react";
import type { EventBus, Store } from "@wirework/schema";
import type { ResolvedCell, ResolvedPage } from "@wirework/engine";
import { CellChrome } from "./CellChrome";
import { CellView } from "./CellView";

export interface PageRenderersInput {
  plan: ResolvedPage;
  store: Store;
  bus: EventBus;
  editable: boolean;
  onEditCell?: (cellId: string) => void;
  onRemoveCell?: (cellId: string) => void;
}

export function usePageRenderers({ plan, store, bus, editable, onEditCell, onRemoveCell }: PageRenderersInput) {
  const cells = useMemo<ResolvedCell[]>(() => (plan.problem === undefined ? plan.cells : []), [plan]);
  const byId = useMemo(() => new Map(cells.map((cell) => [cell.key, cell])), [cells]);
  const cellById = useCallback((id: string) => byId.get(id), [byId]);

  // Events are stamped with the PLAN's page — the page reactions are bound
  // to — never a separate prop that could name another page.
  const { page } = plan;
  const renderCell = useCallback(
    (cell: ResolvedCell): ReactNode => createElement(CellView, { cell, page, store, bus }),
    [page, store, bus],
  );

  const renderChrome = useMemo(
    () =>
      editable && (onEditCell || onRemoveCell)
        ? (cell: ResolvedCell): ReactNode =>
            createElement(CellChrome, { cell, onEdit: onEditCell, onRemove: onRemoveCell })
        : undefined,
    [editable, onEditCell, onRemoveCell],
  );

  return { cells, cellById, renderCell, renderChrome };
}
