/**
 * @wirework/builder — the widget BUILDER, without a user interface.
 *
 * Everything a person needs to assemble a page out of registered widgets —
 * choosing one, wiring its input ports and its events, editing a placed
 * one, and the edit session that holds it all until Save — as hooks a host
 * renders however it likes. The antd implementation is
 * @wirework/antd-builder; this package knows no UI library.
 *
 * What a host brings: the registries (widgets, contracts, actions, layout
 * engines), the store the page lives in, the page's name, what it calls the
 * things a builder creates (`BuilderNaming`, with defaults), whether THIS
 * user may change pages (`canEdit` — required, never assumed), and where
 * saved pages GO (`SaveTrees` — required, never defaulted). Nothing here
 * reaches for a router, a concrete widget or a fixture, and no user-facing
 * text lives here: a lock is reported as a fact, and the host says it in
 * its own words.
 *
 * Every write goes through ONE path (`useCommit` / `commitTrees`): the
 * store first, then the host's `save` with what the store now holds. That
 * is the place an audit trail or a conflict check belongs; the permission
 * is checked by every hook that can write, before it gets there.
 *
 * Contract proof: depends on @wirework/schema, @wirework/engine and the
 * @wirework/react adapter only, with react as a peer.
 */
export type { AddLock, EditLock, EngineLock, OverlayLock, ViewProblem, ViewsLock } from "./locks";

export { commitTrees, useCommit } from "./use-commit";
export type { Commit, CommitInput, EditableTrees, SaveError, SaveTrees, TreesChange } from "./use-commit";

export { DEFAULT_BUILDER_NAMING, builderPage, modelNamespaceOf, numberedIds, useBuilder } from "./use-builder";
export type { BuilderInput, BuilderNaming, PlacedWidget } from "./use-builder";

export {
  USER_PAGE_TEMPLATE,
  changeLayoutOp,
  overlayTargetOf,
  plannedInput,
  removeCellOp,
  roleOf,
  saveWidgetOp,
  setCellViewOp,
  wrapCellOp,
  resetLayoutOp,
  holdsOwnLayout,
} from "./page-edits";
export type { EditContext, EditLocation, EditTarget, Op, OverlayTarget } from "./page-edits";
export { usePageEditing } from "./use-page-editing";
export type { PageEditingInput, SaveOutcome, TemplateChoice } from "./use-page-editing";

export { useLayoutNavigation } from "./use-layout-navigation";
export type { LayoutNavigation, LayoutNavigationInput } from "./use-layout-navigation";
export { roleNameProblem, usePageToolbar } from "./use-page-toolbar";
export type { LayoutCrumb, PageToolbarInput, PageToolbarState } from "./use-page-toolbar";

export {
  PAGE_VIEW_FILE_KIND,
  PAGE_VIEW_FILE_VERSION,
  exportPageView,
  freeTemplateName,
  pageViewFile,
  pageViews,
  parsePageViewFile,
  templateNameProblem,
} from "./page-views";
export type { PageViewChoice, PageViewFile, PageViewKind, ViewFileDoor } from "./page-views";
export { usePageViews } from "./use-page-views";
export type { PageViewPanel, PageViewPanelKind, PageViewsInput, PageViewsState } from "./use-page-views";

export { downloadTextFile, usePageExport } from "./use-page-export";
export type { PageExportInput, PageExportPanel, PageExportState } from "./use-page-export";

export { useWidgetForm } from "./use-widget-form";
export type { WidgetFormInput, WidgetFormState } from "./use-widget-form";
export { EMPTY_FORM, templateOf, valuesFromViewModel } from "./form-drafts";
export type {
  Choice,
  EventField,
  ItemDraft,
  ItemField,
  ParamDraft,
  PortField,
  ReactionDraft,
  ReactionField,
  ReactionKind,
  SettingDraft,
  WidgetFormValues,
  WidgetSettings,
  WriteBack,
} from "./form-drafts";
export { CONSTRUCTOR, editTree, literalOf, predicateChoices, whenOfConditions } from "./form-when";
export type {
  ConditionDraft,
  ConditionField,
  GroupDraft,
  GroupField,
  LeafField,
  NodeDraft,
  TestDraft,
  TestFacts,
  TreeEdit,
} from "./form-when";

export { useWidgetBuilder } from "./use-widget-builder";
export type { WidgetBuilderInput, WidgetGroup } from "./use-widget-builder";

export { usePalettePress, useWidgetSearch } from "./use-widget-palette";
export type { PaletteItem, WidgetSearch } from "./use-widget-palette";

export { useWidgetEditor } from "./use-widget-editor";
export type { EditableCell, WidgetEditorInput } from "./use-widget-editor";

export { usePathCombobox } from "./use-path-combobox";
export type { PathComboboxInput } from "./use-path-combobox";
