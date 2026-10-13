/** @wirework/engine — the framework-free widget engine (README.md). Building blocks stay module-internal; tests import them from their modules. */
export { createRegistry } from "./registry";
export type { WidgetRegistry } from "./registry";
export { createContracts } from "./contracts";
export type { ContractRegistry } from "./contracts";
export { createActions } from "./actions";
export type { ActionRegistry } from "./actions";
export { createLayoutEngines, resolveTemplate } from "./layout-engines";
export type { LayoutEngineRegistry, TemplateResolution } from "./layout-engines";
export { layoutEngineProblems } from "./layout-engine-checks";
export { resolvePage } from "./resolve";
export type { CellProblem, ResolvedCell, ResolvedCellOk, ResolvedPage, ResolveInput } from "./resolve";
export { validateViewModels } from "./validate";
export { createEmitter } from "./emitter";
export { readableStore } from "./readable";
export { bindCellReactions, bindReactions } from "./reactions";
export { emitPageLoad } from "./page-events";
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
