/**
 * @wirework/engine-flex-rows — the flex-rows layout engine plugin: rows
 * of cells, each row a flexbox, laid out by Tailwind's layout class names
 * (doc/flex-rows-design.md). Register it with the host's layout-engine
 * registry; page templates use `engine: "flex-rows"`. Import
 * "./styles.css" once in the host.
 */
export { flexRowsEngine } from "./engine";
export { LAYOUT_CLASSES, LAYOUT_CLASS_NAMES, classTokens, layoutStyle, styleOf, unknownClasses } from "./classes";
export { applyFlexRowsChange, flexRowsProblems, moveTarget, removeFlexCell } from "./operations";
export * from "./schema";
