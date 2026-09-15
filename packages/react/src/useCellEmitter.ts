/**
 * Memoizes the engine's per-cell emitter for one rendered widget cell, so
 * `emit` is referentially stable across renders (widget hooks may list it
 * as a dependency). Primitive deps only — no object identity churn.
 */
import { useMemo } from "react";
import type { AnyWidgetDefinition, Emit, EventBus, WidgetEvents } from "@wirework/schema";
import { createEmitter } from "@wirework/engine";

export function useCellEmitter(
  bus: EventBus,
  definition: AnyWidgetDefinition,
  page: string,
  cell: string,
): Emit<WidgetEvents> {
  return useMemo(
    () => createEmitter(bus, definition, { page, cell }),
    [bus, definition, page, cell],
  );
}
