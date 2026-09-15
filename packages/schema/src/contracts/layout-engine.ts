/**
 * Layout engine contract — framework-agnostic (doc/layout-engines-design.md).
 *
 * A page template declares `engine: "<name>"`; the registered plugin of
 * that name owns the template's SHAPE and every layout operation on it.
 * The core never looks inside a template: it asks the engine for the cells
 * (identity + widget binding) and hands the validated template to the
 * engine's renderer. Adding gridstack, FlexLayout or anything else is a
 * new package that registers a plugin — no core change.
 *
 * `C` is the engine's own CHANGE payload (what its renderer reports after a
 * drag/resize/drop): placements by id for a grid, a whole model document
 * for a docking layout. `applyChange` must be pure — hosts replay changes.
 */
import type { CellBase, PageViewModel } from "../models/view-models";
import type { Validator } from "./widget";

export interface LayoutEngine<
  T extends PageViewModel = PageViewModel,
  C = unknown,
  TRenderer = unknown,
> {
  /** Kebab-case name referenced by page templates as `engine`. */
  name: string;
  /** Validator for the whole page template (engine-owned shape). */
  template: Validator<T>;
  /** A template with no cells — what a builder starts from after picking this engine. */
  empty(): T;
  /** Every cell of the template, in a stable order. */
  cells(template: T): CellBase[];
  /** A new cell placed somewhere sensible (builders append). */
  appendCell(template: T, cell: CellBase): T;
  removeCell(template: T, cellId: string): T;
  /** Apply a renderer-reported change. Pure. */
  applyChange(template: T, change: C): T;
  /** Engine-specific validation problems (e.g. a cell outside the grid). */
  validate?(template: T): string[];
  /**
   * Framework-specific renderer, opaque to the core. Typed by the
   * framework adapter (ReactLayoutEngine in @wirework/react).
   */
  renderer: TRenderer;
}

/** Erasure point for the registry. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLayoutEngine = LayoutEngine<any, any, any>;
