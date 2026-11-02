/** @wirework/engine — the framework-free widget engine (README.md). Building blocks stay module-internal; tests import them from their modules. */
export { createRegistry } from "./registry";
export type { WidgetRegistry } from "./registry";
export { createContracts } from "./contracts";
export type { ContractRegistry } from "./contracts";
export { createActions } from "./actions";
export type { ActionRegistry } from "./actions";
export {
  STANDARD_PREDICATES,
  createPredicates,
  holds,
  literalText,
  parsedExpression,
  testText,
  whenPaths,
  whenProblems,
  whenText,
} from "./predicates";
export type { PredicateRegistry } from "./predicates";
export type { ConditionNode, ParsedExpression } from "./expressions";
export { createLayoutEngines, resolveTemplate } from "./layout-engines";
export type { LayoutEngineRegistry, TemplateResolution } from "./layout-engines";
export { layoutEngineProblems } from "./layout-engine-checks";
export { resolvePage } from "./resolve";
export type { CellProblem, ResolvedCell, ResolvedCellOk, ResolvedPage, ResolveInput } from "./resolve";
export { validateViewModels } from "./validate";
export { createEmitter } from "./emitter";
export { readableStore } from "./readable";
export { bindCellReactions, bindReactions, defaultReaction, sameReaction, withDefaultReactions } from "./reactions";
export { emitPageLoad } from "./page-events";
export { boundPaths, compatibleStorePaths, suggestedInputPaths } from "./paths";
export { errorText, issuesText, problemText } from "./messages";
export {
  pageTemplates,
  putPageTemplate,
  putUserPageTemplate,
  removeUserCell,
  removeUserPageTemplate,
  renameUserPageTemplate,
  selectUserPageView,
  updatePageTemplate,
  updateUserCellSettings,
  updateUserPageTemplate,
  updateWidgetTemplate,
} from "./trees";
