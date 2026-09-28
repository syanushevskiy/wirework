# @wirework/engine-grid

The column grid that `@wirework/engine-react-grid-layout` and
`@wirework/engine-gridstack` share: cells placed by x/y/w/h in column and
row units, a change reported as placements by cell id, and the pure
operations on such a template — everything but the library that draws it.
Peers: `@wirework/schema`, `zod`.

```ts
import { gridOperations, gridPlacementsSchema, type GridPlacements, type GridTemplate } from "@wirework/engine-grid";

interface MyGridPage extends GridTemplate {
  engine: "my-grid";
}
const grid = gridOperations<MyGridPage>({ empty: () => ({ engine: "my-grid", cells: [] }) });
export const myGridEngine = defineLayoutEngine<MyGridPage, GridPlacements>({
  name: "my-grid",
  template: myGridPageSchema, // z.object({ engine: z.literal("my-grid"), cols: …, cells: z.array(gridCellSchema) })
  change: gridPlacementsSchema,
  ...grid, // empty, cells, appendCell, removeCell, applyChange, validate
  renderer: MyGridView,
});
```

Exports: `gridPlacementSchema` / `GridPlacement`, `gridPlacementsSchema` /
`GridPlacements`, `gridCellSchema` / `GridCell`, `GridTemplate`, `gridCols`,
`gridOperations` (`GridOperationsOptions`), `DEFAULT_GRID_COLS`,
`DEFAULT_GRID_CELL_ROWS`. An appended cell is a full-width band below the
lowest one; `applyChange` moves the cells a change names and ignores
unknown ids; `validate` names a cell wider than the grid.
