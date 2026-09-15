/**
 * ALL widget-builder logic lives here (guidelines: render-only components):
 * a widget-type selection on top of the shared widget form. "Add" hands the
 * collected bindings and settings to the host, which writes them into the
 * view models (doc/widget-io-design.md, doc/widget-events-design.md).
 */
import { useCallback, useMemo, useState } from "react";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, WidgetRegistry } from "@wirework/engine";
import { useWidgetForm, type WidgetSettings } from "./use-widget-form";

export function useWidgetBuilder(
  registry: WidgetRegistry,
  store: Store,
  actions: ActionRegistry,
  onAdd: (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => void,
) {
  const [widgetType, setWidgetType] = useState<string>("");
  /** Registered widgets with their descriptions, for the dropdown. */
  const widgetTypes = useMemo(
    () => registry.types().map((type) => ({ type, description: registry.get(type)?.description })),
    [registry],
  );
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

  return { widgetTypes, widgetType, selectWidget, form, canAdd: form.valid, add };
}
