/**
 * The react-grid-layout engine plugin: the shared column grid's template
 * and operations (@wirework/engine-grid) under this engine's name, drawn by
 * react-grid-layout. Change payload = placements by cell id.
 */
import { gridOperations, gridPlacementsSchema, type GridPlacements } from "@wirework/engine-grid";
import { defineLayoutEngine } from "@wirework/react";
import { GridLayoutView } from "./GridLayoutView";
import { gridPageSchema, type GridPage } from "./schema";

const grid = gridOperations<GridPage>({ empty: () => ({ engine: "react-grid-layout", cells: [] }) });

export const reactGridLayoutEngine = defineLayoutEngine<GridPage, GridPlacements>({
  name: "react-grid-layout",
  template: gridPageSchema,
  change: gridPlacementsSchema,
  ...grid,
  renderer: GridLayoutView,
});
