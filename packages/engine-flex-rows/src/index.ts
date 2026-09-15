/**
 * @wirework/engine-flex-rows — the flex-rows layout engine plugin.
 * Register it with the host's layout-engine registry; page templates use
 * `engine: "flex-rows"`. Import "./styles.css" once in the host.
 */
export { flexRowsEngine } from "./engine";
export { widthStyle } from "./width";
export * from "./schema";
