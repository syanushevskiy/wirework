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
export { commitTrees, useCommit } from "./use-commit";
export type { Commit, EditableTrees, SaveTrees, TreesChange } from "./use-commit";

export { DEFAULT_BUILDER_NAMING, builderPage, modelNamespaceOf, numberedIds, useBuilder } from "./use-builder";
export type { BuilderInput, BuilderNaming } from "./use-builder";

export { USER_PAGE_TEMPLATE, usePageEditing } from "./use-page-editing";
export type { EditTarget, PageEditingInput } from "./use-page-editing";

export { EMPTY_FORM, useWidgetForm, valuesFromViewModel } from "./use-widget-form";
export type {
  Choice,
  EventField,
  ParamDraft,
  PortField,
  ReactionDraft,
  ReactionKind,
  SettingDraft,
  WidgetFormState,
  WidgetFormValues,
  WidgetSettings,
} from "./use-widget-form";

export { useWidgetBuilder } from "./use-widget-builder";
export type { WidgetGroup } from "./use-widget-builder";

export { usePalettePress, useWidgetSearch } from "./use-widget-palette";
export type { PaletteItem, WidgetSearch } from "./use-widget-palette";

export { useWidgetEditor } from "./use-widget-editor";
export type { EditableCell } from "./use-widget-editor";

export { usePathCombobox } from "./use-path-combobox";
