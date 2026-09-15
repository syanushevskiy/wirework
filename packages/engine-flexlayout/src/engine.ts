/**
 * The FlexLayout engine plugin — a TREE layout, the convincing proof of the
 * plugin boundary: no x/y/w/h, the change payload is the library's whole
 * model document, and cells are tabs. Still just the contract's operations.
 */
import type { CellBase } from "@wirework/schema";
import { defineLayoutEngine } from "@wirework/react";
import { FlexLayoutView } from "./FlexLayoutView";
import { flexLayoutPageSchema, type FlexLayoutModelJson, type FlexLayoutPage } from "./schema";
import { addTab, emptyModel, reconcile, removeTab, tabIds } from "./tree";

export const flexLayoutEngine = defineLayoutEngine<FlexLayoutPage, FlexLayoutModelJson>({
  name: "flexlayout",
  template: flexLayoutPageSchema,
  empty: () => ({ engine: "flexlayout", cells: [], model: emptyModel() }),
  cells: (template) => template.cells,
  appendCell: (template, cell: CellBase) => ({
    ...template,
    cells: [...template.cells, cell],
    model: addTab(template.model, cell.id),
  }),
  removeCell: (template, cellId) => ({
    ...template,
    cells: template.cells.filter((cell) => cell.id !== cellId),
    model: removeTab(template.model, cellId),
  }),
  /** The library's document, reconciled with the cell list (it may lag one edit behind). */
  applyChange: (template, model) => ({
    ...template,
    model: reconcile(model, template.cells.map((cell) => cell.id)),
  }),
  /** Every tab must be a cell and every cell a tab. */
  validate: (template) => {
    const tabs = new Set(tabIds(template.model));
    const cells = new Set(template.cells.map((cell) => cell.id));
    return [
      ...[...tabs].filter((id) => !cells.has(id)).map((id) => `tab "${id}" has no cell`),
      ...[...cells].filter((id) => !tabs.has(id)).map((id) => `cell "${id}" has no tab in the model`),
    ];
  },
  renderer: FlexLayoutView,
});
