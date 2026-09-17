/**
 * @wirework/engine — framework-agnostic widget engine: widget registry,
 * layout-engine registry, page resolution, boot validation, per-cell event
 * emitters and the reaction interpreter. Knows nothing about React (or any
 * UI framework) and nothing about any layout engine's template shape —
 * rendering lives in adapters such as @wirework/react, layouts in engine
 * plugins such as @wirework/engine-react-grid-layout. Data access goes
 * exclusively through the Store contract a host injects; events travel on
 * the EventBus a host injects.
 */
export { createRegistry, WidgetRegistrationError } from "./registry";
export type { WidgetRegistry, WidgetRegistryOptions } from "./registry";
export {
  createLayoutEngines,
  LayoutEngineRegistrationError,
  resolveTemplate,
} from "./layout-engines";
export type { LayoutEngineRegistry, TemplateResolution } from "./layout-engines";
export { layoutEngineProblems } from "./layout-engine-checks";
export {
  checkOverlay,
  checkTemplate,
  contractProblems,
  engineCells,
  pickTemplate,
  resolveCell,
  resolvePage,
  usableOverlay,
} from "./resolve";
export { errorText, issuesText } from "./messages";
export { readableStore } from "./readable";
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
export type { ProblemSeverity, ValidationProblem, ValidationReport } from "./validate";
export { createNamedRegistry, RegistrationError } from "./named-registry";
export type { NamedRegistry, NamedRegistryOptions } from "./named-registry";
export { collectPaths, compatibleStorePaths, deepMerge, deletePath, getPath, setPath } from "./paths";
export { createEmitter, WidgetEventError } from "./emitter";
export { createActions, ActionRegistrationError } from "./actions";
export type { ActionRegistry } from "./actions";
export { createContracts, ContractRegistrationError } from "./contracts";
export type { ContractRegistry } from "./contracts";
export { bindCellReactions, bindReactions, reactionValue } from "./reactions";
export type { ReactionTarget } from "./reactions";
export {
  pageTemplates,
  removeUserCell,
  removeWidgetModel,
  updatePageTemplate,
  updateUserCellSettings,
  updateUserPageTemplate,
  updateWidgetTemplate,
} from "./trees";
