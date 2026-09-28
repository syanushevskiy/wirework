/**
 * ALL widget-editor logic lives here (guidelines: render-only components):
 * the shared widget form, prefilled from the cell's RESOLVED view model.
 * Mount it with `key={cell.key}` so a different cell starts a fresh form.
 */
import { useCallback, useMemo } from "react";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, ResolvedCell } from "@wirework/engine";
import { valuesFromViewModel, type WidgetSettings } from "./form-drafts";
import { useWidgetForm } from "./use-widget-form";

export type EditableCell = ResolvedCell & { definition: NonNullable<ResolvedCell["definition"]> };

export interface WidgetEditorInput {
  cell: EditableCell;
  store: Store;
  actions: ActionRegistry;
  onSave: (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => void;
}

export function useWidgetEditor({ cell, store, actions, onSave }: WidgetEditorInput) {
  const initial = useMemo(() => valuesFromViewModel(cell.definition, cell.viewModel), [cell]);
  const form = useWidgetForm({ definition: cell.definition, store, actions, initial });
  const { collect, valid } = form;

  const save = useCallback(() => {
    if (!valid) return;
    const { bindings, settings } = collect();
    onSave(cell, bindings, settings);
  }, [cell, valid, collect, onSave]);

  return { form, canSave: valid, save };
}
