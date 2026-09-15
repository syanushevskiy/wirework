/**
 * @wirework/engine-react-grid-layout — the react-grid-layout engine plugin.
 * Register it with the host's layout-engine registry; page templates use
 * `engine: "react-grid-layout"`. Import "./styles.css" once in the host.
 */
export { reactGridLayoutEngine } from "./engine";
export * from "./schema";
