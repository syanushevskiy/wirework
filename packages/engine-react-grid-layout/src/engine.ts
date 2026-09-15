/**
 * The react-grid-layout engine plugin: template shape + every layout
 * operation the core delegates. Change payload = placements by cell id.
 */
import type { CellBase } from "@wirework/schema";
import { defineLayoutEngine } from "@wirework/react";
import { GridLayoutView } from "./GridLayoutView";
import {
  DEFAULT_GRID_CELL_HEIGHT,
  gridPageSchema,
  gridSettings,
  type GridPage,
  type GridPlacements,
} from "./schema";

export const reactGridLayoutEngine = defineLayoutEngine<GridPage, GridPlacements>({
  name: "react-grid-layout",
  template: gridPageSchema,
  empty: () => ({ engine: "react-grid-layout", cells: [] }),
  cells: (template) => template.cells,
  /** Full-width band below every existing cell. */
  appendCell: (template, cell: CellBase) => {
    const { cols } = gridSettings(template);
    const y = template.cells.reduce((bottom, c) => Math.max(bottom, c.y + c.h), 0);
    return {
      ...template,
      cells: [...template.cells, { ...cell, x: 0, y, w: cols, h: DEFAULT_GRID_CELL_HEIGHT }],
    };
  },
  removeCell: (template, cellId) => ({
    ...template,
    cells: template.cells.filter((cell) => cell.id !== cellId),
  }),
  /** Cells the editor did not report keep theirs; unknown ids are ignored. */
  applyChange: (template, placements) => ({
    ...template,
    cells: template.cells.map((cell) => ({ ...cell, ...placements[cell.id] })),
  }),
  /** A cell must fit inside the column count — the renderer would clamp it silently. */
  validate: (template) => {
    const { cols } = gridSettings(template);
    return template.cells.flatMap((cell, index) =>
      cell.x + cell.w > cols
        ? [`cells[${index}] (#${cell.id}) exceeds the grid: x ${cell.x} + w ${cell.w} > ${cols} columns`]
        : [],
    );
  },
  renderer: GridLayoutView,
});
