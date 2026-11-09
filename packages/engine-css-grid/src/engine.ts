/**
 * The css-grid layout engine plugin (doc/css-grid-design.md): template
 * shape + every layout operation the core delegates. Cells append as a row
 * each; removing a cell empties its slots; edit mode reports the whole
 * picture after a drop or a pick, or a track size (operations.ts).
 */
import { defineLayoutEngine } from "@wirework/react";
import { CssGridView } from "./CssGridView";
import { appendCssGridCell, applyCssGridChange, cssGridProblems, emptyCssGrid, removeCssGridCell } from "./operations";
import { cssGridChangeSchema, cssGridPageSchema, type CssGridChange, type CssGridPage } from "./schema";

export const cssGridEngine = defineLayoutEngine<CssGridPage, CssGridChange>({
  name: "css-grid",
  template: cssGridPageSchema,
  change: cssGridChangeSchema,
  empty: emptyCssGrid,
  cells: (template) => template.cells,
  appendCell: appendCssGridCell,
  removeCell: removeCssGridCell,
  applyChange: applyCssGridChange,
  validate: cssGridProblems,
  renderer: CssGridView,
});
