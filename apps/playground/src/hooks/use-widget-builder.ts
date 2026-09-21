/**
 * ALL widget-builder logic lives here (guidelines: render-only components):
 * a widget-type selection on top of the shared widget form. "Add" hands the
 * collected bindings and settings to the host, which writes them into the
 * view models (doc/widget-io-design.md, doc/widget-events-design.md).
 */
import { useCallback, useMemo, useState } from "react";
import type { AnyWidgetDefinition, Store, WidgetBindings } from "@wirework/schema";
import {
  boundPaths,
  suggestedInputPaths,
  type ActionRegistry,
  type ContractRegistry,
  type WidgetRegistry,
} from "@wirework/engine";
import { useWidgetForm, type WidgetSettings } from "./use-widget-form";
import { useWidgetSearch } from "./use-widget-palette";

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
  /** The page widgets are added to: the first segment of every generated path. */
  page: string,
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
  /** The palette's search and "Show widgets" state lives HERE: adding a widget starts it over. */
  const search = useWidgetSearch(widgetGroups);

  /**
   * Choosing a widget fills its input ports with GENERATED paths —
   * `<page>.<widget name>.<port>`, numbered from the second instance on
   * (`builder.refresher.schedule`, then `builder.refresher2.schedule`) —
   * so nobody types the same structure again and again. They are defaults:
   * the user changes any of them, e.g. to read existing data. What is taken
   * is read from the view models at this moment, so a removed widget frees
   * its name.
   */
  const selectWidget = useCallback(
    (type: string) => {
      setWidgetType(type);
      search.picked();
      const chosen = registry.get(type);
      form.reset(
        chosen ? suggestedInputPaths(page, chosen, boundPaths(store.get<{ widgets?: unknown }>("viewModels"))) : {},
      );
    },
    [form.reset, search.picked, registry, store, page],
  );

  /** After an add everything starts over: no widget chosen, an empty form, an EMPTY search, the list closed. */
  const add = useCallback(() => {
    if (!definition) return;
    const { bindings, settings } = form.collect();
    onAdd(definition.type, bindings, settings);
    setWidgetType("");
    form.reset();
    search.clear();
  }, [definition, form.collect, form.reset, search.clear, onAdd]);

  return { widgetGroups, widgetType, selectWidget, form, search, canAdd: form.valid, add };
}
