/**
 * @wirework/engine-css-grid — the css-grid layout engine plugin: a page as
 * a CSS grid of slots, `areas` CSS's own template areas whose tokens are
 * the cells' ids, drawn by drag and drop or filled from a typed form
 * (doc/css-grid-design.md). Register it with the host's layout-engine
 * registry; page templates use `engine: "css-grid"`. Import "./styles.css"
 * once in the host.
 */
export { cssGridEngine } from "./engine";
export { appendCssGridCell, applyCssGridChange, cssGridProblems, emptyCssGrid, removeCssGridCell } from "./operations";
export {
  areasOf,
  columnCount,
  grownTo,
  isDrawable,
  isRectangle,
  isTrackSize,
  pictureProblems,
  placed,
  spanOf,
  spanText,
  tokensOf,
  trackParts,
  withSlot,
  withoutColumn,
  withoutRow,
} from "./areas";
export * from "./schema";
