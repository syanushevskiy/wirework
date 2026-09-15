/**
 * The gridstack engine plugin — the third engine, written against the
 * plugin contract with NO change to schema, engine core or adapter:
 * template shape + the six operations + the renderer.
 */
import type { CellBase } from "@wirework/schema";
import { defineLayoutEngine } from "@wirework/react";
import { GridstackView } from "./GridstackView";
import {
  DEFAULT_GRIDSTACK_CELL_ROWS,
  gridstackPageSchema,
  gridstackSettings,
  type GridstackPage,
  type GridstackPlacements,
} from "./schema";

export const gridstackEngine = defineLayoutEngine<GridstackPage, GridstackPlacements>({
  name: "gridstack",
  template: gridstackPageSchema,
  empty: () => ({ engine: "gridstack", cells: [] }),
  cells: (template) => template.cells,
  appendCell: (template, cell: CellBase) => {
    const { cols } = gridstackSettings(template);
    const y = template.cells.reduce((bottom, c) => Math.max(bottom, c.y + c.h), 0);
    return {
      ...template,
      cells: [...template.cells, { ...cell, x: 0, y, w: cols, h: DEFAULT_GRIDSTACK_CELL_ROWS }],
    };
  },
  removeCell: (template, cellId) => ({
    ...template,
    cells: template.cells.filter((cell) => cell.id !== cellId),
  }),
  applyChange: (template, placements) => ({
    ...template,
    cells: template.cells.map((cell) => ({ ...cell, ...placements[cell.id] })),
  }),
  validate: (template) => {
    const { cols } = gridstackSettings(template);
    return template.cells.flatMap((cell, index) =>
      cell.x + cell.w > cols
        ? [`cells[${index}] (#${cell.id}) exceeds the grid: x ${cell.x} + w ${cell.w} > ${cols} columns`]
        : [],
    );
  },
  renderer: GridstackView,
});
