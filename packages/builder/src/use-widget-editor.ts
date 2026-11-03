/**
 * ALL widget-editor logic lives here (guidelines: render-only components):
 * the shared widget form, prefilled from the cell's RESOLVED view model.
 * Mount it with `key={cell.key}` so a different cell starts a fresh form.
 */
import { useCallback, useMemo } from "react";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, AppearanceRegistry, PredicateRegistry, ResolvedCell } from "@wirework/engine";
import { valuesFromViewModel, type WidgetSettings } from "./form-drafts";
import { useWidgetForm } from "./use-widget-form";

export type EditableCell = ResolvedCell & { definition: NonNullable<ResolvedCell["definition"]> };

export interface WidgetEditorInput {
  cell: EditableCell;
  store: Store;
  actions: ActionRegistry;
  /** The checks a condition may pick; the standard ones alone when absent. */
  predicates?: PredicateRegistry | undefined;
  /** The animations a conditional widget may pick; the standard ones alone when absent. */
  appearances?: AppearanceRegistry | undefined;
  onSave: (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => void;
}

export function useWidgetEditor({ cell, store, actions, predicates, appearances, onSave }: WidgetEditorInput) {
  const initial = useMemo(() => valuesFromViewModel(cell.definition, cell.viewModel, predicates), [cell, predicates]);
  const form = useWidgetForm({ definition: cell.definition, store, actions, predicates, appearances, initial });
  const { collect, valid } = form;

  const save = useCallback(() => {
    if (!valid) return;
    const { bindings, settings } = collect();
    onSave(cell, bindings, settings);
  }, [cell, valid, collect, onSave]);

  return { form, canSave: valid, save };
}
