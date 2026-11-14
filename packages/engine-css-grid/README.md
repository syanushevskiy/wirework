# @wirework/engine-css-grid

A page as a CSS grid of SLOTS laid out by template areas
(doc/ADR/0013-css-grid.md). `areas` is CSS's own `grid-template-areas`, one
string per row, its tokens the ids of the page's cells and `.` for an empty
slot: the cell's id IS its area, there is no mapping. Peer: `react`. No
layout library: the browser lays the slots out, the engine only says which
cell takes which.

```ts
import { cssGridEngine } from "@wirework/engine-css-grid";
import "@wirework/engine-css-grid/styles.css";
layoutEngines.register(cssGridEngine); // page templates use engine: "css-grid"
```

A template is `{ engine: "css-grid", areas, columns?, rows?, gap?, cells }`:

```json
{
  "engine": "css-grid",
  "columns": ["1fr", "1fr", "12rem"],
  "areas": ["label-run-name label-run-name button-back", "status-run tag-run-reference label-run-message"],
  "cells": [{ "id": "label-run-name", "widget": "antd-label", "model": "widgets.run.name", "template": "default" }]
}
```

`columns` and `rows` are one track size each (`1fr`, `12rem`, `200px`,
`auto`, `min-content`, `minmax(8rem, 1fr)`); absent, every column is `1fr`
and every row `auto`. A cell named nowhere is auto-placed after the grid.

Operations: `appendCell` gives the cell a row of its own across every
column (two for a `"tall"` cell, a card); `removeCell` empties its slots
and drops rows left all empty. The change payload is `{ kind: "areas",
areas, columns?, rows? }` — the whole picture after a drop or a pick, with
the tracks when the grid grew or shrank — or `{ kind: "tracks", columns?,
rows?, gap? }`. `validate` names an area that is not a rectangle (the
browser drops the whole picture then, so the renderer leaves it unset and
the page auto-flows with the warning above it), a token that is no cell, a
cell with no slot, rows of unequal length, tracks that do not match the
grid and a size that is not CSS.

Edit mode: the grid grows a ghost per slot (`css-grid-ghost`, `data-row`,
`data-column`; the trailing `+` ones grow the picture when dropped on),
every item a handle bar to drag it by (`css-grid-handle`, its label
`css-grid-handle-label`; the chrome buttons in it keep their press) — onto
a free slot it goes there, onto another widget the two SWAP places — and
four edges and a corner to resize it by (`css-grid-resize`, `data-edge`
`n` / `e` / `s` / `w` / `se`): the cell takes the slots it is pulled over,
a neighbour with a rectangle left shrinks, and one left with no slot waits
in the TRAY under the grid (`css-grid-tray`, `data-count`, the warning
`css-grid-unassigned`) until it is dragged onto a slot; a drop on the tray
takes a cell off the grid. Nothing is refused, and the outcome shows
before the drop (`css-grid-drop`, `data-drop` on the widgets it touches).
Above the grid a TYPED form
(`css-grid-form`): a select per slot listing the page's cells
(`css-grid-slot`), `+ row` / `+ column` and a `−` per row and column
(disabled, with the reason, while a cell there has no other slot), and a
number-and-unit field per track (`css-grid-column`, `css-grid-row-size`,
`css-grid-gap`; `fr`, `px`, `rem`, `%`, or `auto`, `min-content`,
`max-content`). The pure picture functions (`tokensOf`, `spanOf`,
`isRectangle`, `placed`, `swapped`, `dropped`, `claimed`, `resizedSpan`,
`cleared`, `unplaced`, `withSlot`, `grownTo`, `withoutRow`,
`withoutColumn`, `pictureProblems`, `isTrackSize`) are exported for hosts
and tests.
