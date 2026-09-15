/**
 * ALL widget-editor logic lives here (guidelines: render-only components):
 * the shared widget form, prefilled from the cell's RESOLVED view model.
 * Mount it with `key={cell.key}` so a different cell starts a fresh form.
 */
import { useCallback, useMemo } from "react";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, ResolvedCell } from "@wirework/engine";
import { useWidgetForm, valuesFromViewModel, type WidgetSettings } from "./use-widget-form";

export type EditableCell = ResolvedCell & { definition: NonNullable<ResolvedCell["definition"]> };

export function useWidgetEditor(
  cell: EditableCell,
  store: Store,
  actions: ActionRegistry,
  onSave: (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => void,
) {
  const initial = useMemo(() => valuesFromViewModel(cell.definition, cell.viewModel), [cell]);
  const form = useWidgetForm(cell.definition, store, actions, initial);

  const save = useCallback(() => {
    const { bindings, settings } = form.collect();
    onSave(cell, bindings, settings);
  }, [cell, form.collect, onSave]);

  return { form, canSave: form.valid, save };
}
