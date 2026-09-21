/**
 * @wirework/engine — framework-agnostic widget engine: widget registry,
 * layout-engine registry, page resolution, boot validation, per-cell event
 * emitters and the reaction interpreter. Knows nothing about React (or any
 * UI framework) and nothing about any layout engine's template shape —
 * rendering lives in adapters such as @wirework/react, layouts in engine
 * plugins such as @wirework/engine-react-grid-layout. Data access goes
 * exclusively through the Store contract a host injects; events travel on
 * the EventBus a host injects.
 *
 * This is the PUBLIC surface: what hosts, adapters and plugins use. The
 * engine's own building blocks (cell pipeline, template checks, path
 * tooling) stay module-internal; its tests import them from their modules.
 */
export { RegistrationError } from "./named-registry";
export type { NamedRegistry } from "./named-registry";
export { createRegistry } from "./registry";
export type { WidgetRegistry, WidgetRegistryOptions } from "./registry";
export { createContracts } from "./contracts";
export type { ContractRegistry } from "./contracts";
export { createActions } from "./actions";
export type { ActionRegistry } from "./actions";
export { createLayoutEngines, resolveTemplate } from "./layout-engines";
export type { LayoutEngineRegistry, TemplateResolution } from "./layout-engines";
export { layoutEngineProblems } from "./layout-engine-checks";
export { resolvePage } from "./resolve";
export type {
  CellProblem,
  FallbackNote,
  ResolvedCell,
  ResolvedCellOk,
  ResolvedCellProblem,
  ResolvedPage,
  ResolvedPagePlan,
  ResolvedPageProblem,
  ResolveInput,
} from "./resolve";
export { validateViewModels } from "./validate";
export type { ProblemSeverity, ValidateInput, ValidationProblem, ValidationReport } from "./validate";
export { createEmitter, WidgetEventError } from "./emitter";
export { readableStore } from "./readable";
export { bindCellReactions, bindReactions } from "./reactions";
export type { ReactionTarget } from "./reactions";
export { checkPageReactions, emitPageLoad } from "./page-events";
export type { PageReactions } from "./page-events";
export { boundPaths, compatibleStorePaths, suggestedInputPaths } from "./paths";
export { errorText, issuesText, problemText } from "./messages";
export {
  pageTemplates,
  removeUserCell,
  updatePageTemplate,
  updateUserCellSettings,
  updateUserPageTemplate,
  updateWidgetTemplate,
} from "./trees";
