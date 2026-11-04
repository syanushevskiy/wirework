/**
 * The flex-rows layout engine plugin: template shape + every layout
 * operation the core delegates. Cells append as a new row each; removing
 * the last cell of a row removes the row. Edit mode reports a cell's or a
 * row's classes and a cell's move (operations.ts); a size hint is ignored,
 * a flex cell sizes to its content.
 */
import type { CellBase } from "@wirework/schema";
import { defineLayoutEngine } from "@wirework/react";
import { FlexRowsView } from "./FlexRowsView";
import { applyFlexRowsChange, flexRowsProblems, removeFlexCell } from "./operations";
import { flexRowsChangeSchema, flexRowsPageSchema, type FlexRowsChange, type FlexRowsPage } from "./schema";

export const flexRowsEngine = defineLayoutEngine<FlexRowsPage, FlexRowsChange>({
  name: "flex-rows",
  template: flexRowsPageSchema,
  change: flexRowsChangeSchema,
  empty: () => ({ engine: "flex-rows", rows: [] }),
  cells: (template) => template.rows.flatMap((row) => row.cells),
  appendCell: (template, cell: CellBase) => ({ ...template, rows: [...template.rows, { cells: [cell] }] }),
  removeCell: removeFlexCell,
  applyChange: applyFlexRowsChange,
  validate: flexRowsProblems,
  renderer: FlexRowsView,
});
