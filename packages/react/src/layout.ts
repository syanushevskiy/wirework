/**
 * React binding of the framework-agnostic layout-engine contract: the
 * `renderer` slot is a React component receiving LayoutRendererProps.
 * Engine packages (@wirework/engine-*) build plugins with `defineLayoutEngine`.
 */
import type { ComponentType, ReactNode } from "react";
import type { LayoutEngine, PageViewModel } from "@wirework/schema";
import type { ResolvedCell } from "@wirework/engine";

export interface LayoutRendererProps<T extends PageViewModel = PageViewModel, C = unknown> {
  /** The page template, validated by this engine. */
  template: T;
  /** Every cell, resolved by id (definition, view model or problem). */
  cells: ResolvedCell[];
  cellById: (id: string) => ResolvedCell | undefined;
  /** Edit mode: enable the engine's interactive editing, show chrome. */
  editable: boolean;
  /** Report an engine-specific change (drop, resize, ...). */
  onChange?: (change: C) => void;
  /** Render one cell's content (problem placeholder or widget); the engine places it. */
  renderCell: (cell: ResolvedCell) => ReactNode;
  /** Edit-mode chrome (edit/remove actions) to place per cell; absent outside edit mode. */
  renderChrome?: (cell: ResolvedCell) => ReactNode;
}

export type ReactLayoutEngine<T extends PageViewModel = PageViewModel, C = unknown> = LayoutEngine<
  T,
  C,
  ComponentType<LayoutRendererProps<T, C>>
>;

/** Identity helper for authoring React layout engines with full type inference. */
export function defineLayoutEngine<T extends PageViewModel, C>(
  def: ReactLayoutEngine<T, C>,
): ReactLayoutEngine<T, C> {
  return def;
}
