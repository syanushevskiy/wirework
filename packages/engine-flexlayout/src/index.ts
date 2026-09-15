/**
 * @wirework/engine-flexlayout — the FlexLayout (docking tabs) engine plugin.
 * Register it with the host's layout-engine registry; page templates use
 * `engine: "flexlayout"`. Import "./styles.css" once in the host.
 */
export { flexLayoutEngine } from "./engine";
export * from "./schema";
export { addTab, emptyModel, reconcile, removeTab, tabIds } from "./tree";
