/**
 * ALL WidgetPreview logic lives here (guidelines: render-only components):
 * an isolated sandbox per preview — its own seeded store, a dead-end bus,
 * a cell-scoped validating `emit`, the view model parsed by the widget.
 * No reactions are bound: a preview shows, it never acts.
 */
import { useMemo, useState } from "react";
import type { AnyWidgetDefinition, WidgetPreviewSpec } from "@wirework/schema";
import { createEmitter, errorText, readableStore } from "@wirework/engine";
import { createEventBus } from "@wirework/events";
import { createStore } from "@wirework/store";

export type PreviewParse = { viewModel: unknown; problem?: undefined } | { problem: string };

export function useWidgetPreview(definition: AnyWidgetDefinition, overrides?: WidgetPreviewSpec) {
  const seed = overrides?.seed ?? definition.preview?.seed ?? {};
  const template = overrides?.viewModel ?? definition.preview?.viewModel ?? {};
  // One sandbox per mounted preview; a changed seed re-mounts via `key`.
  const [{ store, bus }] = useState(() => ({ store: createStore(seed), bus: createEventBus() }));
  const templateKey = JSON.stringify(template);
  const parsed = useMemo<PreviewParse>(() => {
    try {
      return { viewModel: definition.viewModel.parse(JSON.parse(templateKey)) };
    } catch (error) {
      return { problem: errorText(error) };
    }
  }, [definition, templateKey]);
  const emit = useMemo(
    () => createEmitter(bus, definition, { page: "preview", cell: "preview" }),
    [bus, definition],
  );
  const readable = useMemo(() => readableStore(store), [store]);
  return { parsed, emit, readable };
}
