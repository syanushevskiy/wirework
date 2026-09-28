/**
 * The gridstack engine plugin: the shared column grid's template and
 * operations (@wirework/engine-grid) under this engine's name, drawn by
 * gridstack. Written against the plugin contract with NO change to schema,
 * engine core or adapter.
 */
import { gridOperations, gridPlacementsSchema, type GridPlacements } from "@wirework/engine-grid";
import { defineLayoutEngine } from "@wirework/react";
import { GridstackView } from "./GridstackView";
import { gridstackPageSchema, type GridstackPage } from "./schema";

const grid = gridOperations<GridstackPage>({ empty: () => ({ engine: "gridstack", cells: [] }) });

export const gridstackEngine = defineLayoutEngine<GridstackPage, GridPlacements>({
  name: "gridstack",
  template: gridstackPageSchema,
  change: gridPlacementsSchema,
  ...grid,
  renderer: GridstackView,
});
