/**
 * The flex-rows layout engine plugin: template shape + every layout
 * operation the core delegates. Cells append as a new full-width row;
 * removing the last cell of a row removes the row. There is no
 * interactive change (nothing to drag), so `applyChange` is the identity.
 */
import type { CellBase } from "@wirework/schema";
import { defineLayoutEngine } from "@wirework/react";
import { FlexRowsView } from "./FlexRowsView";
import { flexRowsPageSchema, type FlexRowsPage } from "./schema";

export const flexRowsEngine = defineLayoutEngine<FlexRowsPage, undefined>({
  name: "flex-rows",
  template: flexRowsPageSchema,
  empty: () => ({ engine: "flex-rows", rows: [] }),
  cells: (template) => template.rows.flat(),
  appendCell: (template, cell: CellBase) => ({
    ...template,
    rows: [...template.rows, [{ ...cell, width: "full" }]],
  }),
  removeCell: (template, cellId) => ({
    ...template,
    rows: template.rows
      .map((row) => row.filter((cell) => cell.id !== cellId))
      .filter((row) => row.length > 0),
  }),
  applyChange: (template) => template,
  renderer: FlexRowsView,
});
