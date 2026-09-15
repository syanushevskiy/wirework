/**
 * @wirework/engine-gridstack — the gridstack layout engine plugin (the
 * third engine: proof that engines plug in without core changes).
 * Register it with the host's layout-engine registry; page templates use
 * `engine: "gridstack"`. Import "./styles.css" once in the host.
 */
export { gridstackEngine } from "./engine";
export * from "./schema";
