/**
 * ALL widget-builder logic lives here (guidelines: render-only components):
 * a widget-type selection on top of the shared widget form. "Add" hands the
 * collected bindings and settings to the host, which writes them into the
 * view models (doc/widget-io-design.md, doc/widget-events-design.md).
 */
import { useCallback, useMemo, useState } from "react";
import type { AnyWidgetDefinition, Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, ContractRegistry, WidgetRegistry } from "@wirework/engine";
import { useWidgetForm, type WidgetSettings } from "./use-widget-form";

export interface WidgetGroup {
  /** Contract kind, or "other" for widgets implementing none. */
  kind: string;
  label: string;
  widgets: { type: string; description?: string; definition: AnyWidgetDefinition }[];
}

export function useWidgetBuilder(
  registry: WidgetRegistry,
  contracts: ContractRegistry,
  store: Store,
  actions: ActionRegistry,
  onAdd: (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => void,
) {
  const [widgetType, setWidgetType] = useState<string>("");
  /** Registered widgets grouped by the contract kind they implement. */
  const widgetGroups = useMemo<WidgetGroup[]>(() => {
    const byKind = new Map<string, WidgetGroup["widgets"]>();
    for (const type of registry.keys()) {
      const definition = registry.get(type);
      if (!definition) continue;
      const kind = definition.kind ?? "other";
      byKind.set(kind, [...(byKind.get(kind) ?? []), { type, description: definition.description, definition }]);
    }
    // Contract kinds first (registration order); widgets of no contract last.
    const entries = [...byKind.entries()].sort(([a], [b]) => Number(a === "other") - Number(b === "other"));
    return entries.map(([kind, widgets]) => ({
      kind,
      label: kind === "other" ? "other widgets" : `${kind} — ${contracts.get(kind)?.description ?? "app-defined contract"}`,
      widgets,
    }));
  }, [registry, contracts]);
  const definition = widgetType ? registry.get(widgetType) : undefined;
  const form = useWidgetForm(definition, store, actions);

  const selectWidget = useCallback(
    (type: string) => {
      setWidgetType(type);
      form.reset();
    },
    [form.reset],
  );

  const add = useCallback(() => {
    if (!definition) return;
    const { bindings, settings } = form.collect();
    onAdd(definition.type, bindings, settings);
    setWidgetType("");
    form.reset();
  }, [definition, form.collect, form.reset, onAdd]);

  return { widgetGroups, widgetType, selectWidget, form, canAdd: form.valid, add };
}
