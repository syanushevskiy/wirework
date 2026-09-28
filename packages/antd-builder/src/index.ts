/**
 * @wirework/antd-builder — the widget builder as Ant Design components.
 *
 * The UI half of @wirework/builder: a palette of live widget previews, the
 * shared form (input ports, settings, one reaction per event with the
 * chosen action's parameters), and the drawer that edits a placed widget.
 * Render-only throughout — every piece of state and every derived value
 * comes from the headless package's hooks (doc/guidelines.md).
 *
 * A host that has its own design system uses @wirework/builder directly and
 * writes these five components itself; this package is then the reference
 * implementation of what they must do.
 *
 * Import `@wirework/antd-builder/styles.css` once, after antd's reset and
 * @wirework/react's styles.
 *
 * The `data-testid`s these components expose are part of the contract — a
 * suite automating the builder drives them. The per-field ids are built by
 * the helpers exported from `widget-form.tsx`; the fixed ids (the palette,
 * the buttons, the editor) are literals in their components. Renaming any
 * of them is a breaking change for every suite that drives this builder.
 */
export { WidgetBuilder } from "./widget-builder";
export type { WidgetBuilderProps } from "./widget-builder";

export { WidgetPalette } from "./widget-palette";
export type { WidgetPaletteProps } from "./widget-palette";

export { WidgetForm, paramFieldId, portFieldId, reactionFieldId, settingFieldId } from "./widget-form";
export type { WidgetFormProps } from "./widget-form";

export { WidgetEditor } from "./widget-editor";
export type { WidgetEditorProps } from "./widget-editor";

export { PathCombobox } from "./path-combobox";
export type { PathComboboxProps } from "./path-combobox";
